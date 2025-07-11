-- Create database
CREATE DATABASE IF NOT EXISTS ecommerce;
USE ecommerce;

-- Users table
CREATE TABLE IF NOT EXISTS tbl_user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  country_code VARCHAR(10) DEFAULT '+91',
  phone VARCHAR(20) NOT NULL,
  is_verified TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  is_deleted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OTP table
CREATE TABLE IF NOT EXISTS tbl_otp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  otp VARCHAR(10) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);

-- Device info table
CREATE TABLE IF NOT EXISTS tbl_device_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_type VARCHAR(50),
  device_name VARCHAR(100),
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  user_token TEXT NOT NULL,
  timezone VARCHAR(50),
  is_active TINYINT(1) DEFAULT 1,
  is_deleted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);

-- Admin table
CREATE TABLE IF NOT EXISTS tbl_admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active TINYINT(1) DEFAULT 1,
  is_deleted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS tbl_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image VARCHAR(255),
  category VARCHAR(100),
  stock INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  is_deleted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS tbl_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  shipping_address JSON,
  payment_method VARCHAR(50),
  payment_details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);

-- Order items table
CREATE TABLE IF NOT EXISTS tbl_order_items (
  i  REFERENCES tbl_user(id)
);

-- Order items table
CREATE TABLE IF NOT EXISTS tbl_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES tbl_orders(id),
  FOREIGN KEY (product_id) REFERENCES tbl_products(id)
);

-- Insert admin user
INSERT INTO tbl_admin (name, email, password, role) 
VALUES ('Admin', 'admin@example.com', '$2b$10$X/QQRJkEL7jJ4lGxst5QYO.eD/9VHIlMJDCM1ohYHYgFBU5mZ9.5m', 'super_admin');
-- Password is 'admin123' (hashed with bcrypt)

-- Insert sample categories
INSERT INTO tbl_products (name, description, price, image, category, stock) VALUES
('Wireless Headphones', 'Premium noise-cancelling wireless headphones', 199.99, '/placeholder.jpg', 'Electronics', 50),
('Smart Watch', 'Fitness tracker and smartwatch with heart rate monitor', 149.99, '/placeholder.jpg', 'Electronics', 30),
('Cotton T-Shirt', 'Comfortable 100% cotton t-shirt', 24.99, '/placeholder.jpg', 'Clothing', 100),
('Running Shoes', 'Lightweight running shoes with cushioned sole', 89.99, '/placeholder.jpg', 'Footwear', 45),
('Coffee Maker', 'Programmable coffee maker with thermal carafe', 79.99, '/placeholder.jpg', 'Home', 25),
('Backpack', 'Durable backpack with laptop compartment', 59.99, '/placeholder.jpg', 'Accessories', 60);




-- Update payment_method enum in tbl_user_subscription
ALTER TABLE tbl_user_subscription 
MODIFY COLUMN payment_method ENUM('cash', 'card', 'stripe') NOT NULL;

-- Update payment_method enum in tbl_order
ALTER TABLE tbl_order 
MODIFY COLUMN payment_method ENUM('cash', 'card', 'stripe') NOT NULL;

-- Create payment transactions table
CREATE TABLE tbl_payment_transaction (
  id BIGINT(20) PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT(20) NOT NULL,
  order_id BIGINT(20),
  subscription_id BIGINT(20),
  payment_intent_id VARCHAR(255),
  payment_method_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'succeeded', 'failed', 'refunded') NOT NULL,
  error_message TEXT,
  is_active BOOL DEFAULT 1,
  is_deleted BOOL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES tbl_user(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES tbl_order(id) ON DELETE SET NULL,
  FOREIGN KEY (subscription_id) REFERENCES tbl_user_subscription(id) ON DELETE SET NULL
);

-- Add customer_id column to tbl_user for Stripe customer ID
ALTER TABLE tbl_user
ADD COLUMN stripe_customer_id VARCHAR(255) AFTER phone;
