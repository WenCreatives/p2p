<?php
// Disable error display for production, but log errors
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Only POST requests allowed']);
    exit;
}

try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    if (!$pdo) {
        throw new Exception('Database connection failed');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    $action = $input['action'] ?? '';
    
    if ($action === 'register') {
        // Start output buffering early to prevent any output
        ob_start();
        
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        
        if (empty($name)) {
            ob_clean();
            throw new Exception('Name is required');
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            ob_clean();
            throw new Exception('Invalid email format');
        }
        
        if (strlen($password) < 8) {
            ob_clean();
            throw new Exception('Password must be at least 8 characters');
        }
        
        // Check if email already exists (do this FIRST before any modifications)
        $stmt = $pdo->prepare('SELECT id, email_verified FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existingUser) {
            ob_clean();
            throw new Exception('Email already registered. Please log in instead or use a different email address.');
        }
        
        // Ensure email verification columns exist
        try {
            $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified'");
            if ($colCheck && !$colCheck->fetch()) {
                $pdo->exec("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0");
            }
        } catch (Exception $e) {
            error_log('Email verification column check: ' . $e->getMessage());
        }
        
        try {
            $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_token'");
            if ($colCheck && !$colCheck->fetch()) {
                $pdo->exec("ALTER TABLE users ADD COLUMN verification_token VARCHAR(64) NULL, ADD COLUMN verification_token_expires TIMESTAMP NULL");
            }
        } catch (Exception $e) {
            error_log('Verification token column check: ' . $e->getMessage());
        }
        
        // Create user with email automatically verified (no verification required)
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, email_verified) VALUES (?, ?, ?, 1)');
        $stmt->execute([$name, $email, $passwordHash]);
        
        $userId = $pdo->lastInsertId();
        
        // Send admin notification about new user registration (no verification email sent)
        ob_start();
        try {
            $emailPath = __DIR__ . '/../config/email.php';
            if (file_exists($emailPath)) {
                require_once $emailPath;
                if (class_exists('EmailSender')) {
                    $emailSender = new EmailSender();
                    
                    // Send admin notification about new user registration
                    try {
                        $adminEmail = 'jordanmwinukatz@gmail.com';
                        $userData = [
                            'id' => $userId,
                            'name' => $name,
                            'email' => $email,
                            'email_verified' => true
                        ];
                        error_log('Attempting to send admin notification to: ' . $adminEmail);
                        $adminEmailResult = $emailSender->sendNewUserNotification($adminEmail, $userData);
                        error_log('Admin notification email send result: ' . json_encode($adminEmailResult));
                        
                        if (is_array($adminEmailResult)) {
                            if ($adminEmailResult['success'] ?? false) {
                                error_log('✓ Admin notification email sent successfully');
                            } else {
                                error_log('✗ Admin notification email FAILED: ' . ($adminEmailResult['message'] ?? 'Unknown error'));
                            }
                        } else {
                            error_log('⚠ Admin notification email returned unexpected result type: ' . gettype($adminEmailResult));
                        }
                    } catch (Exception $e) {
                        error_log('Exception sending admin notification: ' . $e->getMessage());
                        // Don't fail registration if admin email fails
                    }
                } else {
                    error_log('EmailSender class not found');
                }
            } else {
                error_log('Email config file not found at: ' . $emailPath);
            }
        } catch (Exception $e) {
            error_log('Exception sending admin notification: ' . $e->getMessage());
            // Don't fail registration if email fails
        } catch (Error $e) {
            error_log('Fatal error in email sending: ' . $e->getMessage());
            // Don't fail registration if email has fatal error
        }
        // Discard any output that might have been generated
        ob_end_clean();
        
        // Get created user with profile_picture column
        try {
            $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_picture'");
            $hasProfilePic = $colCheck && $colCheck->fetch();
            
            if ($hasProfilePic) {
                $stmt = $pdo->prepare('SELECT id, name, email, profile_picture FROM users WHERE id = ?');
            } else {
                $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
            }
        } catch (Exception $e) {
            $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
        }
        
        $stmt->execute([$userId]);
        $newUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Add email_verified status to response (automatically verified)
        $newUser['email_verified'] = true;
        
        // Ensure clean JSON output
        ob_clean();
        echo json_encode([
            'success' => true,
            'user' => $newUser,
            'message' => 'Account created successfully. You can now place orders.',
            'requires_verification' => false
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
        
    } elseif ($action === 'login') {
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }
        
        if (empty($password)) {
            throw new Exception('Password is required');
        }
        
        // Find user - include profile_picture column if it exists
        try {
            // Check if profile_picture column exists
            $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_picture'");
            $hasProfilePic = $colCheck && $colCheck->fetch();
            
            if ($hasProfilePic) {
                $stmt = $pdo->prepare('SELECT id, name, email, password_hash, profile_picture FROM users WHERE email = ?');
            } else {
                $stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
            }
        } catch (Exception $e) {
            // Fallback if column check fails
            $stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
        }
        
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new Exception('Invalid email or password');
        }
        
        // Start session for all users
        session_start();
        $_SESSION['user_id'] = $user['id'];
        
        // Set admin session if this is the admin user
        if ($email === 'jordanmwinukatz@gmail.com') {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_user'] = [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'profile_picture' => $user['profile_picture'] ?? null
            ];
        }
        
        // Get user with profile picture and email verification status - check if columns exist first
        try {
            $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_picture'");
            $hasProfilePic = $colCheck && $colCheck->fetch();
            
            $colCheckVerified = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified'");
            $hasEmailVerified = $colCheckVerified && $colCheckVerified->fetch();
            
            $selectFields = ['id', 'name', 'email'];
            if ($hasProfilePic) {
                $selectFields[] = 'profile_picture';
            }
            if ($hasEmailVerified) {
                $selectFields[] = 'email_verified';
            }
            
            $stmt = $pdo->prepare('SELECT ' . implode(', ', $selectFields) . ' FROM users WHERE id = ?');
        } catch (Exception $e) {
            // Fallback if column check fails
            $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
        }
        
        $stmt->execute([$user['id']]);
        $userWithPicture = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Ensure email_verified is boolean
        if (isset($userWithPicture['email_verified'])) {
            $userWithPicture['email_verified'] = (bool)$userWithPicture['email_verified'];
        }
        
        echo json_encode([
            'success' => true,
            'user' => $userWithPicture,
            'message' => 'Login successful'
        ]);
        
    } elseif ($action === 'logout') {
        session_start();
        $_SESSION = array();
        if (isset($_COOKIE[session_name()])) {
            setcookie(session_name(), '', time()-3600, '/');
        }
        session_destroy();
        
        echo json_encode([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    } elseif ($action === 'forgot_password') {
        $email = trim($input['email'] ?? '');
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }
        
        // Check if user exists
        $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Always return success (security: don't reveal if email exists)
        if (!$user) {
            echo json_encode([
                'success' => true,
                'message' => 'If an account with that email exists, a password reset link has been sent.'
            ]);
            exit;
        }
        
        // Create password_reset_tokens table if it doesn't exist
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id)
            )");
        } catch (Exception $e) {
            // If foreign key fails, try without it (in case users table structure differs)
            try {
                $pdo->exec("CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    token VARCHAR(64) NOT NULL UNIQUE,
                    expires_at TIMESTAMP NOT NULL,
                    used TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_token (token),
                    INDEX idx_user_id (user_id)
                )");
            } catch (Exception $e2) {
                error_log('Failed to create password_reset_tokens table: ' . $e2->getMessage());
            }
        }
        
        // Generate secure token
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // Valid for 1 hour
        
        // Invalidate any existing tokens for this user
        $stmt = $pdo->prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0');
        $stmt->execute([$user['id']]);
        
        // Insert new token
        $stmt = $pdo->prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
        $stmt->execute([$user['id'], $token, $expiresAt]);
        
        // Send password reset email
        require_once '../config/email.php';
        $emailSender = new EmailSender();
        
        // Build reset URL - ALWAYS use root path (remove /jordan from path)
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        // Remove any path from host (e.g., if host includes /jordan)
        $host = preg_replace('/\/.*$/', '', $host);
        // Remove port number if present
        $host = preg_replace('/:.*$/', '', $host);
        // Force root path - NEVER include /jordan/ in the URL
        $resetUrl = $protocol . '://' . $host . '/reset_password.html?token=' . urlencode($token);
        
        // Verify URL doesn't contain /jordan/ (safety check)
        if (strpos($resetUrl, '/jordan/') !== false) {
            error_log('ERROR: Reset URL still contains /jordan/ - correcting...');
            $resetUrl = str_replace('/jordan/', '/', $resetUrl);
        }
        
        // Debug: Log the generated URL to verify it's correct
        error_log('Password reset URL generated: ' . $resetUrl);
        
        try {
            error_log('Attempting to send password reset email to: ' . $user['email'] . ' | URL: ' . $resetUrl);
            $emailResult = $emailSender->sendPasswordResetEmail($user['email'], $user['name'], $resetUrl);
            
            // Log the result for debugging
            error_log('Email send result: ' . json_encode($emailResult));
            
            if (is_array($emailResult)) {
                if (!($emailResult['success'] ?? false)) {
                    error_log('Password reset email FAILED: ' . ($emailResult['message'] ?? 'Unknown error') . ' | To: ' . $user['email']);
                } else {
                    error_log('✓ Password reset email sent successfully to: ' . $user['email']);
                }
            } else {
                error_log('⚠ Password reset email returned unexpected result type: ' . gettype($emailResult));
            }
        } catch (Exception $e) {
            error_log('❌ EXCEPTION sending password reset email: ' . $e->getMessage() . ' | To: ' . $user['email']);
            error_log('Stack trace: ' . $e->getTraceAsString());
            // Don't fail the request, just log it
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'If an account with that email exists, a password reset link has been sent.'
        ]);
        
    } elseif ($action === 'update_profile') {
        // Update user profile (name and/or email)
        session_start();
        
        $email = trim($input['email'] ?? '');
        $name = trim($input['name'] ?? '');
        $currentEmail = $input['current_email'] ?? '';
        
        if (empty($email) || empty($name)) {
            throw new Exception('Name and email are required');
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }
        
        // Determine user ID: from session, admin session, or by current_email
        $userId = null;
        
        if (isset($_SESSION['admin_logged_in']) && isset($_SESSION['admin_user']['id'])) {
            // Admin can update any profile if user_id is provided, otherwise their own
            $userId = $input['user_id'] ?? $_SESSION['admin_user']['id'];
        } elseif (isset($_SESSION['user_id'])) {
            // Regular user can only update their own profile
            $userId = $_SESSION['user_id'];
            
            // Verify they're updating their own profile by checking current_email matches session
            if ($currentEmail) {
                // Get user from session to verify email matches
                $stmt = $pdo->prepare('SELECT email FROM users WHERE id = ?');
                $stmt->execute([$userId]);
                $sessionUser = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$sessionUser || $sessionUser['email'] !== $currentEmail) {
                    throw new Exception('Authentication required');
                }
            }
        } else {
            // No session - try to get userId from current_email
            if ($currentEmail) {
                $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
                $stmt->execute([$currentEmail]);
                $userFromEmail = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($userFromEmail) {
                    $userId = $userFromEmail['id'];
                }
            }
            
            if (!$userId) {
                throw new Exception('Authentication required');
            }
        }
        
        // Check if email is being changed and if new email already exists
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingUser && $existingUser['id'] != $userId) {
            throw new Exception('This email is already registered to another account');
        }
        
        // Update the user
        $stmt = $pdo->prepare('UPDATE users SET name = ?, email = ? WHERE id = ?');
        $stmt->execute([$name, $email, $userId]);
        
        // Handle profile picture update if provided
        $profilePicture = $input['profile_picture'] ?? null;
        if ($profilePicture) {
            // Ensure profile_picture column exists
            try {
                $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_picture'");
                if ($colCheck && !$colCheck->fetch()) {
                    $pdo->exec("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) NULL");
                }
            } catch (Exception $e) {
                // Column might already exist, continue
                error_log('Profile picture column check: ' . $e->getMessage());
            }
            
            // Update profile picture
            $stmt = $pdo->prepare('UPDATE users SET profile_picture = ? WHERE id = ?');
            $stmt->execute([$profilePicture, $userId]);
        }
        
        // Get updated user - check if profile_picture column exists first
        try {
            $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_picture'");
            $hasProfilePic = $colCheck && $colCheck->fetch();
            
            if ($hasProfilePic) {
                $stmt = $pdo->prepare('SELECT id, name, email, profile_picture FROM users WHERE id = ?');
            } else {
                $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
            }
        } catch (Exception $e) {
            // Fallback if column check fails
            $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
        }
        
        $stmt->execute([$userId]);
        $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'user' => $updatedUser,
            'message' => 'Profile updated successfully'
        ]);
        
    } elseif ($action === 'change_password') {
        $currentPassword = $input['currentPassword'] ?? '';
        $newPassword = $input['newPassword'] ?? '';
        
        if (empty($currentPassword) || empty($newPassword)) {
            throw new Exception('Current password and new password are required');
        }
        
        if (strlen($newPassword) < 8) {
            throw new Exception('New password must be at least 8 characters');
        }
        
        // Get user from email (assuming they're logged in and we have their email in authUser)
        // In production, get from session. For now, require email in request
        $userEmail = $input['email'] ?? null;
        if (!$userEmail) {
            throw new Exception('Email is required for password change');
        }
        
        $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ?');
        $stmt->execute([$userEmail]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception('User not found');
        }
        
        // Verify current password
        if (!password_verify($currentPassword, $user['password_hash'])) {
            throw new Exception('Current password is incorrect');
        }
        
        // Update password
        $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$newPasswordHash, $user['id']]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
        
    } elseif ($action === 'verify_email') {
        $token = trim($input['token'] ?? '');
        
        if (empty($token)) {
            throw new Exception('Verification token is required');
        }
        
        // Find user by verification token
        $stmt = $pdo->prepare('SELECT id, name, email, email_verified, verification_token_expires FROM users WHERE verification_token = ?');
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception('Invalid verification token');
        }
        
        // Check if already verified
        if ($user['email_verified']) {
            echo json_encode([
                'success' => true,
                'message' => 'Your email has already been verified. You can now place orders.',
                'already_verified' => true
            ]);
            exit;
        }
        
        // Check if token expired
        if ($user['verification_token_expires'] && strtotime($user['verification_token_expires']) < time()) {
            throw new Exception('This verification link has expired. Please request a new verification email.');
        }
        
        // Verify the email
        $stmt = $pdo->prepare('UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?');
        $stmt->execute([$user['id']]);
        
        // Get updated user with profile_picture if it exists
        try {
            $colCheck = $pdo->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_picture'");
            $hasProfilePic = $colCheck && $colCheck->fetch();
            
            $selectFields = ['id', 'name', 'email', 'email_verified'];
            if ($hasProfilePic) {
                $selectFields[] = 'profile_picture';
            }
            
            $stmt = $pdo->prepare('SELECT ' . implode(', ', $selectFields) . ' FROM users WHERE id = ?');
        } catch (Exception $e) {
            $stmt = $pdo->prepare('SELECT id, name, email, email_verified FROM users WHERE id = ?');
        }
        
        $stmt->execute([$user['id']]);
        $verifiedUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Ensure email_verified is boolean
        if (isset($verifiedUser['email_verified'])) {
            $verifiedUser['email_verified'] = (bool)$verifiedUser['email_verified'];
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Email verified successfully! You can now place orders.',
            'user' => $verifiedUser
        ]);
        
    } elseif ($action === 'resend_verification') {
        $email = trim($input['email'] ?? '');
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }
        
        // Find user
        $stmt = $pdo->prepare('SELECT id, name, email, email_verified FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            // Don't reveal if email exists (security)
            echo json_encode([
                'success' => true,
                'message' => 'If an account with that email exists and is unverified, a verification email has been sent.'
            ]);
            exit;
        }
        
        // If already verified, don't send
        if ($user['email_verified']) {
            echo json_encode([
                'success' => true,
                'message' => 'This email address is already verified.'
            ]);
            exit;
        }
        
        // Generate new verification token
        $verificationToken = bin2hex(random_bytes(32));
        $tokenExpires = date('Y-m-d H:i:s', time() + (24 * 60 * 60));
        
        $stmt = $pdo->prepare('UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?');
        $stmt->execute([$verificationToken, $tokenExpires, $user['id']]);
        
        // Send verification email
        require_once '../config/email.php';
        $emailSender = new EmailSender();
        
        // Build verification URL
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        // Remove any path from host
        $host = preg_replace('/\/.*$/', '', $host);
        // Remove port number if present
        $host = preg_replace('/:.*$/', '', $host);
        $verifyUrl = $protocol . '://' . $host . '/verify_email.html?token=' . urlencode($verificationToken);
        
        // Debug: Log the generated URL to verify it's correct
        error_log('Resend verification URL generated: ' . $verifyUrl);
        
        try {
            error_log('Attempting to resend verification email to: ' . $user['email'] . ' | Name: ' . $user['name']);
            
            $emailResult = $emailSender->sendVerificationEmail($user['email'], $user['name'], $verifyUrl);
            
            // Log detailed result
            error_log('Resend verification email send result: ' . json_encode($emailResult));
            
            if (is_array($emailResult)) {
                if ($emailResult['success'] ?? false) {
                    error_log('✓ Resend verification email sent successfully to: ' . $user['email']);
                } else {
                    error_log('✗ Resend verification email FAILED: ' . ($emailResult['message'] ?? 'Unknown error') . ' | To: ' . $user['email']);
                }
            } else {
                error_log('⚠ Resend verification email returned unexpected result type: ' . gettype($emailResult));
            }
        } catch (Exception $e) {
            error_log('❌ EXCEPTION resending verification email: ' . $e->getMessage() . ' | To: ' . ($user['email'] ?? 'unknown'));
            error_log('Exception trace: ' . $e->getTraceAsString());
        } catch (Error $e) {
            error_log('❌ FATAL ERROR resending verification email: ' . $e->getMessage());
            error_log('Error trace: ' . $e->getTraceAsString());
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'If an account with that email exists and is unverified, a verification email has been sent.'
        ]);
        
    } elseif ($action === 'reset_password') {
        $token = trim($input['token'] ?? '');
        $newPassword = $input['password'] ?? '';
        
        if (empty($token)) {
            throw new Exception('Reset token is required');
        }
        
        if (strlen($newPassword) < 8) {
            throw new Exception('Password must be at least 8 characters');
        }
        
        // Verify token
        $stmt = $pdo->prepare('SELECT prt.user_id, prt.expires_at, prt.used, u.email 
                               FROM password_reset_tokens prt 
                               JOIN users u ON prt.user_id = u.id 
                               WHERE prt.token = ?');
        $stmt->execute([$token]);
        $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tokenData) {
            throw new Exception('Invalid or expired reset token');
        }
        
        if ($tokenData['used']) {
            throw new Exception('This reset link has already been used');
        }
        
        if (strtotime($tokenData['expires_at']) < time()) {
            throw new Exception('This reset link has expired');
        }
        
        // Update password
        $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$passwordHash, $tokenData['user_id']]);
        
        // Mark token as used
        $stmt = $pdo->prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?');
        $stmt->execute([$token]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Password has been reset successfully. You can now log in with your new password.'
        ]);
        
    } else {
        throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    // Ensure clean JSON output
    ob_clean();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
} catch (Error $e) {
    // Catch fatal errors (PHP 7+)
    http_response_code(500);
    ob_clean();
    error_log('Auth API Fatal Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'A server error occurred. Please try again.'
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
