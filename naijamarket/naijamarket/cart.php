<?php
require_once __DIR__ . '/config/config.php';
$page_title = 'Shopping Cart';

require_login();

$pdo = db();

/* Update quantities / remove items */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_guard();
    $action = $_POST['action'] ?? '';
    $itemId = (int)($_POST['item_id'] ?? 0);

    $stmt = $pdo->prepare('SELECT ci.*, p.stock, p.price FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.id = ? AND ci.user_id = ?');
    $stmt->execute([$itemId, $_SESSION['user']['id']]);
    $item = $stmt->fetch();

    if ($item && $action === 'update') {
        $qty = max(1, min((int)$item['stock'], (int)($_POST['quantity'] ?? 1)));
        $stmt = $pdo->prepare('UPDATE cart_items SET quantity = ? WHERE id = ?');
        $stmt->execute([$qty, $itemId]);
    } elseif ($item && $action === 'remove') {
        $stmt = $pdo->prepare('DELETE FROM cart_items WHERE id = ?');
        $stmt->execute([$itemId]);
    }
    redirect('cart.php');
}

$stmt = $pdo->prepare('SELECT ci.id, ci.quantity, p.id AS product_id, p.name, p.slug, p.price, p.stock, p.image, v.shop_name
                       FROM cart_items ci
                       JOIN products p ON p.id = ci.product_id
                       JOIN vendors v ON v.id = p.vendor_id
                       WHERE ci.user_id = ?
                       ORDER BY ci.id DESC');
$stmt->execute([$_SESSION['user']['id']]);
$cart = $stmt->fetchAll();

$total = 0;
foreach ($cart as $c) $total += $c['price'] * $c['quantity'];
include __DIR__ . '/includes/header.php';
?>
<h1 class="h3 fw-bold mb-4"><i class="bi bi-cart3"></i> Your Cart</h1>
<?php if (!$cart): ?>
    <div class="alert alert-info">Your cart is empty. <a href="search.php">Browse products</a></div>
<?php else: ?>
    <div class="table-responsive">
        <table class="table align-middle bg-white shadow-sm">
            <thead class="table-success">
                <tr><th>Product</th><th>Shop</th><th>Price</th><th style="width:130px">Qty</th><th>Subtotal</th><th></th></tr>
            </thead>
            <tbody>
            <?php foreach ($cart as $c): $sub = $c['price'] * $c['quantity']; $total += 0; ?>
                <tr>
                    <td><img src="uploads/products/<?= e($c['image'] ?: 'placeholder.svg') ?>" width="48" height="48" class="rounded me-2" style="object-fit:cover"><?= e($c['name']) ?></td>
                    <td><?= e($c['shop_name']) ?></td>
                    <td><?= format_naira($c['price']) ?></td>
                    <td>
                        <form method="post" class="d-flex gap-1">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="update">
                            <input type="hidden" name="item_id" value="<?= (int)$c['id'] ?>">
                            <input type="number" class="form-control form-control-sm" name="quantity" min="1" max="<?= (int)$c['stock'] ?>" value="<?= (int)$c['quantity'] ?>">
                            <button class="btn btn-sm btn-outline-success">Save</button>
                        </form>
                    </td>
                    <td class="naira-price"><?= format_naira($sub) ?></td>
                    <td>
                        <form method="post">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="remove">
                            <input type="hidden" name="item_id" value="<?= (int)$c['id'] ?>">
                            <button class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
            <tfoot>
                <tr class="fw-bold">
                    <td colspan="4" class="text-end">Total</td>
                    <td class="naira-price fs-5"><?= format_naira($total) ?></td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    </div>
    <div class="d-flex justify-content-end gap-2">
        <a href="search.php" class="btn btn-outline-success">Continue Shopping</a>
        <a href="checkout.php" class="btn btn-success btn-lg">Proceed to Checkout <i class="bi bi-arrow-right"></i></a>
    </div>
<?php endif; ?>
<?php include __DIR__ . '/includes/footer.php'; ?>
