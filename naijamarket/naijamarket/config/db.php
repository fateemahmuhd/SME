<?php
/**
 * Database connection (PDO) - ALWAYS use prepared statements.
 * Edit the constants below to match your XAMPP / hosting environment.
 */

// ---- Database credentials (XAMPP defaults shown; override via env in Docker) ----
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'naijamarket');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');          // XAMPP default MySQL root password is empty

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            // Never expose raw DB errors to end users
            if (defined('ENVIRONMENT') && ENVIRONMENT === 'development') {
                die('Database connection failed: ' . htmlspecialchars($e->getMessage()));
            }
            die('Database connection failed. Please try again later.');
        }
    }
    return $pdo;
}
