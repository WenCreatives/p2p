<?php
// Simple authentication check for admin pages
// Redirects to main site login if not authenticated

session_start();

// Check if user is logged in via session or localStorage (we'll use a simple session approach)
$isAuthenticated = false;

// Check for admin session
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    $isAuthenticated = true;
}

// If not authenticated, redirect to main site with login modal
if (!$isAuthenticated) {
    // Redirect to main site with a parameter to open login modal
    header('Location: ../index.html?login=1');
    exit();
}
?>
