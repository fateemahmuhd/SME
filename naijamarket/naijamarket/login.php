<?php
require_once __DIR__ . '/config/config.php';
$page_title = 'Login';
csrf_guard();

if (is_logged_in()) redirect('index.php');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = strtolower(trim($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';

    $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        session_regenerate_id(true); // prevent session fixation
        $_SESSION['user'] = [
            'id'    => (int)$user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ];
        flash('success', 'Welcome back, ' . $user['name'] . '!');
        redirect(match ($user['role']) {
            'admin'  => 'admin/index.php',
            'vendor' => 'vendor/index.php',
            default  => 'index.php',
        });
    }
    flash('danger', 'Invalid email or password.');
}
include __DIR__ . '/includes/header.php';
?>
<h1 class="h3 fw-bold mb-4">Login</h1>
<div class="row justify-content-center">
    <div class="col-md-5">
        <form method="post" class="card p-4 shadow-sm">
            <?= csrf_field() ?>
            <div class="mb-3"><label class="form-label">Email</label>
                <input type="email" class="form-control" name="email" required autofocus></div>
            <div class="mb-3"><label class="form-label">Password</label>
                <input type="password" class="form-control" name="password" required></div>
            <button class="btn btn-success w-100">Login</button>
            <p class="text-center small mt-3 mb-0">New here? <a href="register.php">Create an account</a></p>
        </form>
        <div class="card mt-3 p-3 small bg-light">
            <strong>Demo accounts:</strong><br>
            Admin: admin@naijamarket.ng / Admin@123<br>
            Vendor: lagoon@naijamarket.ng / Vendor@123<br>
            Buyer: buyer@naijamarket.ng / Buyer@123
        </div>
    </div>
</div>
<?php include __DIR__ . '/includes/footer.php'; ?>
