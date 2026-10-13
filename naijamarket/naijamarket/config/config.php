<?php
/**
 * NaijaMarket - Site Configuration
 * Digital Marketplace Platform for Small Businesses in Nigeria
 * PHP + MySQL
 */

// ---- Site settings ----
define('SITE_NAME', 'NaijaMarket');
define('SITE_TAGLINE', 'Buy & Sell - Powered by Nigerian Small Businesses');
define('CURRENCY', '₦');

// ---- Uploads ----
define('UPLOAD_DIR', __DIR__ . '/../uploads/products/');
define('UPLOAD_MAX_SIZE', 3 * 1024 * 1024); // 3 MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// ---- Error reporting (turn OFF display_errors in production) ----
define('ENVIRONMENT', 'development'); // 'production' or 'development'
if (ENVIRONMENT === 'development') {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

// ---- Session ----
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/../includes/functions.php';
