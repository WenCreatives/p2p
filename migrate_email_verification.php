<?php
/**
 * Migration script to add email verification columns to users table
 * Run this once on your server to add the required columns
 */

require_once 'config/database.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    if (!$pdo) {
        die('Database connection failed');
    }
    
    echo "<h2>Email Verification Migration</h2>";
    echo "<p>Adding email verification columns to users table...</p>";
    
    // Check and add email_verified column
    try {
        $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified'");
        if ($colCheck && !$colCheck->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0");
            echo "<p style='color: green;'>✓ Added email_verified column</p>";
        } else {
            echo "<p style='color: orange;'>→ email_verified column already exists</p>";
        }
    } catch (Exception $e) {
        echo "<p style='color: red;'>✗ Error adding email_verified: " . $e->getMessage() . "</p>";
    }
    
    // Check and add verification_token column
    try {
        $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_token'");
        if ($colCheck && !$colCheck->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN verification_token VARCHAR(64) NULL");
            echo "<p style='color: green;'>✓ Added verification_token column</p>";
        } else {
            echo "<p style='color: orange;'>→ verification_token column already exists</p>";
        }
    } catch (Exception $e) {
        echo "<p style='color: red;'>✗ Error adding verification_token: " . $e->getMessage() . "</p>";
    }
    
    // Check and add verification_token_expires column
    try {
        $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_token_expires'");
        if ($colCheck && !$colCheck->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP NULL");
            echo "<p style='color: green;'>✓ Added verification_token_expires column</p>";
        } else {
            echo "<p style='color: orange;'>→ verification_token_expires column already exists</p>";
        }
    } catch (Exception $e) {
        echo "<p style='color: red;'>✗ Error adding verification_token_expires: " . $e->getMessage() . "</p>";
    }
    
    echo "<hr>";
    echo "<p style='color: green;'><strong>Migration completed!</strong></p>";
    echo "<p>You can now delete this file (migrate_email_verification.php) for security.</p>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}
?>

