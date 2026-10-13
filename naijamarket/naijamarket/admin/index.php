<?php
/**
 * ADMIN PANEL - Dashboard, vendor approvals, order management
 */
require_once __DIR__ . '/../config/config.php';
$page_title = 'Admin Panel';
require_role('admin');

$pdo = db();

/* ---- Actions: approve/suspend vendor, update order status ---- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_guard();
    $action = $_POST['action'] ?? '';

    if ($action === 'vendor_status') {
        $status = in_array($_POST['status'] ?? '', ['approved', 'pending', 'suspended'], true) ? $_POST['status'] : 'pending';
        $stmt = $pdo->prepare('UPDATE vendors SET status = ? WHERE id = ?');
        $stmt->execute([$status, (int)$_POST['id']]);
        flash('success', 'Vendor status updated to "' . $status . '".');
        redirect('index.php');
    }
    if ($action === 'order_status') {
        $status = in_array($_POST['status'] ?? '', ['pending','processing','shipped','delivered','cancelled'], true) ? $_POST['status'] : 'pending';
        $stmt = $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?');
        $stmt->execute([$status, (int)$_POST['id']]);
        flash('success', 'Order status updated.');
        redirect('index.php');
    }
}

/* ---- Stats ---- */
$stats = [];
foreach ([
    'users'    => 'SELECT COUNT(*) FROM users WHERE role = "buyer"',
    'vendors'  => 'SELECT COUNT(*) FROM vendors',
    'products' => 'SELECT COUNT(*) FROM products WHERE is_active = 1',
    'orders'   => 'SELECT COUNT(*) FROM orders',
] as $k => $sql) {
    $stats[$k] = (int)$pdo->query($sql)->fetchColumn();
}
$revenue = (float)$pdo->query('SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status = "paid"')->fetchColumn();

$vendors = $pdo->query('SELECT v.*, u.name AS owner, u.email, u.phone FROM vendors v JOIN users u ON u.id = v.user_id ORDER BY v.created_at DESC')->fetchAll();
$orders  = $pdo->query('SELECT o.*, u.name AS buyer FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 25')->fetchAll();
include __DIR__ . '/../includes/header.php';
?>
<h1 class="h3 fw-bold mb-4"><i class="bi bi-shield-lock"></i> Admin Panel</h1>

<div class="row g-3 mb-4">
    <?php foreach ([
        ['bi-people', $stats['users'], 'Buyers'],
        ['bi-shop', $stats['vendors'], 'Vendors'],
        ['bi-box-seam', $stats['products'], 'Active Products'],
        ['bi-receipt', $stats['orders'], 'Orders'],
        ['bi-cash-coin', format_naira($revenue), 'Paid Revenue'],
    ] as [$icon, $val, $label]): ?>
        <div class="col-6 col-md"><div class="card text-center p-3 shadow-sm">
            <i class="bi <?= e($icon) ?> fs-3 text-success"></i>
            <div class="fs-5 fw-bold"><?= e((string)$val) ?></div>
            <div class="text-muted small"><?= e($label) ?></div>
        </div></div>
    <?php endforeach; ?>
</div>

<div class="card shadow-sm mb-4">
    <div class="card-header fw-bold"><i class="bi bi-shop"></i> Vendor Approvals &amp; Management</div>
    <div class="table-responsive">
        <table class="table table-hover mb-0 align-middle">
            <thead><tr><th>Shop</th><th>Owner</th><th>State</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
            <?php foreach ($vendors as $v): ?>
                <tr>
                    <td><strong><?= e($v['shop_name']) ?></strong><br><span class="small text-muted"><?= e($v['owner']) ?> • <?= e($v['email']) ?></span></td>
                    <td><?= e($v['state']) ?></td>
                    <td><?= $v['status'] === 'approved' ? '<span class="badge bg-success">approved</span>'
                          : ($v['status'] === 'pending' ? '<span class="badge bg-warning text-dark">pending</span>' : '<span class="badge bg-danger">suspended</span>') ?></td>
                    <td>
                        <form method="post" class="d-flex gap-1">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="vendor_status">
                            <input type="hidden" name="id" value="<?= (int)$v['id'] ?>">
                            <select class="form-select form-select-sm" name="status">
                                <?php foreach (['approved','pending','suspended'] as $s): ?>
                                    <option <?= $v['status'] === $s ? 'selected' : '' ?>><?= $s ?></option>
                                <?php endforeach; ?>
                            </select>
                            <button class="btn btn-sm btn-success">Save</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<div class="card shadow-sm">
    <div class="card-header fw-bold"><i class="bi bi-receipt"></i> Recent Orders (latest 25)</div>
    <div class="table-responsive">
        <table class="table table-hover mb-0 align-middle">
            <thead><tr><th>Ref</th><th>Buyer</th><th>Total</th><th>Payment</th><th>Delivery</th><th>Status</th></tr></thead>
            <tbody>
            <?php foreach ($orders as $o): ?>
                <tr>
                    <td><?= e($o['order_ref']) ?><br><span class="small text-muted"><?= date('d M', strtotime($o['created_at'])) ?></span></td>
                    <td><?= e($o['buyer']) ?></td>
                    <td><?= format_naira($o['total_amount']) ?></td>
                    <td><span class="badge badge-status-<?= e($o['payment_status']) ?>"><?= e($o['payment_status']) ?></span></td>
                    <td class="small"><?= e($o['delivery_state']) ?></td>
                    <td>
                        <form method="post" class="d-flex gap-1">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="order_status">
                            <input type="hidden" name="id" value="<?= (int)$o['id'] ?>">
                            <select class="form-select form-select-sm" name="status">
                                <?php foreach (['pending','processing','shipped','delivered','cancelled'] as $s): ?>
                                    <option <?= $o['status'] === $s ? 'selected' : '' ?>><?= $s ?></option>
                                <?php endforeach; ?>
                            </select>
                            <button class="btn btn-sm btn-outline-success">Set</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php include __DIR__ . '/../includes/footer.php'; ?>
