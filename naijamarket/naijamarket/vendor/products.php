<?php
/**
 * VENDOR HUB - Product CRUD (add / edit / toggle / delete)
 */
require_once __DIR__ . '/../config/config.php';
$page_title = 'Manage Products';
require_role('vendor');

$pdo = db();
$vendor = current_vendor($pdo);
if (!$vendor || $vendor['status'] !== 'approved') {
    flash('warning', 'Your shop must be approved before managing products.');
    redirect('../index.php');
}

/* ---- Actions ---- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_guard();
    $action = $_POST['action'] ?? '';

    if ($action === 'delete') {
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ? AND vendor_id = ?');
        $stmt->execute([(int)$_POST['id'], $vendor['id']]);
        flash('success', 'Product deleted.');
        redirect('products.php');
    }

    if ($action === 'toggle') {
        $stmt = $pdo->prepare('UPDATE products SET is_active = 1 - is_active WHERE id = ? AND vendor_id = ?');
        $stmt->execute([(int)$_POST['id'], $vendor['id']]);
        redirect('products.php');
    }

    if ($action === 'save') {
        $name    = trim($_POST['name'] ?? '');
        $desc    = trim($_POST['description'] ?? '');
        $price   = (float)($_POST['price'] ?? 0);
        $stock   = max(0, (int)($_POST['stock'] ?? 0));
        $catId   = (int)($_POST['category_id'] ?? 0) ?: null;
        $id      = (int)($_POST['id'] ?? 0);

        $errors = [];
        if ($name === '') $errors[] = 'Product name is required.';
        if ($price <= 0)  $errors[] = 'Price must be greater than zero.';

        $image = null;
        if (!empty($_FILES['image']['name'])) {
            $image = handle_product_image_upload($_FILES['image']);
            if (!$image) $errors[] = 'Image upload failed (use JPG/PNG/WEBP under 3 MB).';
        }

        if (!$errors) {
            if ($id) {
                $sql = 'UPDATE products SET name = ?, slug = ?, description = ?, price = ?, stock = ?, category_id = ?';
                $params = [$name, slugify($name) . '-' . $id, $desc, $price, $stock, $catId];
                if ($image) { $sql .= ', image = ?'; $params[] = $image; }
                $sql .= ' WHERE id = ? AND vendor_id = ?';
                $params[] = $id; $params[] = $vendor['id'];
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                flash('success', 'Product updated.');
            } else {
                $stmt = $pdo->prepare('INSERT INTO products (vendor_id, category_id, name, slug, description, price, stock, image)
                                       VALUES (?,?,?,?,?,?,?,?)');
                $stmt->execute([$vendor['id'], $catId, $name, slugify($name) . '-' . time(), $desc, $price, $stock, $image]);
                flash('success', 'Product added.');
            }
            redirect('products.php');
        }
        foreach ($errors as $err) flash('danger', $err);
    }
}

/* ---- List + edit target ---- */
$stmt = $pdo->prepare('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id
                       WHERE p.vendor_id = ? ORDER BY p.created_at DESC');
$stmt->execute([$vendor['id']]);
$products = $stmt->fetchAll();

$edit = null;
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ? AND vendor_id = ?');
    $stmt->execute([(int)$_GET['edit'], $vendor['id']]);
    $edit = $stmt->fetch() ?: null;
}
$categories = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();
include __DIR__ . '/../includes/header.php';
?>
<h1 class="h3 fw-bold mb-4">Manage Products</h1>
<div class="row g-4">
    <div class="col-lg-4">
        <form method="post" enctype="multipart/form-data" class="card p-4 shadow-sm">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="save">
            <input type="hidden" name="id" value="<?= (int)($edit['id'] ?? 0) ?>">
            <h5><?= $edit ? 'Edit Product' : 'Add New Product' ?></h5>
            <div class="mb-3"><label class="form-label">Product name *</label>
                <input class="form-control" name="name" required maxlength="180" value="<?= e($edit['name'] ?? '') ?>"></div>
            <div class="mb-3"><label class="form-label">Category</label>
                <select class="form-select" name="category_id">
                    <option value="">-- None --</option>
                    <?php foreach ($categories as $c): ?>
                        <option value="<?= (int)$c['id'] ?>" <?= ($edit['category_id'] ?? null) == $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
                    <?php endforeach; ?>
                </select></div>
            <div class="mb-3"><label class="form-label">Description</label>
                <textarea class="form-control" name="description" rows="4"><?= e($edit['description'] ?? '') ?></textarea></div>
            <div class="row">
                <div class="col-6 mb-3"><label class="form-label">Price (₦) *</label>
                    <input type="number" step="0.01" min="0" class="form-control" name="price" required value="<?= e($edit['price'] ?? '') ?>"></div>
                <div class="col-6 mb-3"><label class="form-label">Stock *</label>
                    <input type="number" min="0" class="form-control" name="stock" required value="<?= e($edit['stock'] ?? '10') ?>"></div>
            </div>
            <div class="mb-3"><label class="form-label">Product image (JPG/PNG/WEBP, max 3MB)</label>
                <input type="file" class="form-control" name="image" accept="image/*">
                <?php if (!empty($edit['image'])): ?>
                    <img src="../uploads/products/<?= e($edit['image']) ?>" class="mt-2 rounded" width="80" height="80" style="object-fit:cover">
                <?php endif; ?></div>
            <button class="btn btn-success w-100"><?= $edit ? 'Update Product' : 'Add Product' ?></button>
            <?php if ($edit): ?><a href="products.php" class="btn btn-outline-secondary w-100 mt-2">Cancel Edit</a><?php endif; ?>
        </form>
    </div>
    <div class="col-lg-8">
        <div class="table-responsive card shadow-sm p-2">
            <table class="table table-hover align-middle mb-0">
                <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                <?php if (!$products) echo '<tr><td colspan="5" class="text-muted">No products yet. Add your first product on the left.</td></tr>';
                foreach ($products as $p): ?>
                    <tr>
                        <td>
                            <img src="../uploads/products/<?= e($p['image'] ?: 'placeholder.svg') ?>" width="40" height="40" class="rounded me-2" style="object-fit:cover">
                            <?= e($p['name']) ?>
                        </td>
                        <td><?= format_naira($p['price']) ?></td>
                        <td><?= (int)$p['stock'] ?></td>
                        <td><?= $p['is_active'] ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Hidden</span>' ?></td>
                        <td class="text-nowrap">
                            <a class="btn btn-sm btn-outline-primary" href="products.php?edit=<?= (int)$p['id'] ?>"><i class="bi bi-pencil"></i></a>
                            <form method="post" class="d-inline" onsubmit="return confirm('Delete this product?')">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="toggle">
                                <input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
                                <button class="btn btn-sm btn-outline-secondary" title="Show/Hide"><i class="bi bi-eye"></i></button>
                            </form>
                            <form method="post" class="d-inline" onsubmit="return confirm('Delete this product permanently?')">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
                                <button class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php include __DIR__ . '/../includes/footer.php'; ?>
