const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const address_model = {
  async addAddress(req, res) {
    try {
      const user_id = req.user.id
      const {
        address,
        street,
        postal_code,
        zone,
        latitude,
        longitude,
        country_code,
        phone_number,
        is_default = false,
      } = req.body

      if (!address) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_address" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // If this is set as default, unset other default addresses
        if (is_default) {
          await client.query("UPDATE tbl_delivery_addresses SET is_default = FALSE WHERE user_id = $1", [user_id])
        }

        // Add new address
        const addressQuery = `
                    INSERT INTO tbl_delivery_addresses (
                        user_id, address, street, postal_code, zone, latitude, longitude,
                        country_code, phone_number, is_default
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                `

        const result = await client.query(addressQuery, [
          user_id,
          address,
          street,
          postal_code,
          zone,
          latitude,
          longitude,
          country_code,
          phone_number,
          is_default,
        ])

        await client.query("COMMIT")

        return sendResponse(
          req,
          res,
          200,
          responseCode.SUCCESS,
          { keyword: "address_added" },
          { address_id: result.rows[0].id },
        )
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Add Address Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getAddresses(req, res) {
    try {
      const user_id = req.user.id

      const addressesQuery = `
                SELECT * FROM tbl_delivery_addresses 
                WHERE user_id = $1 AND is_active = TRUE AND is_deleted = FALSE
                ORDER BY is_default DESC, created_at DESC
            `

      const { rows } = await pool.query(addressesQuery, [user_id])

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, { addresses: rows })
    } catch (err) {
      console.error("Get Addresses Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async updateAddress(req, res) {
    try {
      const user_id = req.user.id
      const {
        address_id,
        address,
        street,
        postal_code,
        zone,
        latitude,
        longitude,
        country_code,
        phone_number,
        is_default,
      } = req.body

      if (!address_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_address_id" }, {})
      }

      // Verify ownership
      const ownershipQuery =
        "SELECT id FROM tbl_delivery_addresses WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE"
      const ownershipResult = await pool.query(ownershipQuery, [address_id, user_id])

      if (ownershipResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // If this is set as default, unset other default addresses
        if (is_default) {
          await client.query("UPDATE tbl_delivery_addresses SET is_default = FALSE WHERE user_id = $1", [user_id])
        }

        // Build dynamic update query
        const fields = []
        const values = []
        let idx = 1

        const updateFields = {
          address,
          street,
          postal_code,
          zone,
          latitude,
          longitude,
          country_code,
          phone_number,
          is_default,
        }

        for (const [key, value] of Object.entries(updateFields)) {
          if (value !== undefined) {
            fields.push(`${key} = $${idx++}`)
            values.push(value)
          }
        }

        if (fields.length === 0) {
          return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "no_fields_to_update" }, {})
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`)
        values.push(address_id)

        const updateQuery = `
                    UPDATE tbl_delivery_addresses 
                    SET ${fields.join(", ")}
                    WHERE id = $${idx}
                    RETURNING id
                `

        const result = await client.query(updateQuery, values)

        await client.query("COMMIT")

        return sendResponse(
          req,
          res,
          200,
          responseCode.SUCCESS,
          { keyword: "address_updated" },
          { address_id: result.rows[0].id },
        )
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Update Address Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async deleteAddress(req, res) {
    try {
      const user_id = req.user.id
      const { address_id } = req.body

      if (!address_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_address_id" }, {})
      }

      // Verify ownership
      const ownershipQuery =
        "SELECT id FROM tbl_delivery_addresses WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE"
      const ownershipResult = await pool.query(ownershipQuery, [address_id, user_id])

      if (ownershipResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      // Soft delete address
      const deleteQuery = `
                UPDATE tbl_delivery_addresses 
                SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id
            `

      const result = await pool.query(deleteQuery, [address_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "address_deleted" },
        { address_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Delete Address Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async setDefaultAddress(req, res) {
    try {
      const user_id = req.user.id
      const { address_id } = req.body

      if (!address_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_address_id" }, {})
      }

      // Verify ownership
      const ownershipQuery =
        "SELECT id FROM tbl_delivery_addresses WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE"
      const ownershipResult = await pool.query(ownershipQuery, [address_id, user_id])

      if (ownershipResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Unset all default addresses for user
        await client.query("UPDATE tbl_delivery_addresses SET is_default = FALSE WHERE user_id = $1", [user_id])

        // Set new default
        await client.query("UPDATE tbl_delivery_addresses SET is_default = TRUE WHERE id = $1", [address_id])

        await client.query("COMMIT")

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "default_address_set" }, { address_id })
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Set Default Address Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = address_model
