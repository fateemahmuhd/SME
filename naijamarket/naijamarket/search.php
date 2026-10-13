<?php
require_once __DIR__ . '/config/config.php';
$page_title = 'Browse Products';

$q        = trim($_GET['q'] ?? '');
$category = $_GET['category'] ?? '';
$state    = $_GET['state'] ?? '';

$sql = 'SELECT p.*, v.shop_name, v.state AS vendor_state, c.name AS category_name, c.slug AS category_slug
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = 1 AND v.status = "approved"';
$params = [];

if ($q !== '') {
    $sql .= ' AND (p.name LIKE ? OR p.description LIKE ?)';
    $params[] = "%$q%"; $params[] = "%$q%";
}
if ($category !== '') {
    $sql .= ' AND c.slug = ?';
    $params[] = $category;
}
if ($state !== '') {
    $sql .= ' AND v.state = ?';
    $params[] = $state;
}
$sql .= ' ORDER BY p.created_at DESC LIMIT 60';

$stmt = db()->prepare($sql);
$stmt->execute($params);
$results = $stmt->fetchAll();

$categories = db()->query('SELECT name, slug FROM categories ORDER BY name')->fetchAll();
include __DIR__ . '/includes/header.php';
?>
<h1 class="h3 fw-bold mb-1">Browse Marketplace</h1>
<p class="text-muted">Showing <?= count($results) ?> product(s)<?= $q !== '' ? ' for "' . e($q) . '"' : '' ?></p>

<form class="row g-2 mb-4" method="get">
    <div class="col-md-4">
        <input class="form-control" name="q" placeholder="Search products..." value="<?= e($q) ?>">
    </div>
    <div class="col-md-3">
        <select class="form-select" name="category">
            <option value="">All categories</option>
            <?php foreach ($categories as $c): ?>
                <option value="<?= e($c['slug']) ?>" <?= $category === $c['slug'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div class="col-md-3">
        <select class="form-select" name="state">
            <option value="">All states</option>
            <?php foreach (nigerian_states() as $s): ?>
                <option <?= $state === $s ? 'selected' : '' ?>><?= e($s) ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div class="col-md-2 d-grid"><button class="btn btn-success">Filter</button></div>
</form>

<div class="row g-4">
    <?php foreach ($results as $p): ?>
        <div class="col-6 col-md-4 col-lg-3">
            <div class="card product-card">
                <img src="uploads/products/<?= e($p['image'] ?: 'placeholder.svg') ?>" class="card-img-top" alt="<?= e($p['name']) ?>">
                <div class="card-body d-flex flex-column">
                    <span class="badge bg-success-subtle text-success align-self-start mb-1"><?= e($p['category_name'] ?? 'General') ?></span>
                    <h6 class="card-title"><?= e($p['name']) ?></h6>
                    <p class="small text-muted mb-1"><i class="bi bi-geo-alt"></i> <?= e($p['vendor_state']) ?> • <?= e($p['shop_name']) ?></p>
                    <div class="naira-price mb-2"><?= format_naira($p['price']) ?></div>
                    <a href="product.php?slug=<?= e($p['slug']) ?>" class="btn btn-success btn-sm mt-auto">View Details</a>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
    <?php if (!$results): ?>
        <div class="col-12"><div class="alert alert-info">No products matched your search. Try different keywords or filters.</div></div>
    <?php endif; ?>
</div>
<?php include __DIR__ . '/includes/footer.php'; ?>
