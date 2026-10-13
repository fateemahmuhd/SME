<?php
/**
 * VENDOR HUB - Dashboard
 */
require_once __DIR__ . '/../config/config.php';
$page_title = 'Vendor Hub';
require_role('vendor');

$pdo = db();
$vendor = current_vendor($pdo);
if (!$vendor) {
    include __DIR__ . '/../includes/header.php';
    echo '<div class="alert alert-warning">Your vendor profile is missing. Please contact support at admin@naijamarket.ng</div>';
    include __DIR__ . '/../includes/footer.php';
    exit;
}
if ($vendor['status'] !== 'approved') {
    include __DIR__ . '/../includes/header.php';
    echo '<div class="alert alert-warning"><h4 class="alert-heading">Shop pending approval</h4>
          Your shop <strong>' . e($vendor['shop_name']) . '</strong> is awaiting admin approval.
          You will be able to list products once approved.</div>';
    include __DIR__ . '/../includes/footer.php';
    exit;
}

$stats = $pdo->prepare('SELECT COUNT(*) AS products FROM products WHERE vendor_id = ?');
$stats->execute([$vendor['id']]);
$productCount = (int)$stats->fetchColumn();

$stmt = $pdo->prepare('SELECT COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(oi.price * oi.quantity),0) AS revenue
                       FROM order_items oi JOIN orders o ON o.id = oi.order_id
                       WHERE oi.vendor_id = ?');
$stmt->execute([$vendor['id']]);
$sales = $stmt->fetch() ?: ['orders' => 0, 'revenue' => 0];

include __DIR__ . '/../includes/header.php';
?>
<div class="d-flex justify-content-between align-items-center mb-4">
    <h1 class="h3 fw-bold mb-0">Vendor Hub - <?= e($vendor['shop_name']) ?></h1>
    <a href="products.php" class="btn btn-success"><i class="bi bi-box-seam"></i> Manage Products</a>
</div>
<div class="row g-4 mb-4">
    <div class="col-md-4"><div class="card text-center p-4 shadow-sm">
        <i class="bi bi-box fs-1 text-success"></i>
        <div class="fs-2 fw-bold"><?= $productCount ?></div>
        <div class="text-muted">Products Listed</div>
    </div></div>
    <div class="col-md-4"><div class="card text-center p-4 shadow-sm">
        <i class="bi bi-receipt fs-1 text-primary"></i>
        <div class="fs-2 fw-bold"><?= (int)$sales['orders'] ?></div>
        <div class="text-muted">Orders Received</div>
    </div></div>
    <div class="col-md-4"><div class="card text-center p-4 shadow-sm">
        <i class="bi bi-cash-coin fs-1 text-warning"></i>
        <div class="fs-2 fw-bold"><?= format_naira($sales['revenue']) ?></div>
        <div class="text-muted">Sales Value (₦)</div>
    </div></div>
</div>

<div class="card shadow-sm">
    <div class="card-header fw-bold">Recent Orders for Your Shop</div>
    <div class="table-responsive">
        <table class="table table-striped mb-0">
            <thead><tr><th>Order</th><th>Product</th><th>Qty</th><th>Amount</th><th>Order Status</th></tr></thead>
            <tbody>
            <?php
            $stmt = $pdo->prepare('SELECT o.order_ref, o.status, oi.name, oi.quantity, oi.price
                                   FROM order_items oi JOIN orders o ON o.id = oi.order_id
                                   WHERE oi.vendor_id = ? ORDER BY o.created_at DESC LIMIT 10');
            $stmt->execute([$vendor['id']]);
            $recent = $stmt->fetchAll();
            if (!$recent) echo '<tr><td colspan="5" class="text-muted">No orders yet.</td></tr>';
            foreach ($recent as $r): ?>
                <tr>
                    <td><?= e($r['order_ref']) ?></td>
                    <td><?= e($r['name']) ?></td>
                    <td><?= (int)$r['quantity'] ?></td>
                    <td><?= format_naira($r['price'] * $r['quantity']) ?></td>
                    <td><span class="badge badge-status-<?= e($r['status']) ?>"><?= e($r['status']) ?></span></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php include __DIR__ . '/../includes/footer.php'; ?>
