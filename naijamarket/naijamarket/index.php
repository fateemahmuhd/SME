<?php
require_once __DIR__ . '/config/config.php';
$page_title = 'Home';

$categories = db()->query('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
                            FROM categories c ORDER BY c.name')->fetchAll();

$stmt = db()->query('SELECT p.*, v.shop_name, c.name AS category_name
                     FROM products p
                     JOIN vendors v ON v.id = p.vendor_id
                     LEFT JOIN categories c ON c.id = p.category_id
                     WHERE p.is_active = 1 AND v.status = "approved"
                     ORDER BY p.created_at DESC LIMIT 8');
$latest = $stmt->fetchAll();
include __DIR__ . '/includes/header.php';
?>

<section class="hero p-5 mb-5">
    <div class="row align-items-center">
        <div class="col-lg-8">
            <h1 class="fw-bold display-6">Shop from trusted Nigerian small businesses</h1>
            <p class="lead mb-4">Fabrics from Lagos, gadgets from Kano, foodstuff from the East - all in one marketplace. Pay with Paystack, Flutterwave, bank transfer or on delivery.</p>
            <a href="search.php" class="btn btn-warning btn-lg fw-bold me-2">Start Shopping</a>
            <a href="register.php" class="btn btn-outline-light btn-lg">Open Your Shop Free</a>
        </div>
    </div>
</section>

<h2 class="h4 fw-bold mb-3">Shop by Category</h2>
<div class="row g-3 mb-5">
    <?php foreach ($categories as $cat): ?>
        <div class="col-6 col-md-4 col-lg-2">
            <a class="d-block card text-center text-decoration-none h-100" href="search.php?category=<?= e($cat['slug']) ?>">
                <div class="card-body">
                    <i class="bi bi-grid fs-3 text-success"></i>
                    <div class="fw-semibold small mt-1"><?= e($cat['name']) ?></div>
                    <span class="badge bg-light text-dark"><?= (int)$cat['product_count'] ?> items</span>
                </div>
            </a>
        </div>
    <?php endforeach; ?>
</div>

<h2 class="h4 fw-bold mb-3">Latest Products</h2>
<div class="row g-4">
    <?php foreach ($latest as $p): ?>
        <div class="col-6 col-md-4 col-lg-3">
            <div class="card product-card">
                <img src="uploads/products/<?= e($p['image'] ?: 'placeholder.svg') ?>" class="card-img-top" alt="<?= e($p['name']) ?>">
                <div class="card-body d-flex flex-column">
                    <span class="badge bg-success-subtle text-success align-self-start mb-1"><?= e($p['category_name'] ?? 'General') ?></span>
                    <h6 class="card-title"><?= e($p['name']) ?></h6>
                    <p class="small text-muted mb-1"><i class="bi bi-shop"></i> <?= e($p['shop_name']) ?></p>
                    <div class="naira-price mb-2"><?= format_naira($p['price']) ?></div>
                    <a href="product.php?slug=<?= e($p['slug']) ?>" class="btn btn-success btn-sm mt-auto">View Details</a>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
    <?php if (!$latest): ?>
        <p class="text-muted">No products yet. Vendors can log in and add products from the Vendor Hub.</p>
    <?php endif; ?>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
