<?php
require_once __DIR__ . '/../config/config.php';
$page_title = $page_title ?? SITE_NAME;
$is_admin_section  = str_contains($_SERVER['PHP_SELF'] ?? '', '/admin/');
$is_vendor_section = str_contains($_SERVER['PHP_SELF'] ?? '', '/vendor/');
$base = ($is_admin_section || $is_vendor_section) ? '..' : '.';
$user = current_user();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($page_title) ?> | <?= e(SITE_NAME) ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="<?= $base ?>/assets/css/style.css">
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark bg-success sticky-top">
    <div class="container">
        <a class="navbar-brand fw-bold" href="<?= $base ?>/index.php">
            <i class="bi bi-shop"></i> <?= e(SITE_NAME) ?>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
            <form class="d-flex mx-lg-3 my-2 my-lg-0 flex-grow-1" action="<?= $base ?>/search.php" method="get" role="search">
                <input class="form-control me-2" type="search" name="q" placeholder="Search products, e.g. ankara, phones..."
                       value="<?= e($_GET['q'] ?? '') ?>" aria-label="Search">
                <button class="btn btn-light" type="submit"><i class="bi bi-search"></i></button>
            </form>
            <ul class="navbar-nav ms-auto align-items-lg-center">
                <li class="nav-item"><a class="nav-link" href="<?= $base ?>/index.php">Home</a></li>
                <li class="nav-item"><a class="nav-link" href="<?= $base ?>/search.php">Browse</a></li>
                <?php if ($user): ?>
                    <?php if ($user['role'] === 'buyer'): ?>
                        <li class="nav-item"><a class="nav-link" href="<?= $base ?>/my-orders.php">My Orders</a></li>
                    <?php elseif ($user['role'] === 'vendor'): ?>
                        <li class="nav-item"><a class="nav-link" href="<?= $base ?>/vendor/index.php">Vendor Hub</a></li>
                    <?php elseif ($user['role'] === 'admin'): ?>
                        <li class="nav-item"><a class="nav-link" href="<?= $base ?>/admin/index.php">Admin</a></li>
                    <?php endif; ?>
                    <li class="nav-item">
                        <a class="nav-link" href="<?= $base ?>/cart.php">
                            <i class="bi bi-cart3"></i> Cart
                            <span class="badge rounded-pill bg-warning text-dark"><?= cart_count(db()) ?></span>
                        </a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                            <i class="bi bi-person-circle"></i> <?= e($user['name']) ?>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="<?= $base ?>/my-orders.php">My Orders</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="<?= $base ?>/logout.php">Logout</a></li>
                        </ul>
                    </li>
                <?php else: ?>
                    <li class="nav-item"><a class="nav-link" href="<?= $base ?>/login.php">Login</a></li>
                    <li class="nav-item"><a class="btn btn-warning btn-sm ms-lg-2" href="<?= $base ?>/register.php">Become a Seller</a></li>
                <?php endif; ?>
            </ul>
        </div>
    </div>
</nav>
<main class="container py-4">
<?php foreach (get_flashes() as $f): ?>
    <div class="alert alert-<?= e($f['type']) ?> alert-dismissible fade show">
        <?= e($f['message']) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endforeach; ?>
