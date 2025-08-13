const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const membership_model = {

  async getMembershipInfo(req, res) {
    try {
      const { type } = req.body;
      const user_id = req.user.id;

      if (type === "plan") {
        const plansQuery = `
        SELECT 
          id, name, price, duration_days, offer_limit, visibility_days,
          has_free_listing_rplus, has_verified_badge, has_priority_support,
          has_exclusive_promo_access, has_unlimited_offers, is_auto_renewal
        FROM tbl_membership_plans 
        WHERE is_active = TRUE AND is_deleted = FALSE
        ORDER BY price ASC
      `;

        const { rows } = await pool.query(plansQuery);

        const plans = rows.map((plan) => ({
          ...plan,
          // features: {
          //   offers_per_year: plan.offer_limit || "Unlimited",
          //   offer_visibility_days: plan.visibility_days,
          //   free_listing_rplus: plan.has_free_listing_rplus,
          //   verified_badge: plan.has_verified_badge,
          //   priority_support: plan.has_priority_support,
          //   exclusive_promo_access: plan.has_exclusive_promo_access,
          //   unlimited_offers: plan.has_unlimited_offers,
          //   auto_renewal: plan.is_auto_renewal,
          // },
        }));

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, { plans });
      }

      if (type === "current") {

        const membershipQuery = `
        SELECT 
          um.id, um.start_date, um.end_date, um.offers_used,
          mp.id as plan_id, mp.name, mp.price, mp.offer_limit, mp.visibility_days,
          mp.has_free_listing_rplus, mp.has_verified_badge, mp.has_priority_support,
          mp.has_exclusive_promo_access, mp.has_unlimited_offers, mp.is_auto_renewal,
          mp.redeemption_limit,
          CASE 
            WHEN um.end_date > CURRENT_TIMESTAMP THEN TRUE 
            ELSE FALSE 
          END as is_active
        FROM tbl_user_memberships um
        JOIN tbl_membership_plans mp ON um.plan_id = mp.id
        WHERE um.user_id = $1 AND um.is_active = TRUE AND um.is_deleted = FALSE
        ORDER BY um.created_at DESC
        LIMIT 1
            `;

        const { rows } = await pool.query(membershipQuery, [user_id]);

        if (rows.length === 0) {
          // Fallback to default Bronze plan
          const defaultPlanResult = await pool.query(
            "SELECT * FROM tbl_membership_plans WHERE name = $1 AND is_active = TRUE",
            ["Bronze"]
          );

          const defaultPlan = defaultPlanResult.rows[0];
          
          return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, {
            membership: {
              ...defaultPlan,
              is_active: true,
              offers_used: 0,
              remaining_offers: defaultPlan.offer_limit || "Unlimited",
              remaining_redeemption: defaultPlan.redeemption_limit || "Unlimited",
              days_remaining: defaultPlan.duration_days || 0,
              start_date: null,
              end_date: null,
            },
          });
        }

        const membership = rows[0];

        // Calculate redeemption_used for the current user
        const redeemptionUsedQuery = `
          SELECT COUNT(*) AS redeemption_used
          FROM tbl_redemptions
          WHERE user_id = $1 AND is_active = TRUE AND is_deleted = FALSE
        `;
        const redeemptionUsedResult = await pool.query(redeemptionUsedQuery, [user_id]);
        const redeemption_used = parseInt(redeemptionUsedResult.rows[0].redeemption_used);

        const remaining_redeemption = membership.redeemption_limit
          ? Math.max(0, membership.redeemption_limit - (redeemption_used || 0))
          : "Unlimited";

        const remaining_offers = membership.offer_limit
          ? Math.max(0, membership.offer_limit - membership.offers_used)
          : "Unlimited";

        const days_remaining = membership.is_active
          ? Math.ceil((new Date(membership.end_date) - new Date()) / (1000 * 60 * 60 * 24))
          : 0;

        const response = {
          ...membership,
          remaining_offers,
          remaining_redeemption,
          days_remaining,
        };

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, { membership: response });
      }

      // Invalid type handling
      return sendResponse(req, res, 400, responseCode.BAD_REQUEST, { keyword: "invalid_type" }, "Invalid type provided. Expected 'plans' or 'current'.");
    } catch (err) {
      console.error("Get Membership Info Error:", err);
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message);
    }
  },

  async purchaseMembership(req, res) {
    try {
      const user_id = req.user.id;
      const { plan_id, payment_method, transaction_id } = req.body;

      if (!plan_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {});
      }

      // Get plan details
      const planQuery = `
      SELECT * FROM tbl_membership_plans 
      WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE
    `;
      const planResult = await pool.query(planQuery, [plan_id]);

      if (planResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "plan_not_found" }, {});
      }

      const plan = planResult.rows[0];

      // For free plan, payment_method and transaction_id are not required
      if (plan.price > 0 && (!payment_method || !transaction_id)) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_payment_info" }, {});
      }

      const activeMembershipQuery = `
      SELECT id FROM tbl_user_memberships 
      WHERE user_id = $1 AND is_active = TRUE AND end_date > CURRENT_TIMESTAMP
    `;
      const activeMembership = await pool.query(activeMembershipQuery, [user_id]);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        let payment_id = null;

        // Only insert payment if price > 0
        if (plan.price > 0) {
          const paymentQuery = `
          INSERT INTO tbl_payments 
          (user_id, amount, currency, payment_method, transaction_id, description, payment_type, status)
          VALUES ($1, $2, 'USD', $3, $4, $5, 'membership', 'completed')
          RETURNING id
        `;

          const paymentResult = await client.query(paymentQuery, [
            user_id,
            plan.price,
            payment_method,
            transaction_id,
            `${plan.name} Membership Purchase`,
          ]);

          payment_id = paymentResult.rows[0].id;
        }

        // Deactivate existing membership
        if (activeMembership.rows.length > 0) {
          await client.query(
            "UPDATE tbl_user_memberships SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE",
            [user_id]
          );
        }

        // Create new membership
        const start_date = new Date();
        const end_date = new Date();
        end_date.setDate(start_date.getDate() + plan.duration_days);

        const membershipQuery = `
        INSERT INTO tbl_user_memberships 
        (user_id, plan_id, payment_id, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

        const membershipResult = await client.query(membershipQuery, [
          user_id,
          plan_id,
          payment_id,
          start_date,
          end_date,
        ]);

        await client.query("COMMIT");
        let stepResult;
        console.log("step:", req.user.step, "id:", req.user.id);
        // If user step is 2, update to step 3 after membership purchase
        if (req.user.step == 2) {
          console.log("User step is 2, updating to step 3 after membership purchase");
          // Update user step to 3 after successful membership purchase
          stepResult = await pool.query("UPDATE tbl_users SET step = 3 WHERE id = $1 RETURNING step", [user_id]);
        }

        return sendResponse(
          req,
          res,
          200,
          responseCode.SUCCESS,
          { keyword: "membership_purchased" },
          {
            membership_id: membershipResult.rows[0].id,
            payment_id,
            step: req.user.step == 2 ? stepResult.rows[0].step : null,
            plan_name: plan.name,
            start_date,
            end_date,
          }
        );
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("Purchase Membership Error:", err);
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message);
    }
  },


  async getMembershipHistory(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 10 } = req.body

      const offset = (page - 1) * limit

      const historyQuery = `
                SELECT 
                    um.id, um.start_date, um.end_date, um.offers_used, um.created_at,
                    mp.name, mp.price, mp.offer_limit,
                    p.amount, p.payment_method, p.transaction_id, p.status as payment_status,
                    CASE 
                        WHEN um.end_date > CURRENT_TIMESTAMP THEN 'Active'
                        ELSE 'Expired'
                    END as status
                FROM tbl_user_memberships um
                JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                LEFT JOIN tbl_payments p ON um.payment_id = p.id
                WHERE um.user_id = $1 AND um.is_deleted = FALSE
                ORDER BY um.created_at DESC
                LIMIT $2 OFFSET $3
            `

      // const countQuery = `
      //           SELECT COUNT(*) as total FROM tbl_user_memberships um
      //           WHERE um.user_id = $1 AND um.is_deleted = FALSE
      //       `

      const [historyResult, countResult] = await Promise.all([
        pool.query(historyQuery, [user_id, limit, offset]),
        // pool.query(countQuery, [user_id]),
      ])

      const history = historyResult.rows
      // const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          history,
          // pagination: {
          //   current_page: page,
          //   total_pages: Math.ceil(total / limit),
          //   total_records: total,
          //   has_next: page < Math.ceil(total / limit),
          //   has_prev: page > 1,
          // },
        },
      )
    } catch (err) {
      console.error("Get Membership History Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = membership_model
