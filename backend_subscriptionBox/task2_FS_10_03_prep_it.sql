create database task2_FS_10_03_prep_it;
use task2_FS_10_03_prep_it;

create table tbl_goal(
    id bigint primary key IDENTITY(1,1),
    image text,
    name varchar(32) not null,
    description text,
    is_active tinyint(1) default 1,
    is_deleted tinyint(1) default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    deleted_at timestamp null
);

create table tbl_plan(
    id bigint(20) primary key auto_increment,
    name varchar(32) not null,
    price float(10,2) not null,
    duration_in_months int not null,
    description text,
    is_active tinyint(1) default 1,
    is_deleted tinyint(1) default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    deleted_at timestamp null
);

CREATE TABLE tbl_admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(128) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    admin_token VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

create table tbl_user(
	id bigint(20) primary key auto_increment,
    goal_id bigint(20),
    plan_id bigint(20),
    plan_purchase_at timestamp,
    step int default 0,
	email varchar(64) unique not null,
    phone varchar(16) not null,
	password text not null,
	first_name varchar(32),
    last_name varchar(32),
    dob date,
    gender enum("male", "female"),
    height int,
    weight decimal(5, 2),
    level enum("rookie", "beginner", "intermediate", "advance", "true-beast"),
    login_type enum('s', 'g', 'f'),
    social_id varchar(128),
	address TEXT,
	latitude varchar(16),
    longitude varchar(16),
    is_verified tinyint(1) default 0,
    is_subscribe tinyint(1) default 0,
	is_active tinyint(1) default 1,
	is_deleted tinyint(1) default 0,
	created_at timestamp default current_timestamp,
	updated_at timestamp default current_timestamp on update current_timestamp,
	deleted_at timestamp null,
    INDEX idx_email (email),
    foreign key (goal_id) references tbl_goal(id),
    foreign key (plan_id) references tbl_plan(id)
);

create table tbl_otp (
    id bigint(20) primary key auto_increment,
    user_id bigint(20) not null,
    email varchar(64),
    phone varchar(16),
    otp varchar(6) not null,
    action enum('signup','forgot') default 'signup',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    foreign key (user_id) references tbl_user(id) on delete cascade
);

CREATE TABLE tbl_device_info (
    id BIGINT(20) PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT(20) NOT NULL,
    device_type ENUM('android', 'ios') NOT NULL,
    device_token TEXT NOT NULL,
    user_token TEXT NOT NULL,
    os_version VARCHAR(16) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES tbl_user(id) ON DELETE CASCADE
);

CREATE TABLE tbl_meal (
    id BIGINT(20) PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    type ENUM('breakfast', 'lunch', 'dinner'),
    Kcal INT NOT NULL,
    carbs decimal(5, 2) NOT NULL,
    protein decimal(5, 2) NOT NULL,
    fat decimal(5, 2) NOT NULL,
    ingredients TEXT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);



CREATE TABLE tbl_delivery_address (
    id BIGINT(20) PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT(20) NOT NULL,
    type ENUM('home', 'office') NOT NULL,
    house_no VARCHAR(16) NOT NULL,
    society_name VARCHAR(64) NOT NULL,
    block VARCHAR(16),
    road VARCHAR(64),
    latitude VARCHAR(16) NOT NULL,
    longitude VARCHAR(16) NOT NULL,
    delivery_info text,
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    foreign key (user_id) references tbl_user(id) on delete cascade
);

CREATE TABLE tbl_orders (
    id BIGINT(20) AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT(20) NOT NULL,
    order_status ENUM('confirm', 'inPreparation', 'outForDelivery', 'completed') NOT NULL default 'conform',
    delivery_datetime DATETIME NOT NULL,
    address_id BIGINT(20) NOT NULL,
    note text,
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES tbl_user(id),
    FOREIGN KEY (address_id) REFERENCES tbl_delivery_address(id)
);

CREATE TABLE tbl_order_details (
    id BIGINT(20) AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT(20) NOT NULL,
    meal_id BIGINT(20) NOT NULL,
    qty INT,
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (order_id) REFERENCES tbl_orders(id),
    FOREIGN KEY (meal_id) REFERENCES tbl_meal(id)  
);

CREATE TABLE tbl_notification(
    id bigint(20) PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(32),
    content TEXT,
    sender_id bigint(20),
    receiver_id bigint(20),
    order_id bigint(20),
    is_read BOOLEAN,
    notification_type ENUM('success', 'warning', 'error', 'info', 'reminder') DEFAULT 'info', 
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES tbl_user(id),
    FOREIGN KEY (receiver_id) REFERENCES tbl_user(id)
);

-- help and support

CREATE TABLE tbl_help_and_support (
    id BIGINT(20) AUTO_INCREMENT PRIMARY KEY,
    full_name varchar(255) not null,
    email varchar(128) not null,
    phone varchar(16) not null,
    message text not null,
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE TABLE tbl_contact_us (
    id BIGINT(20) AUTO_INCREMENT PRIMARY KEY,
    first_name varchar(32),
    last_name varchar(32),
    email varchar(128) not null,
    subject varchar(128) not null,
    description text not null,
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE TABLE tbl_app_details (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    about TEXT,
    terms TEXT,
    privacy_policy TEXT,
    is_active TINYINT DEFAULT 1,
    is_deleted TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


INSERT INTO tbl_goal (image, name, description) VALUES
('image1.jpg', 'Weight Loss', 'Lose weight and get fit'),
('image2.jpg', 'Muscle Gain', 'Build muscle and strength'),
('image3.jpg', 'Healthy Eating', 'Adopt a healthy eating lifestyle'),
('image4.jpg', 'Endurance Training', 'Improve endurance and stamina'),
('image5.jpg', 'Flexibility', 'Increase flexibility and mobility'),
('image6.jpg', 'Stress Relief', 'Reduce stress through exercise'),
('image7.jpg', 'Cardio Fitness', 'Improve cardiovascular health'),
('image8.jpg', 'Strength Training', 'Increase overall strength'),
('image9.jpg', 'Yoga', 'Practice yoga for mental and physical health'),
('image10.jpg', 'Marathon Training', 'Train for a marathon');

INSERT INTO tbl_plan (name, price, duration_in_months, description) VALUES
('Basic Plan', 19.99, 1, 'Basic access to fitness resources.'),
('Standard Plan', 49.99, 3, 'Standard access with personalized workout plans.'),
('Premium Plan', 99.99, 6, 'Premium access with advanced features and coaching.'),
('Gold Plan', 179.99, 12, 'Full access to all features and dedicated support.'),
('Monthly Lite', 9.99, 1, 'Limited access for a trial period.'),
('Quarterly Fitness', 129.99, 3, 'Comprehensive fitness and nutrition plan.'),
('Annual Power', 299.99, 12, 'Advanced training and progress tracking.'),
('Beginner Bundle', 29.99, 1, 'Starter package for new users.'),
('Intermediate Boost', 79.99, 3, 'Plan designed to elevate your fitness level.'),
('Elite Membership', 249.99, 6, 'Exclusive access to top-tier resources.');

INSERT INTO tbl_user (goal_id, plan_id, plan_purchase_at, step, email, phone, password, first_name, last_name, dob, gender, height, weight, level, login_type, social_id, address, latitude, longitude) VALUES
(1, 1, '2023-10-26 10:00:00', 1, 'user1@example.com', '1234567890', 'password123', 'John', 'Doe', '1990-01-01', 'male', 180, 75.50, 'beginner', 's', NULL, '123 Main St', '34.0522', '-118.2437'),
(2, 2, '2023-11-01 14:30:00', 2, 'user2@example.com', '9876543210', 'securepass', 'Jane', 'Smith', '1995-05-15', 'female', 165, 60.00, 'intermediate', 'g', 'social123', '456 Oak Ave', '40.7128', '-74.0060'),
(3, 1, '2023-11-15 09:15:00', 0, 'user3@example.com', '5551234567', 'strongpass', 'David', 'Lee', '1988-12-10', 'male', 175, 80.25, 'advance', 'f', 'facebook456', '789 Pine Ln', '51.5074', '-0.1278'),
(1, 3, '2023-11-20 16:45:00', 3, 'user4@example.com', '1112223333', 'complexpass', 'Emily', 'Brown', '2000-03-22', 'female', 170, 65.75, 'rookie', 's', NULL, '101 Elm Rd', '35.6895', '139.6917'),
(2, 2, '2023-11-25 11:00:00', 1, 'user5@example.com', '4445556666', 'anotherpass', 'Michael', 'Davis', '1992-07-08', 'male', 185, 90.00, 'true-beast', 'g', 'google789', '202 Cedar Ct', '48.8566', '2.3522'),
(3, 1, '2023-12-01 13:20:00', 2, 'user6@example.com', '7778889999', 'finalpass', 'Sarah', 'Wilson', '1998-09-30', 'female', 160, 55.50, 'beginner', 'f', 'fb101112', '303 Birch St', '-33.8688', '151.2093'),
(1, 2, '2023-12-05 17:30:00', 0, 'user7@example.com', '1010101010', 'secure1234', 'Robert', 'Garcia', '1985-04-18', 'male', 190, 85.25, 'intermediate', 's', NULL, '404 Maple Ave', '41.8781', '-87.6298'),
(2, 3, '2023-12-10 10:45:00', 3, 'user8@example.com', '2020202020', 'pass12345', 'Linda', 'Rodriguez', '2001-11-28', 'female', 172, 70.00, 'advance', 'g', 'google131415', '505 Walnut Ln', '39.7684', '-86.1581'),
(3, 1, '2023-12-15 14:00:00', 1, 'user9@example.com', '3030303030', 'strongpass123', 'William', 'Martinez', '1993-06-05', 'male', 182, 78.75, 'rookie', 'f', 'facebook161718', '606 Oak Rd', '37.7749', '-122.4194'),
(1, 2, '2023-12-20 18:15:00', 2, 'user10@example.com', '4040404040', 'complexpass123', 'Patricia', 'Hernandez', '1997-02-12', 'female', 168, 62.50, 'true-beast', 's', NULL, '707 Pine Ct', '29.7604', '-95.3698');

INSERT INTO tbl_otp (user_id, email, phone, otp, action) VALUES
(1, 'john.doe@example.com', '1234567890', '123456', 'signup'),
(2, 'jane.smith@example.com', '0987654321', '654321', 'forgot'),
(3, 'alice.jones@example.com', '1122334455', '987654', 'signup'),
(4, 'bob.brown@example.com', '5566778899', '456789', 'forgot'),
(5, 'charlie.davis@example.com', '9988776655', '321654', 'signup'),
(6, 'emma.wilson@example.com', '3344556677', '789123', 'forgot'),
(7, 'david.miller@example.com', '7788990011', '654987', 'signup'),
(8, 'sophia.garcia@example.com', '2233445566', '123789', 'forgot'),
(9, 'michael.martinez@example.com', '6677889900', '456123', 'signup'),
(10, 'olivia.rodriguez@example.com', '4455667788', '987321', 'forgot');

INSERT INTO tbl_device_info (user_id, device_type, device_token, user_token, os_version) VALUES
(1, 'android', 'device_token_1', 'user_token_1', '10'),
(2, 'ios', 'device_token_2', 'user_token_2', '14'),
(3, 'android', 'device_token_3', 'user_token_3', '11'),
(4, 'ios', 'device_token_4', 'user_token_4', '15'),
(5, 'android', 'device_token_5', 'user_token_5', '12'),
(6, 'ios', 'device_token_6', 'user_token_6', '13'),
(7, 'android', 'device_token_7', 'user_token_7', '10'),
(8, 'ios', 'device_token_8', 'user_token_8', '14'),
(9, 'android', 'device_token_9', 'user_token_9', '11'),
(10, 'ios', 'device_token_10', 'user_token_10', '15');

INSERT INTO tbl_meal (name, description, image, type, Kcal, carbs, protein, fat, ingredients) VALUES
('Oatmeal', 'Healthy breakfast option', 'oatmeal.jpg', 'breakfast', 300, 50.0, 10.0, 5.0, 'Oats, milk, honey, fruits'),
('Grilled Chicken', 'High protein lunch', 'chicken.jpg', 'lunch', 400, 10.0, 40.0, 15.0, 'Chicken breast, olive oil, spices'),
('Salmon Salad', 'Light and nutritious dinner', 'salmon.jpg', 'dinner', 350, 20.0, 30.0, 10.0, 'Salmon, greens, olive oil, lemon'),
('Protein Shake', 'Post-workout recovery', 'shake.jpg', 'breakfast', 250, 30.0, 25.0, 5.0, 'Protein powder, milk, banana'),
('Quinoa Bowl', 'Vegan-friendly lunch', 'quinoa.jpg', 'lunch', 450, 60.0, 15.0, 10.0, 'Quinoa, vegetables, tofu'),
('Vegetable Stir Fry', 'Healthy dinner option', 'stirfry.jpg', 'dinner', 300, 40.0, 10.0, 8.0, 'Broccoli, carrots, soy sauce'),
('Avocado Toast', 'Simple breakfast', 'avocado.jpg', 'breakfast', 200, 25.0, 5.0, 10.0, 'Bread, avocado, salt, pepper'),
('Beef Steak', 'High-protein dinner', 'steak.jpg', 'dinner', 500, 5.0, 45.0, 30.0, 'Beef, butter, garlic, rosemary'),
('Fruit Salad', 'Light and refreshing', 'fruit.jpg', 'lunch', 150, 35.0, 2.0, 0.5, 'Apple, banana, grapes, orange'),
('Egg Scramble', 'Protein-packed breakfast', 'eggs.jpg', 'breakfast', 350, 10.0, 20.0, 25.0, 'Eggs, cheese, spinach, tomatoes');

INSERT INTO tbl_delivery_address (user_id, type, house_no, society_name, block, road, latitude, longitude, delivery_info) VALUES
(2, 'home', '101', 'Green Valley', 'A', 'Main Road', '40.7128', '-74.0060', 'Leave at the door'),
(2, 'office', '202', 'Sunrise Apartments', 'B', 'Elm Street', '34.0522', '-118.2437', 'Reception desk'),
(2, 'home', '303', 'Golden Heights', 'C', 'Oak Avenue', '51.5074', '-0.1278', 'Call upon arrival'),
(2, 'office', '404', 'Silver Towers', 'D', 'Pine Lane', '48.8566', '2.3522', 'Security guard'),
(2, 'home', '505', 'Royal Gardens', 'E', 'Birch Road', '35.6895', '139.6917', 'Ring the bell'),
(2, 'office', '606', 'Emerald Hills', 'F', 'Cedar Street', '55.7558', '37.6173', 'Front desk'),
(2, 'home', '707', 'Diamond Residency', 'G', 'Maple Drive', '19.4326', '-99.1332', 'Leave with neighbor'),
(2, 'office', '808', 'Pearl Complex', 'H', 'Walnut Lane', '-33.8688', '151.2093', 'Mailroom'),
(2, 'home', '909', 'Ruby Apartments', 'I', 'Spruce Road', '52.5200', '13.4050', 'Back door'),
(2, 'office', '1010', 'Sapphire Towers', 'J', 'Fir Street', '37.7749', '-122.4194', 'Reception');

INSERT INTO tbl_orders (user_id, delivery_datetime, address_id, note) VALUES
(1, '2023-10-26 12:00:00', 1, 'Leave at front door'),
(2, '2023-11-01 16:00:00', 2, 'Call before delivery'),
(3, '2023-11-15 11:30:00', 3, 'Handle with care'),
(4, '2023-11-20 18:00:00', 4, 'Ring the doorbell'),
(5, '2023-11-25 13:00:00', 5, 'Deliver to back entrance'),
(6, '2023-12-01 15:00:00', 6, 'No contact delivery'),
(7, '2023-12-05 19:30:00', 7, 'Leave with receptionist'),
(8, '2023-12-10 12:00:00', 8, 'Deliver to apartment #302'),
(9, '2023-12-15 16:00:00', 9, 'Ask for signature'),
(10, '2023-12-20 20:00:00', 10, 'Do not leave unattended');

INSERT INTO tbl_order_details (order_id, meal_id, qty) VALUES
(1, 1, 1),
(1, 2, 1),
(2, 3, 2),
(2, 4, 1),
(3, 5, 1),
(4, 6, 3),
(4, 7, 1),
(5, 8, 2),
(6, 9, 3),
(7, 10, 1);

INSERT INTO tbl_help_and_support (full_name, email, phone, message) VALUES
('John Doe', 'john.doe@example.com', '1234567890', 'Need help with my account'),
('Jane Smith', 'jane.smith@example.com', '0987654321', 'Issue with meal delivery'),
('Alice Jones', 'alice.jones@example.com', '1122334455', 'Cannot reset password'),
('Bob Brown', 'bob.brown@example.com', '5566778899', 'App not working'),
('Charlie Davis', 'charlie.davis@example.com', '9988776655', 'Payment issue'),
('Emma Wilson', 'emma.wilson@example.com', '3344556677', 'Order not delivered'),
('David Miller', 'david.miller@example.com', '7788990011', 'Need refund'),
('Sophia Garcia', 'sophia.garcia@example.com', '2233445566', 'Account hacked'),
('Michael Martinez', 'michael.martinez@example.com', '6677889900', 'App crashing'),
('Olivia Rodriguez', 'olivia.rodriguez@example.com', '4455667788', 'Feedback on service');

INSERT INTO tbl_contact_us (first_name, last_name, email, subject, description) VALUES
('John', 'Doe', 'john.doe@example.com', 'Feedback', 'Great app!'),
('Jane', 'Smith', 'jane.smith@example.com', 'Issue', 'App crashing'),
('Alice', 'Jones', 'alice.jones@example.com', 'Support', 'Need help with account'),
('Bob', 'Brown', 'bob.brown@example.com', 'Feedback', 'Improve meal options'),
('Charlie', 'Davis', 'charlie.davis@example.com', 'Issue', 'Payment failed'),
('Emma', 'Wilson', 'emma.wilson@example.com', 'Support', 'Order not delivered'),
('David', 'Miller', 'david.miller@example.com', 'Feedback', 'Great service'),
('Sophia', 'Garcia', 'sophia.garcia@example.com', 'Issue', 'App not loading'),
('Michael', 'Martinez', 'michael.martinez@example.com', 'Support', 'Need refund'),
('Olivia', 'Rodriguez', 'olivia.rodriguez@example.com', 'Feedback', 'Loved the experience');

INSERT INTO tbl_app_details (about, terms, privacy_policy) VALUES
('About the app', 'Terms of service', 'Privacy policy details'),
('Fitness app', 'User agreement', 'Data protection policy'),
('Healthy living', 'Service terms', 'Privacy guidelines'),
('Nutrition guide', 'Terms and conditions', 'Privacy statement'),
('Workout plans', 'Usage terms', 'Data privacy policy'),
('Meal delivery', 'Service agreement', 'Privacy information'),
('Fitness tracking', 'User terms', 'Privacy notice'),
('Health goals', 'Terms of use', 'Privacy policy'),
('Nutrition tips', 'Service terms', 'Privacy details'),
('Exercise routines', 'User agreement', 'Privacy policy');

INSERT INTO tbl_notification (title, content, sender_id, receiver_id, is_read, notification_type) VALUES
('Order Delivered', 'Your order is successful deliver Grygg elomin kashyyyk skirata. Oswalt mirta omwati kohl shmi.', 1, 2, FALSE, 'success'),
('Order On Way', 'Order in on way Orygg elomin kashyyyk skirata. Oswaft mirta omwati kohl shmi.', 3, 4, FALSE, 'warning'),
('Order Cancelled', 'order was cancel Grygg elomin kashyyyk skirata. Oswaft mirta omwati kohl shmi.', 5, 6, FALSE, 'error'),
('Support Message', 'Message from support Grygg elomin kashyyyk skirata. Oswalt mirta omwati kohl shmi.', 7, 8, FALSE, 'info'),
('Plan Expiry', 'Your plan will expire in 2 days Grygg elomin kashyyyk skirata. Oswaft mirta omwati kohl shmi.', 9, 10, FALSE, 'reminder'),
('New Feature', 'Check out the new feature we added.', 2, 1, TRUE, 'info'),
('Payment Failed', 'Payment processing failed. Please check your details.', 4, 3, FALSE, 'error'),
('Workout Reminder', 'Dont forget your workout scheduled for today.', 6, 5, TRUE, 'reminder'),
('Account Updated', 'Your account details have been updated successfully.', 8, 7, TRUE, 'success'),
('Low Stock Alert', 'One of your items is running low on stock.', 10, 9, FALSE, 'warning');

