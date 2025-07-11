const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const mysql = require("mysql2/promise")
const dotenv = require("dotenv")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 26450

// Middleware
app.use(cors())
app.use(bodyParser.text()) // For encrypted data
app.use(bodyParser.json()) // For regular JSON

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ecommerce",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Utility functions
const common = {
  generateOTP: () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  },
  response: (res, data) => {
    return res.json(data)
  },
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(String(email).toLowerCase())
  },
}

// Encryption/Decryption functions
const encryption = {
  encrypt: (data) => {
    // In a real app, implement proper encryption
    return Buffer.from(JSON.stringify(data)).toString("base64")
  },
  decrypt: (data) => {
    // In a real app, implement proper decryption
    try {
      return JSON.parse(Buffer.from(data, "base64").toString())
    } catch (error) {
      console.error("Decryption error:", error)
      return { error: "Failed to decrypt data" }
    }
  },
}

// Middleware for decryption
const decryptMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === "string" && req.body.length > 0) {
    try {
      req.body = encryption.decrypt(req.body)
    } catch (error) {
      console.error("Decryption middleware error:", error)
      return common.response(res, {
        code: 0,
        message: "Invalid request data",
        data: null,
      })
    }
  }
  next()
}

// Middleware for authentication
const authMiddleware = async (req, res, next) => {
  const token = req.headers.token

  if (!token) {
    return common.response(res, {
      code: 0,
      message: "Authentication required",
      data: null,
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Check if token exists in device_info table
    const [devices] = await pool.query(
      "SELECT * FROM tbl_device_info WHERE user_token = ? AND is_active = 1 AND is_deleted = 0",
      [token],
    )

    if (devices.length === 0) {
      return common.response(res, {
        code: 0,
        message: "Invalid or expired token",
        data: null,
      })
    }

    // Get user info
    const [users] = await pool.query("SELECT * FROM tbl_user WHERE id = ? AND is_active = 1 AND is_deleted = 0", [
      decoded.user_id,
    ])

    if (users.length === 0) {
      return common.response(res, {
        code: 0,
        message: "User not found",
        data: null,
      })
    }

    req.user = users[0]
    next()
  } catch (error) {
    console.error("Auth middleware error:", error)
    return common.response(res, {
      code: 0,
      message: "Invalid token",
      data: null,
    })
  }
}

// Middleware for admin authentication
const adminAuthMiddleware = async (req, res, next) => {
  const token = req.headers.token

  if (!token) {
    return common.response(res, {
      code: 0,
      message: "Admin authentication required",
      data: null,
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Check if admin exists
    const [admins] = await pool.query("SELECT * FROM tbl_admin WHERE id = ? AND is_active = 1 AND is_deleted = 0", [
      decoded.admin_id,
    ])

    if (admins.length === 0) {
      return common.response(res, {
        code: 0,
        message: "Admin not found",
        data: null,
      })
    }

    req.admin = admins[0]
    next()
  } catch (error) {
    console.error("Admin auth middleware error:", error)
    return common.response(res, {
      code: 0,
      message: "Invalid admin token",
      data: null,
    })
  }
}

// Routes
// User Authentication
app.post("/v1/user/signup", decryptMiddleware, async (req, res) => {
  try {
    const { name, email, password, phone, countryCode } = req.body

    // Check if email already exists
    const [existingUsers] = await pool.query("SELECT * FROM tbl_user WHERE email = ?", [email])

    if (existingUsers.length > 0) {
      return common.response(res, {
        code: 0,
        message: "Email already exists",
        data: null,
      })
    }

    // Check if phone already exists
    const [existingPhones] = await pool.query("SELECT * FROM tbl_user WHERE phone = ?", [phone])

    if (existingPhones.length > 0) {
      return common.response(res, {
        code: 0,
        message: "Phone number already exists",
        data: null,
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user
    const [result] = await pool.query(
      "INSERT INTO tbl_user (name, email, password, country_code, phone, is_active, is_deleted) VALUES (?, ?, ?, ?, ?, 1, 0)",
      [name, email, hashedPassword, countryCode || "+91", phone],
    )

    const userId = result.insertId

    // Generate OTP
    const otp = common.generateOTP()

    // Store OTP
    await pool.query("INSERT INTO tbl_otp (user_id, otp, phone, email, action) VALUES (?, ?, ?, ?, 'signup')", [
      userId,
      otp,
      phone,
      email,
    ])

    // Generate token
    const user_token = jwt.sign({ user_id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" })

    // Store device info
    await pool.query(
      "INSERT INTO tbl_device_info (user_id, device_type, device_name, os_version, app_version, user_token, timezone, is_active, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)",
      [
        userId,
        req.body.device_type || "web",
        req.body.device_name || "unknown",
        req.body.os_version || "unknown",
        req.body.app_version || "1.0",
        user_token,
        req.body.timezone || "UTC",
      ],
    )

    return common.response(res, {
      code: 1,
      message: "User registered successfully. OTP has been sent.",
      data: { user_id: userId, user_token, otp },
    })
  } catch (error) {
    console.error("Signup error:", error)
    return common.response(res, {
      code: 0,
      message: "Registration failed",
      data: error.message,
    })
  }
})

app.post("/v1/user/verifyOtp", decryptMiddleware, authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const { otp } = req.body

    // Verify OTP
    const [otpRecords] = await pool.query("SELECT * FROM tbl_otp WHERE user_id = ? AND otp = ? AND action = 'signup'", [
      userId,
      otp,
    ])

    if (otpRecords.length === 0) {
      return common.response(res, {
        code: 0,
        message: "Invalid OTP",
        data: null,
      })
    }

    // Update user as verified
    await pool.query("UPDATE tbl_user SET is_verified = 1 WHERE id = ?", [userId])

    // Delete used OTP
    await pool.query("DELETE FROM tbl_otp WHERE user_id = ? AND action = 'signup'", [userId])

    return common.response(res, {
      code: 1,
      message: "OTP verified successfully",
      data: { user_id: userId },
    })
  } catch (error) {
    console.error("OTP verification error:", error)
    return common.response(res, {
      code: 0,
      message: "OTP verification failed",
      data: error.message,
    })
  }
})

app.post("/v1/user/login", decryptMiddleware, async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const [users] = await pool.query("SELECT * FROM tbl_user WHERE email = ? AND is_deleted = 0", [email])

    if (users.length === 0) {
      return common.response(res, {
        code: 0,
        message: "Invalid email or password",
        data: null,
      })
    }

    const user = users[0]

    // Check if account is active
    if (user.is_active !== 1) {
      return common.response(res, {
        code: 0,
        message: "Account is deactivated",
        data: null,
      })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return common.response(res, {
        code: 0,
        message: "Invalid email or password",
        data: null,
      })
    }

    // Generate token
    const user_token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" })

    // Store device info
    await pool.query(
      "INSERT INTO tbl_device_info (user_id, device_type, device_name, os_version, app_version, user_token, timezone, is_active, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)",
      [
        user.id,
        req.body.device_type || "web",
        req.body.device_name || "unknown",
        req.body.os_version || "unknown",
        req.body.app_version || "1.0",
        user_token,
        req.body.timezone || "UTC",
      ],
    )

    return common.response(res, {
      code: 1,
      message: "Login successful",
      data: { user_id: user.id, user_token },
    })
  } catch (error) {
    console.error("Login error:", error)
    return common.response(res, {
      code: 0,
      message: "Login failed",
      data: error.message,
    })
  }
})

app.post("/v1/user/logout", authMiddleware, async (req, res) => {
  try {
    const token = req.headers.token

    // Invalidate token
    await pool.query("UPDATE tbl_device_info SET is_active = 0 WHERE user_token = ?", [token])

    return common.response(res, {
      code: 1,
      message: "Logout successful",
      data: null,
    })
  } catch (error) {
    console.error("Logout error:", error)
    return common.response(res, {
      code: 0,
      message: "Logout failed",
      data: error.message,
    })
  }
})

// User Profile
app.get("/v1/user/viewProfile", authMiddleware, async (req, res) => {
  try {
    const user = req.user

    // Remove sensitive information
    delete user.password

    return common.response(res, {
      code: 1,
      message: "Profile retrieved successfully",
      data: user,
    })
  } catch (error) {
    console.error("View profile error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to retrieve profile",
      data: error.message,
    })
  }
})

app.post("/v1/user/editProfile", decryptMiddleware, authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const { name, phone, countryCode } = req.body

    // Update user profile
    await pool.query("UPDATE tbl_user SET name = ?, phone = ?, country_code = ? WHERE id = ?", [
      name,
      phone,
      countryCode,
      userId,
    ])

    return common.response(res, {
      code: 1,
      message: "Profile updated successfully",
      data: null,
    })
  } catch (error) {
    console.error("Edit profile error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to update profile",
      data: error.message,
    })
  }
})

// Products
app.get("/api/products", async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, limit, page } = req.query

    let query = "SELECT * FROM tbl_products WHERE is_deleted = 0"
    const params = []

    // Apply filters
    if (category) {
      query += " AND category = ?"
      params.push(category)
    }

    if (search) {
      query += " AND (name LIKE ? OR description LIKE ?)"
      params.push(`%${search}%`, `%${search}%`)
    }

    if (minPrice) {
      query += " AND price >= ?"
      params.push(minPrice)
    }

    if (maxPrice) {
      query += " AND price <= ?"
      params.push(maxPrice)
    }

    // Add pagination
    const pageSize = limit ? Number.parseInt(limit) : 10
    const currentPage = page ? Number.parseInt(page) : 1
    const offset = (currentPage - 1) * pageSize

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.push(pageSize, offset)

    // Get products
    const [products] = await pool.query(query, params)

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM tbl_products WHERE is_deleted = 0"
    const countParams = []

    if (category) {
      countQuery += " AND category = ?"
      countParams.push(category)
    }

    if (search) {
      countQuery += " AND (name LIKE ? OR description LIKE ?)"
      countParams.push(`%${search}%`, `%${search}%`)
    }

    if (minPrice) {
      countQuery += " AND price >= ?"
      countParams.push(minPrice)
    }

    if (maxPrice) {
      countQuery += " AND price <= ?"
      countParams.push(maxPrice)
    }

    const [countResult] = await pool.query(countQuery, countParams)
    const total = countResult[0].total

    return common.response(res, {
      code: 1,
      message: "Products retrieved successfully",
      data: {
        products,
        pagination: {
          total,
          page: currentPage,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error("Get products error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to retrieve products",
      data: error.message,
    })
  }
})

app.get("/api/products/:id", async (req, res) => {
  try {
    const productId = req.params.id

    // Get product
    const [products] = await pool.query("SELECT * FROM tbl_products WHERE id = ? AND is_deleted = 0", [productId])

    if (products.length === 0) {
      return common.response(res, {
        code: 0,
        message: "Product not found",
        data: null,
      })
    }

    return common.response(res, {
      code: 1,
      message: "Product retrieved successfully",
      data: products[0],
    })
  } catch (error) {
    console.error("Get product error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to retrieve product",
      data: error.message,
    })
  }
})

// Admin routes
app.post("/api/admin/login", decryptMiddleware, async (req, res) => {
  try {
    const { email, password } = req.body

    // Find admin by email
    const [admins] = await pool.query("SELECT * FROM tbl_admin WHERE email = ? AND is_deleted = 0", [email])

    if (admins.length === 0) {
      return common.response(res, {
        code: 0,
        message: "Invalid email or password",
        data: null,
      })
    }

    const admin = admins[0]

    // Check if account is active
    if (admin.is_active !== 1) {
      return common.response(res, {
        code: 0,
        message: "Account is deactivated",
        data: null,
      })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password)

    if (!isPasswordValid) {
      return common.response(res, {
        code: 0,
        message: "Invalid email or password",
        data: null,
      })
    }

    // Generate token
    const admin_token = jwt.sign({ admin_id: admin.id }, process.env.JWT_SECRET, { expiresIn: "1d" })

    return common.response(res, {
      code: 1,
      message: "Login successful",
      data: { admin_id: admin.id, admin_token },
    })
  } catch (error) {
    console.error("Admin login error:", error)
    return common.response(res, {
      code: 0,
      message: "Login failed",
      data: error.message,
    })
  }
})

// Admin product management
app.post("/api/products", decryptMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body

    // Insert product
    const [result] = await pool.query(
      "INSERT INTO tbl_products (name, description, price, image, category, stock, is_active, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 1, 0)",
      [name, description, price, image, category, stock],
    )

    return common.response(res, {
      code: 1,
      message: "Product added successfully",
      data: { product_id: result.insertId },
    })
  } catch (error) {
    console.error("Add product error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to add product",
      data: error.message,
    })
  }
})

app.put("/api/products/:id", decryptMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const productId = req.params.id
    const { name, description, price, image, category, stock } = req.body

    // Update product
    await pool.query(
      "UPDATE tbl_products SET name = ?, description = ?, price = ?, image = ?, category = ?, stock = ? WHERE id = ?",
      [name, description, price, image, category, stock, productId],
    )

    return common.response(res, {
      code: 1,
      message: "Product updated successfully",
      data: null,
    })
  } catch (error) {
    console.error("Update product error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to update product",
      data: error.message,
    })
  }
})

app.delete("/api/products/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const productId = req.params.id

    // Soft delete product
    await pool.query("UPDATE tbl_products SET is_deleted = 1 WHERE id = ?", [productId])

    return common.response(res, {
      code: 1,
      message: "Product deleted successfully",
      data: null,
    })
  } catch (error) {
    console.error("Delete product error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to delete product",
      data: error.message,
    })
  }
})

// Orders
app.post("/api/orders", decryptMiddleware, authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const { items, total, shipping_address, payment } = req.body

    // Start transaction
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Create order
      const [orderResult] = await connection.query(
        "INSERT INTO tbl_orders (user_id, total, status, shipping_address, payment_method, payment_details, created_at) VALUES (?, ?, 'pending', ?, ?, ?, NOW())",
        [userId, total, JSON.stringify(shipping_address), payment.method, JSON.stringify(payment)],
      )

      const orderId = orderResult.insertId

      // Add order items
      for (const item of items) {
        await connection.query(
          "INSERT INTO tbl_order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, item.product_id, item.quantity, item.price],
        )

        // Update product stock
        await connection.query("UPDATE tbl_products SET stock = stock - ? WHERE id = ?", [
          item.quantity,
          item.product_id,
        ])
      }

      await connection.commit()

      return common.response(res, {
        code: 1,
        message: "Order placed successfully",
        data: { order_id: orderId },
      })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Create order error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to place order",
      data: error.message,
    })
  }
})

app.get("/api/orders/user", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id

    // Get user's orders
    const [orders] = await pool.query("SELECT * FROM tbl_orders WHERE user_id = ? ORDER BY created_at DESC", [userId])

    return common.response(res, {
      code: 1,
      message: "Orders retrieved successfully",
      data: orders,
    })
  } catch (error) {
    console.error("Get user orders error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to retrieve orders",
      data: error.message,
    })
  }
})

app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const orderId = req.params.id

    // Get order
    const [orders] = await pool.query("SELECT * FROM tbl_orders WHERE id = ? AND user_id = ?", [orderId, userId])

    if (orders.length === 0) {
      return common.response(res, {
        code: 0,
        message: "Order not found",
        data: null,
      })
    }

    // Get order items
    const [items] = await pool.query(
      `SELECT oi.*, p.name, p.image 
       FROM tbl_order_items oi 
       JOIN tbl_products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [orderId],
    )

    return common.response(res, {
      code: 1,
      message: "Order retrieved successfully",
      data: {
        order: orders[0],
        items,
      },
    })
  } catch (error) {
    console.error("Get order error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to retrieve order",
      data: error.message,
    })
  }
})

// Admin order management
app.get("/api/admin/orders", adminAuthMiddleware, async (req, res) => {
  try {
    const { status, limit, page } = req.query

    let query =
      "SELECT o.*, u.name as user_name, u.email as user_email FROM tbl_orders o JOIN tbl_user u ON o.user_id = u.id"
    const params = []

    if (status) {
      query += " WHERE o.status = ?"
      params.push(status)
    }

    // Add pagination
    const pageSize = limit ? Number.parseInt(limit) : 10
    const currentPage = page ? Number.parseInt(page) : 1
    const offset = (currentPage - 1) * pageSize

    query += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?"
    params.push(pageSize, offset)

    // Get orders
    const [orders] = await pool.query(query, params)

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM tbl_orders"
    const countParams = []

    if (status) {
      countQuery += " WHERE status = ?"
      countParams.push(status)
    }

    const [countResult] = await pool.query(countQuery, countParams)
    const total = countResult[0].total

    return common.response(res, {
      code: 1,
      message: "Orders retrieved successfully",
      data: {
        orders,
        pagination: {
          total,
          page: currentPage,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error("Admin get orders error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to retrieve orders",
      data: error.message,
    })
  }
})

app.put("/api/admin/orders/:id", decryptMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id
    const { status } = req.body

    // Update order status
    await pool.query("UPDATE tbl_orders SET status = ? WHERE id = ?", [status, orderId])

    return common.response(res, {
      code: 1,
      message: "Order status updated successfully",
      data: null,
    })
  } catch (error) {
    console.error("Update order status error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to update order status",
      data: error.message,
    })
  }
})

// Admin user management
app.get("/api/admin/users", adminAuthMiddleware, async (req, res) => {
  try {
    const { limit, page, search } = req.query

    let query = "SELECT id, name, email, phone, country_code, is_active, created_at FROM tbl_user WHERE is_deleted = 0"
    const params = []

    if (search) {
      query += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)"
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    // Add pagination
    const pageSize = limit ? Number.parseInt(limit) : 10
    const currentPage = page ? Number.parseInt(page) : 1
    const offset = (currentPage - 1) * pageSize

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.push(pageSize, offset)

    // Get users
    const [users] = await pool.query(query, params)

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM tbl_user WHERE is_deleted = 0"
    const countParams = []

    if (search) {
      countQuery += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)"
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    const [countResult] = await pool.query(countQuery, countParams)
    const total = countResult[0].total

    return common.response(res, {
      code: 1,
      message: "Users retrieved successfully",
      data: {
        users,
        pagination: {
          total,
          page: currentPage,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error("Admin get users error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to retrieve users",
      data: error.message,
    })
  }
})

app.put("/api/admin/users/:id", decryptMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const userId = req.params.id
    const { name, email, phone, country_code, is_active } = req.body

    // Update user
    await pool.query(
      "UPDATE tbl_user SET name = ?, email = ?, phone = ?, country_code = ?, is_active = ? WHERE id = ?",
      [name, email, phone, country_code, is_active, userId],
    )

    return common.response(res, {
      code: 1,
      message: "User updated successfully",
      data: null,
    })
  } catch (error) {
    console.error("Admin update user error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to update user",
      data: error.message,
    })
  }
})

// Admin dashboard
app.get("/api/admin/dashboard", adminAuthMiddleware, async (req, res) => {
  try {
    // Get total orders
    const [ordersCount] = await pool.query("SELECT COUNT(*) as total FROM tbl_orders")

    // Get total users
    const [usersCount] = await pool.query("SELECT COUNT(*) as total FROM tbl_user WHERE is_deleted = 0")

    // Get total revenue
    const [revenue] = await pool.query("SELECT SUM(total) as total FROM tbl_orders WHERE status != 'cancelled'")

    // Get recent orders
    const [recentOrders] = await pool.query(
      `SELECT o.*, u.name as user 
       FROM tbl_orders o 
       JOIN tbl_user u ON o.user_id = u.id 
       ORDER BY o.created_at DESC 
       LIMIT 5`,
    )

    return common.response(res, {
      code: 1,
      message: "Dashboard data retrieved successfully",
      data: {
        totalOrders: ordersCount[0].total,
        totalUsers: usersCount[0].total,
        totalRevenue: revenue[0].total || 0,
        recentOrders,
      },
    })
  } catch (error) {
    console.error("Admin dashboard error:", error)
    return common.response(res, {
      code: 0,
      message: "Failed to retrieve dashboard data",
      data: error.message,
    })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Export for testing
module.exports = app
