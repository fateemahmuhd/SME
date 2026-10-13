<?php
/**
 * Shared helper functions: escaping, auth, CSRF, flash messages,
 * Naira formatting, Nigerian states, slugs, image upload.
 */

/* ---------- Output escaping ---------- */
function e(?string $str): string
{
    return htmlspecialchars((string)$str, ENT_QUOTES, 'UTF-8');
}

/* ---------- Naira currency formatting (₦) ---------- */
function format_naira($amount): string
{
    return '₦' . number_format((float)$amount, 2);
}

/* ---------- Redirect ---------- */
function redirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}

/* ---------- Flash messages ---------- */
function flash(string $type, string $message): void
{
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

function get_flashes(): array
{
    $f = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $f;
}

/* ---------- CSRF protection ---------- */
function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . csrf_token() . '">';
}

function csrf_check(): bool
{
    $sent = $_POST['csrf_token'] ?? '';
    return is_string($sent) && !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $sent);
}

function csrf_guard(): void
{
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !csrf_check()) {
        http_response_code(419);
        die('Invalid or expired form token. Please go back and try again.');
    }
}

/* ---------- Authentication (password_hash / password_verify) ---------- */
function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function is_logged_in(): bool
{
    return isset($_SESSION['user']);
}

function require_login(): void
{
    if (!is_logged_in()) {
        flash('warning', 'Please log in to continue.');
        redirect('../login.php');
    }
}

function require_role(string ...$roles): void
{
    require_login();
    if (!in_array($_SESSION['user']['role'], $roles, true)) {
        http_response_code(403);
        die('403 - You are not authorised to view this page.');
    }
}

/* ---------- Slug generator ---------- */
function slugify(string $text): string
{
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-') ?: 'item';
}

/* ---------- Nigerian states (36 states + FCT) ---------- */
function nigerian_states(): array
{
    return [
        'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
        'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
        'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
        'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
        'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
    ];
}

/* ---------- Secure product image upload ---------- */
function handle_product_image_upload(array $file): ?string
{
    if (!isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    if ($file['size'] > UPLOAD_MAX_SIZE) {
        flash('danger', 'Image is too large. Maximum size is 3 MB.');
        return null;
    }
    if (!in_array(mime_content_type($file['tmp_name']), ALLOWED_IMAGE_TYPES, true)) {
        flash('danger', 'Invalid image type. Only JPG, PNG, WEBP or GIF allowed.');
        return null;
    }
    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0775, true);
    }
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $ext = in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true) ? $ext : 'jpg';
    $name = 'prod_' . bin2hex(random_bytes(8)) . '.' . $ext;
    if (move_uploaded_file($file['tmp_name'], UPLOAD_DIR . $name)) {
        return $name;
    }
    return null;
}

/* ---------- Current vendor record ---------- */
function current_vendor(PDO $pdo): ?array
{
    if (!is_logged_in() || $_SESSION['user']['role'] !== 'vendor') {
        return null;
    }
    static $vendor = false;
    if ($vendor === false) {
        $stmt = $pdo->prepare('SELECT * FROM vendors WHERE user_id = ?');
        $stmt->execute([$_SESSION['user']['id']]);
        $vendor = $stmt->fetch() ?: null;
    }
    return $vendor;
}

/* ---------- Cart helpers ---------- */
function cart_count(PDO $pdo): int
{
    if (!is_logged_in()) return 0;
    $stmt = $pdo->prepare('SELECT COALESCE(SUM(quantity),0) AS c FROM cart_items WHERE user_id = ?');
    $stmt->execute([$_SESSION['user']['id']]);
    return (int)$stmt->fetchColumn();
}

/* ---------- Order reference ---------- */
function generate_order_ref(): string
{
    return 'NM-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
}

/* ============================================================
 * PAYMENT GATEWAY - PAYSTACK / FLUTTERWAVE (SANDBOX / TEST ONLY)
 * ------------------------------------------------------------
 * This is a STUB implementation for testing/demo purposes.
 * It does NOT charge any real money. For production:
 *   1. Sign up at https://paystack.com or https://flutterwave.com
 *   2. Replace STUB logic in checkout.php with their PHP SDK or
 *      HTTP API (initialize transaction -> redirect -> verify via
 *      webhook with your SECRET KEY).
 *   3. Never expose your secret key in client-side code.
 * ============================================================ */
function payment_gateway_test_mode(): bool
{
    return true; // MUST be false in production with real API keys
}
