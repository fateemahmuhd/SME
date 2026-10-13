<?php
require_once __DIR__ . '/config/config.php';
$page_title = 'My Orders';

require_login();

$pdo = db();
$stmt = $pdo->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
$stmt->execute([$_SESSION['user']['id']]);
$orders = $stmt->fetchAll();

$stmt = $pdo->prepare('SELECT oi.*, p.image FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
                       WHERE oi.order_id = ?');
include __DIR__ . '/includes/header.php';
?>
<h1 class="h3 fw-bold mb-4">My Orders</h1>
<?php if (!$orders): ?>
    <div class="alert alert-info">No orders yet. <a href="search.php">Start shopping</a></div>
<?php endif; ?>
<?php foreach ($orders as $o):
    $stmt->execute([$o['id']]);
    $items = $stmt->fetchAll(); ?>
    <div class="card mb-3 shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
                <strong><?= e($o['order_ref']) ?></strong>
                <span class="text-muted small ms-2"><?= date('d M Y, h:i A', strtotime($o['created_at'])) ?></span>
            </div>
            <div>
                <span class="badge badge-status-<?= e($o['status']) ?>"><?= e($o['status']) ?></span>
                <span class="badge badge-status-<?= e($o['payment_status']) ?>"><?= e($o['payment_status']) ?></span>
                <strong class="naira-price ms-2"><?= format_naira($o['total_amount']) ?></strong>
            </div>
        </div>
        <div class="card-body">
            <?php foreach ($items as $it): ?>
                <div class="d-flex justify-content-between border-bottom py-1">
                    <span><?= e($it['name']) ?> × <?= (int)$it['quantity'] ?></span>
                    <span><?= format_naira($it['price'] * $it['quantity']) ?></span>
                </div>
            <?php endforeach; ?>
            <p class="small text-muted mt-2 mb-0">
                <i class="bi bi-truck"></i> Deliver to: <?= e($o['delivery_address']) ?>, <?= e($o['delivery_state']) ?> (<?= e($o['delivery_phone']) ?>)
                • Pay via <?= e(ucfirst(str_replace('_', ' ', $o['payment_method']))) ?>
            </p>
        </div>
    </div>
<?php endforeach; ?>
<?php include __DIR__ . '/includes/footer.php'; ?>
