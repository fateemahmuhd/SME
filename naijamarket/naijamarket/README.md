# NaijaMarket — Digital Marketplace Platform for Small Businesses in Nigeria

A complete web-based marketplace built with **pure PHP (PDO) + MySQL**, designed for Nigerian MSMEs: Naira (₦) pricing, all 36 states + FCT, local payment gateway stubs (Paystack / Flutterwave in **test mode**), and vendor shop approvals.

## Features

| Role | Capabilities |
|---|---|
| **Buyer** | Browse/search/filter by category & state, product pages, cart, checkout with Nigerian delivery details, order history |
| **Vendor** | Shop dashboard (products, orders, ₦ revenue), full product CRUD with secure image upload |
| **Admin** | Dashboard stats, vendor approval/suspension, order status management |

Security: `password_hash`/`password_verify`, PDO prepared statements everywhere, CSRF tokens on every form, session fixation protection, validated image uploads.

## Requirements
- XAMPP / WAMP / LAMP (PHP 8.0+ and MySQL 5.7+ or MariaDB)

## Installation (XAMPP)
1. Copy the `naijamarket` folder into `C:\xampp\htdocs\` (or your web root).
2. Start **Apache** and **MySQL** from the XAMPP control panel.
3. Open **phpMyAdmin** → Import → select `schema.sql` → Go. (Or run `mysql -u root -p < schema.sql`.)
4. Edit `config/db.php` if your MySQL credentials differ (XAMPP defaults: user `root`, empty password).
5. Visit **http://localhost/naijamarket/**

## Demo Logins (seeded in schema.sql)
| Role | Email | Password |
|---|---|---|
| Admin | admin@naijamarket.ng | Admin@123 |
| Vendor | lagoon@naijamarket.ng | Vendor@123 |
| Vendor | kano@naijamarket.ng | Vendor@123 |
| Buyer | buyer@naijamarket.ng | Buyer@123 |

## Payments — TEST MODE ⚠️
`checkout.php` uses a clearly-marked **payment stub** — no real money is charged. For production, integrate Paystack or Flutterwave:
1. Create an account at paystack.com or flutterwave.com and get your API keys.
2. In `checkout.php`, replace the stub with: initialize transaction → redirect to gateway → verify via webhook with your secret key.
3. Mark orders "paid" only after server-side verification. Never expose secret keys client-side.

## Project Structure
```
naijamarket/
├── admin/index.php        Admin dashboard (vendors + orders)
├── assets/css/style.css   Custom styles (Bootstrap 5 via CDN)
├── config/config.php      Site settings
├── config/db.php          PDO connection (edit credentials here)
├── includes/              header, footer, helper functions
├── uploads/products/      Product images (auto-created)
├── vendor/                Vendor Hub (dashboard, product CRUD)
├── schema.sql             Database schema + seed data
├── index.php              Homepage (categories + latest products)
├── search.php             Search & filters
├── product.php            Product detail + add to cart
├── cart.php               Shopping cart
├── checkout.php           Checkout + payment stub
├── order-success.php      Order confirmation
├── my-orders.php          Buyer order history
├── login.php / register.php / logout.php
```
