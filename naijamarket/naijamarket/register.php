<?php
require_once __DIR__ . '/config/config.php';
$page_title = 'Create Account';
csrf_guard();

$states = nigerian_states();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name     = trim($_POST['name'] ?? '');
    $email    = strtolower(trim($_POST['email'] ?? ''));
    $phone    = trim($_POST['phone'] ?? '');
    $state    = $_POST['state'] ?? '';
    $password = $_POST['password'] ?? '';
    $role     = ($_POST['role'] ?? 'buyer') === 'vendor' ? 'vendor' : 'buyer';
    $shopName = trim($_POST['shop_name'] ?? '');

    if ($name === '' || mb_strlen($name) > 120)          $errors[] = 'Enter your full name.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))      $errors[] = 'Enter a valid email address.';
    if (!preg_match('/^0[7-9][0-9]{9}$/', $phone))       $errors[] = 'Enter a valid Nigerian phone number (e.g. 08012345678).';
    if (!in_array($state, $states, true))                $errors[] = 'Select your state.';
    if (strlen($password) < 8)                           $errors[] = 'Password must be at least 8 characters.';
    if ($role === 'vendor' && $shopName === '')          $errors[] = 'Enter your shop / business name.';

    if (!$errors) {
        $pdo = db();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            $errors[] = 'An account with this email already exists.';
        } else {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare('INSERT INTO users (name, email, phone, state, password_hash, role) VALUES (?,?,?,?,?,?)');
                $stmt->execute([$name, $email, $phone, $state, password_hash($password, PASSWORD_DEFAULT), $role]);
                $userId = (int)$pdo->lastInsertId();
                if ($role === 'vendor') {
                    $stmt = $pdo->prepare('INSERT INTO vendors (user_id, shop_name, state, status) VALUES (?,?,?, "pending")');
                    $stmt->execute([$userId, $shopName, $state]);
                }
                $pdo->commit();
                flash('success', $role === 'vendor'
                    ? 'Account created! Your shop is pending admin approval - you will be notified once approved.'
                    : 'Account created successfully! Please log in.');
                redirect('login.php');
            } catch (Throwable $ex) {
                $pdo->rollBack();
                $errors[] = 'Registration failed, please try again.';
            }
        }
    }
}
include __DIR__ . '/includes/header.php';
?>
<h1 class="h3 fw-bold mb-4">Create Your Account</h1>
<div class="row justify-content-center">
    <div class="col-lg-6">
        <?php foreach ($errors as $err): ?>
            <div class="alert alert-danger"><?= e($err) ?></div>
        <?php endforeach; ?>
        <form method="post" class="card p-4 shadow-sm" novalidate>
            <?= csrf_field() ?>
            <div class="mb-3">
                <label class="form-label">Account type</label>
                <select class="form-select" name="role" onchange="document.getElementById('shopWrap').style.display = this.value==='vendor' ? 'block':'none'">
                    <option value="buyer">Buyer - I want to shop</option>
                    <option value="vendor">Vendor - I want to sell</option>
                </select>
            </div>
            <div class="mb-3" id="shopWrap" style="display:none">
                <label class="form-label">Shop / Business name</label>
                <input class="form-control" name="shop_name" maxlength="150" placeholder="e.g. Amaka Fabrics Nig.">
            </div>
            <div class="mb-3"><label class="form-label">Full name</label>
                <input class="form-control" name="name" required maxlength="120"></div>
            <div class="mb-3"><label class="form-label">Email</label>
                <input type="email" class="form-control" name="email" required></div>
            <div class="mb-3"><label class="form-label">Phone</label>
                <input class="form-control" name="phone" placeholder="08012345678" required></div>
            <div class="mb-3"><label class="form-label">State</label>
                <select class="form-select" name="state" required>
                    <option value="">-- Select state --</option>
                    <?php foreach ($states as $s): ?><option><?= e($s) ?></option><?php endforeach; ?>
                </select></div>
            <div class="mb-3"><label class="form-label">Password (min 8 characters)</label>
                <input type="password" class="form-control" name="password" minlength="8" required></div>
            <button class="btn btn-success w-100">Create Account</button>
            <p class="text-center small mt-3 mb-0">Already registered? <a href="login.php">Log in</a></p>
        </form>
    </div>
</div>
<?php include __DIR__ . '/includes/footer.php'; ?>
