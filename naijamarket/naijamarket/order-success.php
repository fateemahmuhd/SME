<?php
require_once __DIR__ . '/config/config.php';
$page_title = 'Order Confirmed';

require_login();

$ref = $_GET['ref'] ?? '';
$stmt = db()->prepare('SELECT * FROM orders WHERE order_ref = ? AND user_id = ?');
$stmt->execute([$ref, $_SESSION['user']['id']]);
$order = $stmt->fetch();

if (!$order) {
    include __DIR__ . '/includes/header.php';
    echo '<div class="alert alert-danger">Order not found.</div>';
    include __DIR__ . '/includes/footer.php';
    exit;
}
include __DIR__ . '/includes/header.php';
?>
<div class="text-center py-5">
    <i class="bi bi-check-circle-fill text-success" style="font-size:4rem"></i>
    <h1 class="h3 fw-bold mt-3">Thank you! Your order has been placed.</h1>
    <p class="lead">Order reference: <strong><?= e($order['order_ref']) ?></strong></p>
    <p>Payment method: <?= e(ucfirst(str_replace('_', ' ', $order['payment_method']))) ?> •
       Status: <span class="badge bg-warning text-dark"><?= e($order['payment_status']) ?></span></p>
    <p class="text-muted">The vendor(s) have been notified. You can track progress under "My Orders".</p>
    <a href="my-orders.php" class="btn btn-success btn-lg">View My Orders</a>
</div>
<?php include __DIR__ . '/includes/footer.php'; ?>
