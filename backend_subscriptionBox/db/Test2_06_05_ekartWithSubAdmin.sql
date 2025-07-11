create database Test2_06_05_ekartWithSubAdmin;
use Test2_06_05_ekartWithSubAdmin;

create table tbl_user(
    id bigint(20) primary key auto_increment,
    name varchar(32),
    email varchar(64),
    password varchar(128),
    stripe_customer_id VARCHAR(255),
    role enum('user', 'admin') default 'user',
    country_code varchar(6),
    phone varchar(16),
    is_active bool default 1,
    is_deleted bool default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);

create table tbl_device_info (
    id bigint(20) primary key auto_increment,
    user_id bigint,
    device_type ENUM('android', 'ios') NOT NULL,
    device_name varchar(64),
    os_version varchar(8),
    app_version varchar(8),
    user_token text,
    timezone varchar(32),
    is_active tinyint default 1,
    is_deleted tinyint default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    foreign key (user_id) references tbl_user(id)
);

create table tbl_otp (
    id bigint(20) primary key auto_increment,
    user_id bigint(20) not null,
    email varchar(64),
    phone varchar(16),
    otp varchar(6) not null,
    action enum('signup', 'forgot') default 'signup',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    foreign key (user_id) references tbl_user(id) on delete cascade
);

create table tbl_category(
    id bigint(20) primary key auto_increment,
    name varchar(32),
    is_active bool default 1,
    is_deleted bool default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);

create table tbl_subscription_boxes (
    id bigint(20) primary key auto_increment,
    name varchar(128) NOT NULL,
    description text NOT NULL,
    category_id bigint(20),
    is_active bool default 1,
    is_deleted bool default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    foreign key (category_id) references tbl_category(id) on delete cascade
);

create table tbl_subscription_plans (
    id bigint(20) primary key auto_increment,
    box_id bigint(20),
    name enum('monthly', 'quarterly') NOT NULL,
    months int NOT NULL default 1,
    price decimal(10, 2) NOT NULL,
    is_active bool default 1,
    is_deleted bool default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    foreign key (box_id) references tbl_subscription_boxes(id) on delete cascade
);

create table tbl_user_subscription (
    id bigint(20) primary key auto_increment,
    user_id bigint(20),
    plan_id bigint(20),
    status enum('active', 'cancelled', 'paused') NOT NULL,
    start_date date NOT NULL,
    end_date date,
    payment_method ENUM('cash', 'card', 'stripe') NOT NULL,
    is_active bool default 1,
    is_deleted bool default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    foreign key (user_id) references tbl_user(id) on delete cascade,
    foreign key (plan_id) references tbl_subscription_plans(id) on delete cascade
);

create table tbl_product (
    id bigint(20) primary key auto_increment,
    plan_id bigint(20),
    type varchar(32),
    name varchar(32),
    description text,
    image text,
    is_active bool default 1,
    is_deleted bool default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    foreign key (plan_id) references tbl_subscription_plans(id) on delete cascade
);

create table tbl_order (
    id bigint(20) primary key auto_increment,
    user_id bigint(20),
    plan_id bigint(20), 
    address text,
    payment_method ENUM('cash', 'card', 'stripe') NOT NULL
    order_status enum('pending', 'shipped', 'delivered'),
    grand_total int,
    order_date timestamp,
    is_active tinyint default 1,
    is_deleted tinyint default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    foreign key (user_id) references tbl_user(id) on delete cascade,
    foreign key (plan_id) references tbl_subscription_plans(id) on delete cascade
);

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




INSERT INTO tbl_user (name, email, password, role, country_code, phone) VALUES
('John Doe', 'john@example.com', 'password123', 'user', '+1', '1234567890'),
('Jane Smith', 'jane@example.com', 'password456', 'admin', '+1', '9876543210'),
('Mike Johnson', 'mike@example.com', 'password789', 'user', '+44', '1231231234'),
('Sarah Williams', 'sarah@example.com', 'passwordabc', 'user', '+61', '4564564567'),
('David Brown', 'david@example.com', 'passworddef', 'user', '+91', '7897897890');

INSERT INTO tbl_device_info (user_id, device_type, device_name, os_version, app_version, user_token, timezone) VALUES
(1, 'android', 'Samsung Galaxy S21', '11', '1.0', 'token123', 'America/New_York'),
(2, 'ios', 'iPhone 13', '15', '1.1', 'token456', 'America/Los_Angeles'),
(3, 'android', 'Google Pixel 6', '12', '1.0', 'token789', 'Europe/London'),
(4, 'ios', 'iPhone 12', '14', '1.2', 'tokenabc', 'Australia/Sydney'),
(5, 'android', 'OnePlus 9', '11', '1.1', 'tokendef', 'Asia/Kolkata');

INSERT INTO tbl_otp (user_id, email, phone, otp, action) VALUES
(1, 'john@example.com', '1234567890', '123456', 'signup'),
(2, 'jane@example.com', '9876543210', '654321', 'forgot'),
(3, 'mike@example.com', '1231231234', '987654', 'signup'),
(4, 'sarah@example.com', '4564564567', '456789', 'forgot'),
(5, 'david@example.com', '7897897890', '321654', 'signup');

INSERT INTO tbl_category (name) VALUES
('Food & Beverages'),
('Health & Wellness'),
('Beauty & Personal Care'),
('Books & Stationery'),
('Pet Supplies');

INSERT INTO tbl_subscription_boxes (name, description, category_id) VALUES
('Gourmet Delights', 'Monthly selection of premium food items', 1),
('Wellness Box', 'Health supplements and wellness products', 2),
('Beauty Box', 'Premium beauty and skincare products', 3),
('Book Lovers', 'Curated selection of books and stationery', 4),
('Pet Paradise', 'Monthly treats and toys for your pets', 5);

INSERT INTO tbl_subscription_plans (box_id, name, months, price) VALUES
(1, 'monthly', 1, 29.99),
(1, 'quarterly', 3, 79.99),
(2, 'monthly', 1, 39.99),
(2, 'quarterly', 3, 109.99),
(3, 'monthly', 1, 49.99);

INSERT INTO tbl_user_subscription (user_id, plan_id, status, start_date, end_date, payment_method) VALUES
(1, 1, 'active', '2023-01-01', '2023-02-01', 'cash'),
(2, 3, 'active', '2023-01-15', '2023-02-15', 'cash'),
(3, 5, 'cancelled', '2023-02-01', '2023-03-01', 'cash'),
(4, 2, 'paused', '2023-01-10', '2023-04-10', 'cash'),
(5, 4, 'active', '2023-02-15', '2023-05-15', 'cash');

INSERT INTO tbl_product (plan_id, type, name, description, image) VALUES
(1, 'food', 'Artisan Cheese', 'Premium selection of cheeses', 'cheese.jpg'),
(1, 'food', 'Gourmet Crackers', 'Handcrafted artisanal crackers', 'crackers.jpg'),
(2, 'food', 'Olive Oil', 'Premium extra virgin olive oil', 'oliveoil.jpg'),
(3, 'supplement', 'Multivitamin', 'Daily health supplement', 'multivitamin.jpg'),
(4, 'skincare', 'Face Cream', 'Hydrating face cream', 'facecream.jpg');

INSERT INTO tbl_order (user_id, plan_id, address, payment_method, order_status, grand_total) VALUES
(1, 1, '123 Main St, New York, NY', 'cash', 'delivered', 2999),
(2, 3, '456 Oak Ave, Los Angeles, CA', 'cash', 'shipped', 3999),
(3, 5, '789 Pine Rd, London, UK', 'cash', 'pending', 4999),
(4, 2, '321 Elm St, Sydney, AU', 'cash', 'delivered', 7999),
(5, 4, '654 Maple Dr, Mumbai, IN', 'cash', 'shipped', 10999);


