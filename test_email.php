<?php
// Test email sending functionality
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<h2>Email Sending Test</h2>";

// Test 1: Check if EmailSender class exists
echo "<h3>Test 1: Loading EmailSender class</h3>";
require_once 'config/email.php';
if (class_exists('EmailSender')) {
    echo "✓ EmailSender class loaded successfully<br>";
} else {
    echo "✗ EmailSender class NOT found<br>";
    exit;
}

// Test 2: Check PHPMailer
echo "<h3>Test 2: Checking PHPMailer</h3>";
if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
    echo "✓ PHPMailer is available<br>";
} else {
    echo "✗ PHPMailer is NOT available (will use native mail)<br>";
}

// Test 3: Create EmailSender instance
echo "<h3>Test 3: Creating EmailSender instance</h3>";
try {
    $emailSender = new EmailSender();
    echo "✓ EmailSender instance created successfully<br>";
} catch (Exception $e) {
    echo "✗ Failed to create EmailSender: " . $e->getMessage() . "<br>";
    exit;
}

// Test 4: Send test verification email
echo "<h3>Test 4: Sending test verification email</h3>";
$testEmail = 'jordanmwinukatz@gmail.com'; // Change this to your email
$testName = 'Test User';
$testUrl = 'https://jordanmwinukatz.com/public_html/verify_email.html?token=test123';

echo "Attempting to send email to: $testEmail<br>";
$result = $emailSender->sendVerificationEmail($testEmail, $testName, $testUrl);

echo "<pre>";
print_r($result);
echo "</pre>";

if (is_array($result) && ($result['success'] ?? false)) {
    echo "<p style='color: green;'>✓ Email sent successfully!</p>";
} else {
    echo "<p style='color: red;'>✗ Email failed: " . ($result['message'] ?? 'Unknown error') . "</p>";
}

// Test 5: Check error logs
echo "<h3>Test 5: Recent error log entries</h3>";
$errorLog = ini_get('error_log');
if ($errorLog) {
    echo "Error log location: $errorLog<br>";
    if (file_exists($errorLog)) {
        $lines = file($errorLog);
        $recentLines = array_slice($lines, -20); // Last 20 lines
        echo "<pre>";
        echo htmlspecialchars(implode('', $recentLines));
        echo "</pre>";
    } else {
        echo "Error log file not found at: $errorLog<br>";
    }
} else {
    echo "Error log location not configured<br>";
}

echo "<hr>";
echo "<p><a href='index.html'>Back to Home</a></p>";
?>

