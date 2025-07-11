const pool = require("../../../../config/database")
const common = require("../../../../utilities/common")
const responseCode = require("../../../../utilities/response_code")
const response_message = require("../../../../language/en")

class admin_model {

  createSubscriptionBox(req, res) {
    const { name, description, category_id } = req.body

    const boxData = {
      name,
      description,
      category_id,
      is_active: 1,
      is_deleted: 0,
    }

    pool.query("insert into tbl_subscription_boxes set ?", boxData, (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      const box_id = result.insertId

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.subscription_box_created_successfully,
        data: { box_id, ...boxData },
      })
    })
  }

  updateSubscriptionBox(req, res) {
    const { box_id, name, description, category_id, is_active } = req.body

    const updateData = {}

    if (name) updateData.name = name
    if (description) updateData.description = description
    if (category_id) updateData.category_id = category_id
    if (is_active !== undefined) updateData.is_active = is_active

    pool.query("update tbl_subscription_boxes set ? where id = ?", [updateData, box_id], (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      if (result.affectedRows === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.subscription_box_not_found,
          data: null,
        })
      }

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.subscription_box_updated_successfully,
        data: { box_id, ...updateData },
      })
    })
  }

  deleteSubscriptionBox(req, res) {
    const { box_id } = req.body

    pool.query("update tbl_subscription_boxes set is_deleted = 1 where id = ?", [box_id], (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      if (result.affectedRows === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.subscription_box_not_found,
          data: null,
        })
      }

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.subscription_box_deleted_successfully || "Subscription box deleted successfully",
        data: { box_id },
      })
    })
  }

  createSubscriptionPlan(req, res) {
    const { box_id, name, months, price } = req.body

    pool.query("select * from tbl_subscription_boxes where id = ? and is_deleted = 0", [box_id], (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      if (result.length === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.subscription_box_not_found,
          data: null,
        })
      }

      const planData = {
        box_id,
        name,
        months: months || (name === "monthly" ? 1 : 3),
        price,
        is_active: 1,
        is_deleted: 0,
      }

      pool.query("insert into tbl_subscription_plans set ?", planData, (err, planResult) => {
        if (err) {
          console.error("Database Query Error:", err)
          return common.response(res, {
            code: responseCode.OPERATION_FAILED,
            message: response_message.unsuccess,
            data: err.sqlMessage,
          })
        }

        const plan_id = planResult.insertId

        return common.response(res, {
          code: responseCode.SUCCESS,
          message: response_message.subscription_plan_created_successfully,
          data: { plan_id, ...planData },
        })
      })
    })
  }

  updateSubscriptionPlan(req, res) {
    const { plan_id, name, months, price, is_active } = req.body

    const updateData = {}

    if (name) updateData.name = name
    if (months) updateData.months = months
    if (price) updateData.price = price
    if (is_active !== undefined) updateData.is_active = is_active

    pool.query("update tbl_subscription_plans set ? where id = ?", [updateData, plan_id], (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      if (result.affectedRows === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.subscription_plan_not_found,
          data: null,
        })
      }

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.subscription_plan_updated_successfully,
        data: { plan_id, ...updateData },
      })
    })
  }

  deleteSubscriptionPlan(req, res) {
    const { plan_id } = req.body

    pool.query("update tbl_subscription_plans set is_deleted = 1 where id = ?", [plan_id], (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      if (result.affectedRows === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.subscription_plan_not_found,
          data: null,
        })
      }

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.subscription_plan_deleted_successfully,
        data: { plan_id },
      })
    })
  }

  getProductsByPlan(req, res) {
    const plan_id = req.body.plan_id
    console.log("plan_id", plan_id)
    if (!plan_id) {
      return common.response(res, {
        code: responseCode.OPERATION_FAILED,
        message: "plan_id is required",
        data: null,
      })
    }

    pool.query(
      "SELECT * FROM tbl_product WHERE plan_id = ? AND is_deleted = 0",
      [plan_id],
      (error, products) => {
        if (error) {
          console.error("Database Query Error:", error)
          return common.response(res, {
            code: responseCode.OPERATION_FAILED,
            message: response_message.unsuccess,
            data: error.sqlMessage,
          })
        }

        return common.response(res, {
          code: responseCode.SUCCESS,
          message: response_message.success,
          data: products,
        })
      }
    )
  }

  // Add product to plan
  addProductToPlan(req, res) {
    const { plan_id, type, name, description, image } = req.body

    // Check if plan exists
    pool.query("SELECT * FROM tbl_subscription_plans WHERE id = ? AND is_deleted = 0", [plan_id], (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      if (result.length === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.subscription_plan_not_found,
          data: null,
        })
      }

      const productData = {
        plan_id,
        type,
        name,
        description,
        image,
        is_active: 1,
        is_deleted: 0,
      }

      pool.query("INSERT INTO tbl_product SET ?", productData, (err, productResult) => {
        if (err) {
          console.error("Database Query Error:", err)
          return common.response(res, {
            code: responseCode.OPERATION_FAILED,
            message: response_message.unsuccess,
            data: err.sqlMessage,
          })
        }

        const product_id = productResult.insertId

        return common.response(res, {
          code: responseCode.SUCCESS,
          message: response_message.product_added_successfully,
          data: { product_id, ...productData },
        })
      })
    })
  }

  // Update product
  updateProduct(req, res) {
    const { product_id, type, name, description, image, is_active } = req.body

    const updateData = {}

    if (type) updateData.type = type
    if (name) updateData.name = name
    if (description) updateData.description = description
    if (image) updateData.image = image
    if (is_active !== undefined) updateData.is_active = is_active

    pool.query("UPDATE tbl_product SET ? WHERE id = ?", [updateData, product_id], (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      if (result.affectedRows === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.product_not_found,
          data: null,
        })
      }

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.product_updated_successfully,
        data: { product_id, ...updateData },
      })
    })
  }

  // Delete product
  deleteProduct(req, res) {
    const { product_id } = req.body

    pool.query("UPDATE tbl_product SET is_deleted = 1 WHERE id = ?", [product_id], (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      if (result.affectedRows === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.product_not_found,
          data: null,
        })
      }

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.product_deleted_successfully,
        data: { product_id },
      })
    })
  }

  getAllOrders(req, res) {

    let query = `
             select o.*, u.name as user_name, u.email as user_email, 
             sp.name as plan_name, sp.price, sb.name as box_name
             from tbl_order o
             join tbl_user u on o.user_id = u.id
             join tbl_subscription_plans sp on o.plan_id = sp.id
             join tbl_subscription_boxes sb on sp.box_id = sb.id
             where o.is_deleted = 0
         `

    pool.query(query, (error, orders) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.success,
        data: orders,
      })
    })
  }

  updateOrderStatus(req, res) {
    const { order_id, order_status } = req.body

    pool.query("update tbl_order set order_status = ? where id = ?", [order_status, order_id], (error, result) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      if (result.affectedRows === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.order_not_found,
          data: null,
        })
      }

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.order_status_updated_successfully,
        data: { order_id, order_status },
      })
    })
  }

  getSubscriptionAnalytics(req, res) {
    const activeSubscriptions = `
             select count(*) as active_subscriptions 
             from tbl_user_subscription 
             where status = 'active' and is_deleted = 0
         `

    const totalOrders = `
             select count(*) as total_orders 
             from tbl_order 
             where is_deleted = 0
         `

    const totalRevenue = `
             select sum(grand_total) as total_revenue 
             from tbl_order 
             where is_deleted = 0
         `

    const planType = `
             select sp.name, count(*) as count 
             from tbl_user_subscription us
             join tbl_subscription_plans sp on us.plan_id = sp.id
             where us.is_deleted = 0
             group by sp.name
         `

    pool.query(activeSubscriptions, (error, activeResult) => {
      if (error) {
        console.error("Database Query Error:", error)
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.unsuccess,
          data: error.sqlMessage,
        })
      }

      pool.query(totalOrders, (error, ordersResult) => {
        if (error) {
          console.error("Database Query Error:", error)
          return common.response(res, {
            code: responseCode.OPERATION_FAILED,
            message: response_message.unsuccess,
            data: error.sqlMessage,
          })
        }

        pool.query(totalRevenue, (error, revenueResult) => {
          if (error) {
            console.error("Database Query Error:", error)
            return common.response(res, {
              code: responseCode.OPERATION_FAILED,
              message: response_message.unsuccess,
              data: error.sqlMessage,
            })
          }

          pool.query(planType, (error, planTypeResult) => {
            if (error) {
              console.error("Database Query Error:", error)
              return common.response(res, {
                code: responseCode.OPERATION_FAILED,
                message: response_message.unsuccess,
                data: error.sqlMessage,
              })
            }

            const analytics = {
              active_subscriptions: activeResult[0].active_subscriptions,
              total_orders: ordersResult[0].total_orders,
              total_revenue: revenueResult[0].total_revenue || 0,
              subscription_by_plan: planTypeResult,
            }

            return common.response(res, {
              code: responseCode.SUCCESS,
              message: response_message.success,
              data: analytics,
            })
          })
        })
      })
    })
  }
}

module.exports = new admin_model()