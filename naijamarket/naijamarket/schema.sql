-- ============================================================
-- NaijaMarket - Digital Marketplace for Nigerian Small Businesses
-- Database schema + seed data (MySQL 5.7+ / MariaDB, utf8mb4)
-- Import via phpMyAdmin or:  mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS naijamarket
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE naijamarket;

-- ---------- USERS (buyer / vendor / admin) ----------
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(190)  NOT NULL UNIQUE,
    phone         VARCHAR(20)   NOT NULL,
    state         VARCHAR(40)   NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('buyer','vendor','admin') NOT NULL DEFAULT 'buyer',
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- VENDOR SHOPS (one per vendor user) ----------
CREATE TABLE vendors (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    shop_name   VARCHAR(150) NOT NULL,
    description TEXT         NULL,
    state       VARCHAR(40)  NOT NULL,
    status      ENUM('pending','approved','suspended') NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vendor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_vendor_status (status)
) ENGINE=InnoDB;

-- ---------- CATEGORIES ----------
CREATE TABLE categories (
    id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ---------- PRODUCTS ----------
CREATE TABLE products (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vendor_id    INT UNSIGNED  NOT NULL,
    category_id  INT UNSIGNED  NULL,
    name         VARCHAR(180)  NOT NULL,
    slug         VARCHAR(200)  NOT NULL,
    description  TEXT          NULL,
    price        DECIMAL(12,2) NOT NULL,
    stock        INT UNSIGNED  NOT NULL DEFAULT 0,
    image        VARCHAR(120)  NULL,
    is_active    TINYINT(1)    NOT NULL DEFAULT 1,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prod_vendor   FOREIGN KEY (vendor_id)   REFERENCES vendors(id)   ON DELETE CASCADE,
    CONSTRAINT fk_prod_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_prod_active (is_active),
    INDEX idx_prod_slug (slug)
) ENGINE=InnoDB;

-- ---------- CART ----------
CREATE TABLE cart_items (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity   INT UNSIGNED NOT NULL DEFAULT 1,
    UNIQUE KEY uq_cart (user_id, product_id),
    CONSTRAINT fk_cart_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- ORDERS (Nigerian delivery details + payment stub) ----------
CREATE TABLE orders (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_ref        VARCHAR(30)  NOT NULL UNIQUE,
    user_id          INT UNSIGNED NOT NULL,
    total_amount     DECIMAL(12,2) NOT NULL,
    payment_method   ENUM('paystack','flutterwave','bank_transfer','pay_on_delivery') NOT NULL DEFAULT 'paystack',
    payment_status   ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
    delivery_state   VARCHAR(40)  NOT NULL,
    delivery_address VARCHAR(255) NOT NULL,
    delivery_phone   VARCHAR(20)  NOT NULL,
    status           ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_order_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id   INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NULL,
    vendor_id  INT UNSIGNED NOT NULL,
    name       VARCHAR(180) NOT NULL,
    price      DECIMAL(12,2) NOT NULL,
    quantity   INT UNSIGNED NOT NULL,
    CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_oi_vendor  FOREIGN KEY (vendor_id)  REFERENCES vendors(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- Demo logins (all seeded with real password_hash() values):
--   Admin : admin@naijamarket.ng    / Admin@123
--   Vendor: lagoon@naijamarket.ng   / Vendor@123   (Lagoon Fabrics, Lagos)
--   Vendor: kano@naijamarket.ng     / Vendor@123   (Sahel Gadgets, Kano)
--   Buyer : buyer@naijamarket.ng    / Buyer@123
-- ============================================================

INSERT INTO users (name, email, phone, state, password_hash, role) VALUES
('Platform Admin',    'admin@naijamarket.ng',  '08000000000', 'FCT - Abuja', '$2y$10$6R.buh9FJsalDezms8EEw.z6e1BZAl5eeNuSPW9dwiTBP12gUWvSG', 'admin'),
('Amaka Obi',         'lagoon@naijamarket.ng', '08011122233', 'Lagos',       '$2y$10$3FV8e6bRNArkSVSgpq5sxuXBnyI5H9EiXV7zUo6nBBid6YuGOgckW', 'vendor'),
('Musa Bello',        'kano@naijamarket.ng',   '08033344455', 'Kano',        '$2y$10$3FV8e6bRNArkSVSgpq5sxuXBnyI5H9EiXV7zUo6nBBid6YuGOgckW', 'vendor'),
('Chinedu Eze',       'buyer@naijamarket.ng',  '08066677788', 'Rivers',      '$2y$10$Jd6fLPV0Ynf2VkTgOSlQJeh0Jifu8XvjLMKtKqos41O4IoRMnqkpa', 'buyer');

INSERT INTO vendors (user_id, shop_name, description, state, status) VALUES
(2, 'Lagoon Fabrics', 'Premium ankara, aso-oke and adire textiles from Lagos Island markets.', 'Lagos', 'approved'),
(3, 'Sahel Gadgets', 'Affordable phones, accessories and repairs. Kano branch since 2018.', 'Kano', 'approved');

INSERT INTO categories (name, slug) VALUES
('Fashion & Textiles', 'fashion-textiles'),
('Phones & Electronics', 'phones-electronics'),
('Foodstuff & Groceries', 'foodstuff-groceries'),
('Beauty & Personal Care', 'beauty-personal-care'),
('Home & Kitchen', 'home-kitchen'),
('Handmade Crafts', 'handmade-crafts');

INSERT INTO products (vendor_id, category_id, name, slug, description, price, stock, is_active) VALUES
(1, 1, 'Premium Ankara Fabric (6 Yards)', 'premium-ankara-6-yards', '100% cotton wax print, 6 yards, vivid colours that do not fade. Wholesale prices available.', 12500.00, 40, 1),
(1, 1, 'Hand-woven Aso-Oke (Male Set)', 'hand-woven-asooke-male', 'Traditional Yoruba agbada set woven in Iseyin. Includes cap.', 45000.00, 8, 1),
(1, 1, 'Adire Tie-Dye Gown', 'adire-tie-dye-gown', 'Hand-dyed indigo adire gown, sizes 8-16 available.', 18000.00, 15, 1),
(2, 2, 'Tecno Spark 10 (128GB)', 'tecno-spark-10-128gb', 'Brand new sealed, 1-year Nigerian warranty. Dual SIM.', 158000.00, 12, 1),
(2, 2, 'Oraimo 20000mAh Power Bank', 'oraimo-20000mah-power-bank', 'Fast-charging power bank, 18W PD, with torch light.', 18500.00, 55, 1),
(2, 2, 'Wireless Earbuds Pro', 'wireless-earbuds-pro', 'Bluetooth 5.3 earbuds with charging case and clear mic.', 12500.00, 70, 1),
(2, 3, 'Ijebu Garri (5kg Bag)', 'ijebu-garri-5kg', 'Sour, dry Ijebu garri directly from Ogun state farms.', 8500.00, 100, 1),
(2, 3, 'Local Rice (25kg)', 'local-rice-25kg', 'Well-parboiled Ofada-style rice, stone-free, farm fresh.', 42000.00, 30, 1);
