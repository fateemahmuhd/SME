<?php
require_once __DIR__ . '/config/config.php';
$page_title = 'Checkout';

require_login();

$pdo = db();

$stmt = $pdo->prepare('SELECT ci.quantity, p.id, p.name, p.price, p.stock, p.vendor_id
                       FROM cart_items ci JOIN products p ON p.id = ci.product_id
                       WHERE ci.user_id = ?');
$stmt->execute([$_SESSION['user']['id']]);
$cart = $stmt->fetchAll();
if (!$cart) redirect('cart.php');

$errors = [];
$total = 0;
foreach ($cart as $c) $total += $c['price'] * $c['quantity'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_guard();
    $dState   = $_POST['delivery_state'] ?? '';
    $dAddress = trim($_POST['delivery_address'] ?? '');
    $dPhone   = trim($_POST['delivery_phone'] ?? '');
    $payMethod = $_POST['payment_method'] ?? '';

    if (!in_array($dState, nigerian_states(), true))     $errors[] = 'Select a valid delivery state.';
    if (mb_strlen($dAddress) < 10)                       $errors[] = 'Enter a complete delivery address (min 10 characters).';
    if (!preg_match('/^0[7-9][0-9]{9}$/', $dPhone))      $errors[] = 'Enter a valid Nigerian phone number.';
    if (!in_array($payMethod, ['paystack','flutterwave','bank_transfer','pay_on_delivery'], true))
                                                         $errors[] = 'Select a payment method.';
    foreach ($cart as $c) {
        if ($c['quantity'] > $c['stock']) $errors[] = 'Stock changed for "' . $c['name'] . '". Please review your cart.';
    }

    if (!$errors) {
        $pdo->beginTransaction();
        try {
            $ref = generate_order_ref();
            $stmt = $pdo->prepare('INSERT INTO orders (order_ref, user_id, total_amount, payment_method, payment_status, delivery_state, delivery_address, delivery_phone, status)
                                   VALUES (?,?,?,?, "pending",?,?,?, "pending")');
            $stmt->execute([$ref, $_SESSION['user']['id'], $total, $payMethod, $dState, $dAddress, $dPhone]);
            $orderId = (int)$pdo->lastInsertId();

            $oi = $pdo->prepare('INSERT INTO order_items (order_id, product_id, vendor_id, name, price, quantity) VALUES (?,?,?,?,?,?)');
            $dec = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
            foreach ($cart as $c) {
                $oi->execute([$orderId, $c['id'], $c['vendor_id'], $c['name'], $c['price'], $c['quantity']]);
                $dec->execute([$c['quantity'], $c['id']]);
            }
            $pdo->prepare('DELETE FROM cart_items WHERE user_id = ?')->execute([$_SESSION['user']['id']]);
            $pdo->commit();

            /* ---- PAYMENT GATEWAY STUB (sandbox/test) ----
             * In production, call Paystack/Flutterwave here:
             *   1. POST /transaction/initialize with email + amount (kobo)
             *   2. Redirect user to the returned authorization_url
             *   3. Verify via webhook before marking order "paid"
             * The stub simply marks bank_transfer / pay_on_delivery as
             * pending and simulates card gateways as pending payment. */
            if (payment_gateway_test_mode()) {
                flash('info', 'Order placed! Payment gateway is in TEST MODE - no real charge was made. Order reference: ' . $ref);
            }
            redirect('order-success.php?ref=' . urlencode($ref));
        } catch (Throwable $ex) {
            $pdo->rollBack();
            $errors[] = 'Could not place order. Please try again.';
        }
    }
}
include __DIR__ . '/includes/header.php';
?>
<h1 class="h3 fw-bold mb-4">Checkout</h1>
<?php foreach ($errors as $err): ?><div class="alert alert-danger"><?= e($err) ?></div><?php endforeach; ?>
<div class="row g-4">
    <div class="col-lg-7">
        <form method="post" class="card p-4 shadow-sm">
            <?= csrf_field() ?>
            <h5 class="mb-3">Delivery Details</h5>
            <div class="mb-3"><label class="form-label">Delivery state</label>
                <select class="form-select" name="delivery_state" required>
                    <option value="">-- Select state --</option>
                    <?php foreach (nigerian_states() as $s): ?>
                        <option <?= ($_SESSION['user']['state'] ?? '') === $s ? 'selected' : '' ?>><?= e($s) ?></option>
                    <?php endforeach; ?>
                </select></div>
            <div class="mb-3"><label class="form-label">Delivery address</label>
                <textarea class="form-control" name="delivery_address" rows="2" required placeholder="House no, street, area, LGA..."></textarea></div>
            <div class="mb-3"><label class="form-label">Phone</label>
                <input class="form-control" name="delivery_phone" value="<?= e($_SESSION['user']['email'] ? '' : '') ?>" placeholder="08012345678" required></div>
            <h5 class="mb-3 mt-4">Payment Method</h5>
            <?php foreach ([
                'paystack'         => 'Pay with Card / Transfer (Paystack)',
                'flutterwave'      => 'Pay with Card / USSD (Flutterwave)',
                'bank_transfer'    => 'Direct Bank Transfer',
                'pay_on_delivery'  => 'Pay on Delivery',
            ] as $key => $label): ?>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="payment_method" value="<?= e($key) ?>" id="pm_<?= e($key) ?>" required>
                    <label class="form-check-label" for="pm_<?= e($key) ?>"><?= e($label) ?></label>
                </div>
            <?php endforeach; ?>
            <p class="text-muted small mt-2"><i class="bi bi-shield-lock"></i> Payment gateways run in <strong>test/sandbox mode</strong> - no real money is charged.</p>
            <button class="btn btn-success btn-lg w-100">Place Order - <?= format_naira($total) ?></button>
        </form>
    </div>
    <div class="col-lg-5">
        <div class="card p-4 shadow-sm">
            <h5>Order Summary</h5>
            <table class="table table-sm">
                <?php foreach ($cart as $c): ?>
                    <tr><td><?= e($c['name']) ?> × <?= (int)$c['quantity'] ?></td>
                        <td class="text-end"><?= format_naira($c['price'] * $c['quantity']) ?></td></tr>
                <?php endforeach; ?>
                <tr class="fw-bold"><td>Total</td><td class="text-end naira-price"><?= format_naira($total) ?></td></tr>
            </table>
        </div>
    </div>
</div>
<?php include __DIR__ . '/includes/footer.php'; ?>
