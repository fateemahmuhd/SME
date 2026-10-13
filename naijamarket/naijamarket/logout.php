<?php
require_once __DIR__ . '/config/config.php';
session_destroy();
session_start();
flash('success', 'You have been logged out.');
redirect('index.php');
