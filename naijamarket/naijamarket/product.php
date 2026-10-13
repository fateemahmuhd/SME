<?php
require_once __DIR__ . '/config/config.php';

$slug = $_GET['slug'] ?? '';
$stmt = db()->prepare('SELECT p.*, v.shop_name, v.state AS vendor_state, v.description AS vendor_desc, c.name AS category_name
                       FROM products p
                       JOIN vendors v ON v.id = p.vendor_id
                       LEFT JOIN categories c ON c.id = p.category_id
                       WHERE p.slug = ? AND p.is_active = 1 AND v.status = "approved"');
$stmt->execute([$slug]);
$product = $stmt->fetch();

if (!$product) {
    http_response_code(404);
    $page_title = 'Product not found';
    include __DIR__ . '/includes/header.php';
    echo '<div class="alert alert-danger">Product not found.</div><a href="search.php" class="btn btn-success">Back to Browse</a>';
    include __DIR__ . '/includes/footer.php';
    exit;
}
$page_title = $product['name'];

/* Add to cart */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'add_to_cart') {
    csrf_guard();
    require_login();
    $qty = max(1, min(99, (int)($_POST['quantity'] ?? 1)));
    if ($qty > (int)$product['stock']) {
        flash('warning', 'Only ' . $product['stock'] . ' unit(s) in stock.');
    } else {
        $stmt = db()->prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?,?,?)
                               ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)');
        $stmt->execute([$_SESSION['user']['id'], $product['id'], $qty]);
        flash('success', 'Added to cart!');
    }
    redirect('product.php?slug=' . urlencode($slug));
}

$inCart = 0;
if (is_logged_in()) {
    $stmt = db()->prepare('SELECT COALESCE(SUM(quantity),0) FROM cart_items WHERE user_id = ? AND product_id = ?');
    $stmt->execute([$_SESSION['user']['id'], $product['id']]);
    $inCart = (int)$stmt->fetchColumn();
}
include __DIR__ . '/includes/header.php';
?>
<div class="row g-5">
    <div class="col-md-5">
        <img src="uploads/products/<?= e($product['image'] ?: 'placeholder.svg') ?>" class="img-fluid rounded shadow-sm w-100" alt="<?= e($product['name']) ?>">
    </div>
    <div class="col-md-7">
        <span class="badge bg-success-subtle text-success mb-2"><?= e($product['category_name'] ?? 'General') ?></span>
        <h1 class="h3 fw-bold"><?= e($product['name']) ?></h1>
        <p class="naira-price fs-3"><?= format_naira($product['price']) ?></p>
        <p><i class="bi bi-shop text-success"></i> Sold by <strong><?= e($product['shop_name']) ?></strong>
            <span class="text-muted">(<?= e($product['vendor_state']) ?>)</span></p>
        <p><i class="bi bi-box-seam"></i> Stock: <?= $product['stock'] > 0 ? e($product['stock']) . ' available' : '<span class="text-danger">Out of stock</span>' ?></p>
        <hr>
        <p><?= nl2br(e($product['description'] ?: 'No description provided.')) ?></p>
        <hr>
        <?php if ($product['stock'] > 0): ?>
            <form method="post" class="row g-2 align-items-center">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="add_to_cart">
                <input type="hidden" name="quantity" value="1">
                <div class="col-auto">
                    <button class="btn btn-success btn-lg" <?= $inCart >= $product['stock'] ? 'disabled' : '' ?>>
                        <i class="bi bi-cart-plus"></i> Add to Cart<?= $inCart ? ' (' . $inCart . ' in cart)' : '' ?>
                    </button>
                </div>
            </form>
        <?php endif; ?>
        <?php if (!is_logged_in()): ?>
            <p class="text-muted small mt-2">You need to <a href="login.php">log in</a> to add items to your cart.</p>
        <?php endif; ?>
    </div>
</div>
<?php include __DIR__ . '/includes/footer.php'; ?>
