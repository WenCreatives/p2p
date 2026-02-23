<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    require_once '../config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        $action = $input['action'] ?? '';

        // Ensure unread tracking column exists
        try {
            $colCheck = $conn->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_submissions' AND COLUMN_NAME = 'admin_viewed'");
            if ($colCheck && !$colCheck->fetch()) {
                $conn->exec("ALTER TABLE user_submissions ADD COLUMN admin_viewed TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN admin_viewed_at TIMESTAMP NULL DEFAULT NULL");
            }
        } catch (Exception $e) { /* ignore */ }
        
        // Handle different POST actions
        if ($action === 'get_submission') {
            $id = $input['id'] ?? '';
            if (!$id) {
                throw new Exception('Submission ID is required');
            }
            
            $stmt = $conn->prepare("SELECT * FROM user_submissions WHERE id = ?");
            $stmt->execute([$id]);
            $submission = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$submission) {
                throw new Exception('Submission not found');
            }
            
            // Decode JSON fields
            $submission['form_data'] = json_decode($submission['form_data'], true);
            $submission['user_info'] = json_decode($submission['user_info'], true);
            
            echo json_encode([
                'success' => true,
                'submission' => $submission
            ]);
            exit;
        }
        
        if ($action === 'update_status') {
            $submission_id = $input['submission_id'] ?? '';
            $new_status = $input['new_status'] ?? '';
            
            if (!$submission_id || !$new_status) {
                throw new Exception('Submission ID and new status are required');
            }
            
            $stmt = $conn->prepare("UPDATE user_submissions SET submission_status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$new_status, $submission_id]);
            
            // Log status change
            $stmt = $conn->prepare("INSERT INTO submission_status_history (submission_id, old_status, new_status, admin_user, notes) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$submission_id, 'pending', $new_status, 'admin', 'Status updated via dashboard']);
            
            echo json_encode([
                'success' => true,
                'message' => 'Status updated successfully'
            ]);
            exit;
        }
        
        if ($action === 'update_submission') {
            $submission_id = $input['submission_id'] ?? '';
            $status = $input['status'] ?? '';
            $admin_notes = $input['admin_notes'] ?? '';
            
            if (!$submission_id) {
                throw new Exception('Submission ID is required');
            }
            
            $stmt = $conn->prepare("UPDATE user_submissions SET submission_status = ?, admin_notes = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$status, $admin_notes, $submission_id]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Submission updated successfully'
            ]);
            exit;
        }

        if ($action === 'mark_viewed') {
            $submission_id = $input['submission_id'] ?? '';
            if (!$submission_id) { throw new Exception('Submission ID is required'); }
            $stmt = $conn->prepare("UPDATE user_submissions SET admin_viewed = 1, admin_viewed_at = NOW() WHERE id = ?");
            $stmt->execute([$submission_id]);
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'mark_completed') {
            $submission_id = $input['submission_id'] ?? '';
            if (!$submission_id) { throw new Exception('Submission ID is required'); }

            $conn->beginTransaction();
            try {
                $statusStmt = $conn->prepare("SELECT submission_status FROM user_submissions WHERE id = ? FOR UPDATE");
                $statusStmt->execute([$submission_id]);
                $currentStatus = $statusStmt->fetchColumn() ?: 'pending';

                $updateStmt = $conn->prepare("UPDATE user_submissions SET submission_status = 'completed', admin_viewed = 1, admin_viewed_at = NOW(), updated_at = NOW() WHERE id = ?");
                $updateStmt->execute([$submission_id]);

                $historyStmt = $conn->prepare("INSERT INTO submission_status_history (submission_id, old_status, new_status, admin_user, notes) VALUES (?, ?, ?, ?, ?)");
                $historyStmt->execute([$submission_id, $currentStatus, 'completed', 'admin', 'Marked completed from order preview']);

                $conn->commit();
            } catch (Exception $ex) {
                $conn->rollBack();
                throw $ex;
            }

            echo json_encode(['success' => true]);
            exit;
        }
        
        // Original submission creation logic
        $required_fields = ['session_id', 'submission_type', 'form_data'];
        foreach ($required_fields as $field) {
            if (!isset($input[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }
        
        // Ensure table exists
        $conn->exec("CREATE TABLE IF NOT EXISTS user_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id VARCHAR(255),
            user_id INT NULL,
            order_number VARCHAR(20) NULL,
            submission_type VARCHAR(100),
            form_data JSON,
            user_info JSON,
            submission_status VARCHAR(50) DEFAULT 'pending',
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_session_id (session_id),
            INDEX idx_order_number (order_number)
        )");
        
        // Ensure user_id column exists (for existing tables)
        try {
            $colCheck = $conn->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_submissions' AND COLUMN_NAME = 'user_id'");
            if ($colCheck && !$colCheck->fetch()) {
                $conn->exec("ALTER TABLE user_submissions ADD COLUMN user_id INT NULL AFTER session_id, ADD INDEX idx_user_id (user_id)");
            }
        } catch (Exception $e) {
            // Column might already exist or table structure is fine, continue
            error_log('Column check note: ' . $e->getMessage());
        }
        
        // Ensure order_number column exists (for existing tables)
        try {
            $colCheck = $conn->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_submissions' AND COLUMN_NAME = 'order_number'");
            if ($colCheck && !$colCheck->fetch()) {
                $conn->exec("ALTER TABLE user_submissions ADD COLUMN order_number VARCHAR(20) NULL AFTER user_id, ADD INDEX idx_order_number (order_number)");
            }
        } catch (Exception $e) {
            // Column might already exist or table structure is fine, continue
            error_log('Column check note: ' . $e->getMessage());
        }
        
        // Function to generate unique alphanumeric order number
        function generateOrderNumber($conn) {
            $characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I, O, 0, 1 to avoid confusion
            $maxAttempts = 10;
            
            for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
                // Generate format: ORD-XXX123 (6 chars after prefix)
                $randomPart = '';
                for ($i = 0; $i < 6; $i++) {
                    $randomPart .= $characters[random_int(0, strlen($characters) - 1)];
                }
                $orderNumber = 'ORD-' . $randomPart;
                
                // Check if it already exists
                $stmt = $conn->prepare("SELECT id FROM user_submissions WHERE order_number = ?");
                $stmt->execute([$orderNumber]);
                if (!$stmt->fetch()) {
                    return $orderNumber;
                }
            }
            
            // Fallback: use timestamp-based if all attempts fail (very unlikely)
            return 'ORD-' . strtoupper(bin2hex(random_bytes(3)));
        }

        // EMAIL VERIFICATION DISABLED - Allow all users to place orders
        // Check email verification for authenticated users
        $userId = $input['user_id'] ?? null;
        if (false && $userId) { // Disabled: changed to `false &&` to skip verification
            // First, ensure required verification columns exist
            try {
                $colCheck = $conn->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified'");
                if ($colCheck && !$colCheck->fetch()) {
                    $conn->exec("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0");
                    error_log('Created email_verified column in users table');
                }
            } catch (Exception $e) {
                error_log('Error checking/creating email_verified column: ' . $e->getMessage());
            }
            try {
                $colCheck = $conn->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_token'");
                if ($colCheck && !$colCheck->fetch()) {
                    $conn->exec("ALTER TABLE users ADD COLUMN verification_token VARCHAR(64) NULL");
                    error_log('Created verification_token column in users table');
                }
            } catch (Exception $e) {
                error_log('Error checking/creating verification_token column: ' . $e->getMessage());
            }
            try {
                $colCheck = $conn->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_token_expires'");
                if ($colCheck && !$colCheck->fetch()) {
                    $conn->exec("ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP NULL");
                    error_log('Created verification_token_expires column in users table');
                }
            } catch (Exception $e) {
                error_log('Error checking/creating verification_token_expires column: ' . $e->getMessage());
            }
            
            // Now check verification status
            try {
                $userStmt = $conn->prepare('SELECT id, name, email, email_verified, verification_token, verification_token_expires FROM users WHERE id = ?');
                $userStmt->execute([$userId]);
                $user = $userStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($user && isset($user['email_verified']) && !$user['email_verified']) {
                    // Ensure the user has a valid verification token and send (or resend) the email automatically
                    try {
                        $token = $user['verification_token'] ?? null;
                        $expiresAt = $user['verification_token_expires'] ?? null;
                        $needsNewToken = empty($token) || ($expiresAt && strtotime($expiresAt) < time());
                        
                        if ($needsNewToken) {
                            $token = bin2hex(random_bytes(32));
                            $newExpiresAt = date('Y-m-d H:i:s', time() + (24 * 60 * 60)); // 24 hours
                            $updateTokenStmt = $conn->prepare('UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?');
                            $updateTokenStmt->execute([$token, $newExpiresAt, $userId]);
                            $expiresAt = $newExpiresAt;
                        }
                        
                        // Try to send verification email
                        try {
                            $userEmail = $user['email'] ?? '';
                            $userName = $user['name'] ?? 'there';
                            
                            // Only try to send email if user has an email address
                            if (!empty($userEmail) && filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
                                $emailPath = __DIR__ . '/../config/email.php';
                                if (file_exists($emailPath)) {
                                    require_once $emailPath;
                                    if (class_exists('EmailSender')) {
                                        $emailSender = new EmailSender();
                                        
                                        // Build verification URL (mirror auth.php logic)
                                        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
                                        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                                        $host = preg_replace('/\/.*$/', '', $host);
                                        $host = preg_replace('/:.*$/', '', $host);
                                        $verifyUrl = $protocol . '://' . $host . '/verify_email.html?token=' . urlencode($token);
                                        
                                        $emailResult = $emailSender->sendVerificationEmail(
                                            $userEmail,
                                            $userName,
                                            $verifyUrl
                                        );
                                        
                                        if (is_array($emailResult) && ($emailResult['success'] ?? false)) {
                                            error_log('Auto verification email sent successfully for user ID ' . $userId . ' to ' . $userEmail);
                                        } else {
                                            error_log('Auto verification email send returned: ' . json_encode($emailResult));
                                        }
                                    } else {
                                        error_log('EmailSender class not found after requiring email.php');
                                    }
                                } else {
                                    error_log('Email config file not found at: ' . $emailPath);
                                }
                            } else {
                                error_log('Cannot send verification email: User ID ' . $userId . ' has invalid or missing email address');
                            }
                        } catch (Exception $autoEmailException) {
                            error_log('Failed to auto-send verification email during submission: ' . $autoEmailException->getMessage());
                            error_log('Exception trace: ' . $autoEmailException->getTraceAsString());
                            // Don't fail the request if email sending fails
                        } catch (Error $autoEmailError) {
                            error_log('Fatal error in auto-send verification email: ' . $autoEmailError->getMessage());
                            error_log('Error trace: ' . $autoEmailError->getTraceAsString());
                            // Don't fail the request if email sending has a fatal error
                        }
                    } catch (Exception $innerException) {
                        error_log('Error in verification email block: ' . $innerException->getMessage());
                        // Continue even if email sending fails
                    }
                    
                    $maskedEmail = $user['email'] ?? 'your email';
                    // Mask email for privacy (show only first 3 chars and domain)
                    if (strpos($maskedEmail, '@') !== false) {
                        $emailParts = explode('@', $maskedEmail);
                        $maskedEmail = substr($emailParts[0], 0, 3) . '***@' . $emailParts[1];
                    }
                    throw new Exception('Email verification required: Your email address must be verified before you can place orders. We just sent a verification link to ' . $maskedEmail . '. Please check your inbox (and spam folder). After verifying, refresh this page and try again.');
                }
            } catch (PDOException $e) {
                // If column still doesn't exist, log error but don't block order (for backward compatibility)
                if (strpos($e->getMessage(), 'email_verified') !== false || strpos($e->getMessage(), 'verification_token') !== false) {
                    error_log('Email verification column check failed: ' . $e->getMessage());
                    // Allow order to proceed if column doesn't exist (backward compatibility)
                } else {
                    // Re-throw other PDO exceptions
                    throw $e;
                }
            } catch (Exception $e) {
                // Re-throw other exceptions (like the verification required exception)
                throw $e;
            }
        }
        
        // Generate order number for order_form submissions
        $orderNumber = null;
        if ($input['submission_type'] === 'order_form') {
            $orderNumber = generateOrderNumber($conn);
        }
        
        $sql = "INSERT INTO user_submissions (session_id, user_id, order_number, submission_type, form_data, user_info, submission_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare SQL statement: ' . implode(', ', $conn->errorInfo()));
        }
        
        $formDataJson = json_encode($input['form_data']);
        $userInfoJson = json_encode($input['user_info'] ?? []);
        $status = $input['status'] ?? 'pending';
        $userId = $input['user_id'] ?? null;
        
        $executed = $stmt->execute([
            $input['session_id'],
            $userId,
            $orderNumber,
            $input['submission_type'],
            $formDataJson,
            $userInfoJson,
            $status
        ]);
        
        if (!$executed) {
            $errorInfo = $stmt->errorInfo();
            throw new Exception('Failed to execute SQL: ' . ($errorInfo[2] ?? 'Unknown error'));
        }
        
        $submission_id = $conn->lastInsertId();
        
        if (!$submission_id) {
            throw new Exception('Failed to get submission ID after insert');
        }
        
        // Return order_number if available, otherwise fallback to submission_id
        $return_id = $orderNumber ? $orderNumber : $submission_id;
        
        // Send emails for order submissions
        if ($input['submission_type'] === 'order_form') {
            require_once '../config/email.php';
            $emailSender = new EmailSender();
            
            $userInfo = $input['user_info'] ?? [];
            $formData = $input['form_data'] ?? [];
            
            $orderData = [
                'submission_id' => $submission_id,
                'order_number' => $orderNumber,
                'form_data' => $formData,
                'user_info' => $userInfo
            ];
            
            // Send confirmation email to user
            if (!empty($userInfo['email']) && $userInfo['email'] !== 'N/A') {
                try {
                    $emailSender->sendOrderConfirmation(
                        $userInfo['email'],
                        $userInfo['name'] ?? 'Customer',
                        $orderData
                    );
                } catch (Exception $e) {
                    // Log error but don't fail the submission
                    error_log('Failed to send user email: ' . $e->getMessage());
                }
            }
            
            // Send notification email to admin
            try {
                $emailSender->sendAdminNotification(
                    'jordanmwinukatz@gmail.com',
                    $orderData
                );
            } catch (Exception $e) {
                // Log error but don't fail the submission
                error_log('Failed to send admin email: ' . $e->getMessage());
            }
            
            // Send notification email to jordanmwinuka@gmail.com
            try {
                $emailSender->sendAdminNotification(
                    'jordanmwinuka@gmail.com',
                    $orderData
                );
            } catch (Exception $e) {
                // Log error but don't fail the submission
                error_log('Failed to send email to jordanmwinuka@gmail.com: ' . $e->getMessage());
            }
        }
        
        echo json_encode([
            'success' => true,
            'submission_id' => $submission_id,
            'order_number' => $orderNumber,
            'message' => 'Submission created successfully'
        ]);
        
    } elseif ($method === 'GET') {
        $action = $_GET['action'] ?? '';
        
        if ($action === 'get_submission') {
            $id = $_GET['id'] ?? '';
            if (!$id) {
                throw new Exception('Submission ID is required');
            }
            
            $stmt = $conn->prepare("SELECT * FROM user_submissions WHERE id = ?");
            $stmt->execute([$id]);
            $submission = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$submission) {
                throw new Exception('Submission not found');
            }
            
            // Decode JSON fields
            $submission['form_data'] = json_decode($submission['form_data'], true);
            $submission['user_info'] = json_decode($submission['user_info'], true);
            
            echo json_encode([
                'success' => true,
                'submission' => $submission
            ]);
            exit;
        }

        if ($action === 'pending_count') {
            // unread pending only
            // best-effort ensure column exists
            try {
                $colCheck = $conn->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_submissions' AND COLUMN_NAME = 'admin_viewed'");
                if ($colCheck && !$colCheck->fetch()) {
                    $conn->exec("ALTER TABLE user_submissions ADD COLUMN admin_viewed TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN admin_viewed_at TIMESTAMP NULL DEFAULT NULL");
                }
            } catch (Exception $e) { /* ignore */ }

            $stmt = $conn->query("SELECT COUNT(*) AS c FROM user_submissions WHERE submission_status = 'pending' AND (admin_viewed = 0 OR admin_viewed IS NULL)");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'pending' => (int)($row['c'] ?? 0)]);
            exit;
        }

        if ($action === 'notifications_list') {
            // Return recent unread pending submissions
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            try {
                $colCheck = $conn->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_submissions' AND COLUMN_NAME = 'admin_viewed'");
                if ($colCheck && !$colCheck->fetch()) {
                    $conn->exec("ALTER TABLE user_submissions ADD COLUMN admin_viewed TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN admin_viewed_at TIMESTAMP NULL DEFAULT NULL");
                }
            } catch (Exception $e) { /* ignore */ }
            $stmt = $conn->prepare("SELECT id, submission_type, created_at, form_data, user_info FROM user_submissions WHERE submission_status='pending' AND (admin_viewed = 0 OR admin_viewed IS NULL) ORDER BY created_at DESC LIMIT ?");
            $stmt->bindValue(1, (int)$limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$r) {
                $r['form_data'] = json_decode($r['form_data'], true);
                $r['user_info'] = json_decode($r['user_info'], true);
            }
            echo json_encode(['success' => true, 'notifications' => $rows]);
            exit;
        }

        if ($action === 'completed_list') {
            $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;
            $offset = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : 0;
            $stmt = $conn->prepare("SELECT id, order_number, submission_type, form_data, user_info, created_at, updated_at FROM user_submissions WHERE submission_status = 'completed' ORDER BY updated_at DESC LIMIT ? OFFSET ?");
            $stmt->bindValue(1, (int)$limit, PDO::PARAM_INT);
            $stmt->bindValue(2, (int)$offset, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$r) {
                $r['form_data'] = json_decode($r['form_data'], true);
                $r['user_info'] = json_decode($r['user_info'], true);
            }
            echo json_encode(['success' => true, 'completed' => $rows]);
            exit;
        }

        if ($action === 'payment_proofs') {
            $sessionId = $_GET['session_id'] ?? '';
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
            if (!$sessionId) { throw new Exception('session_id is required'); }
            $stmt = $conn->prepare("SELECT id, form_data, created_at FROM user_submissions WHERE submission_type='payment_proof' AND session_id = ? ORDER BY created_at DESC LIMIT ?");
            $stmt->bindValue(1, $sessionId);
            $stmt->bindValue(2, (int)$limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$r) {
                $r['form_data'] = json_decode($r['form_data'], true);
            }
            echo json_encode(['success' => true, 'proofs' => $rows]);
            exit;
        }

        if ($action === 'recent_by_session') {
            $sessionId = $_GET['session_id'] ?? '';
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            if (!$sessionId) { throw new Exception('session_id is required'); }
            $stmt = $conn->prepare("SELECT id, submission_type, form_data, user_info, created_at FROM user_submissions WHERE session_id = ? ORDER BY created_at DESC LIMIT ?");
            $stmt->bindValue(1, $sessionId);
            $stmt->bindValue(2, (int)$limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$r) {
                $r['form_data'] = json_decode($r['form_data'], true);
                $r['user_info'] = json_decode($r['user_info'], true);
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            exit;
        }

        if ($action === 'user_submissions') {
            $userId = $_GET['user_id'] ?? '';
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            if (!$userId) { throw new Exception('user_id is required'); }
            $stmt = $conn->prepare("SELECT id, order_number, submission_type, form_data, user_info, submission_status, created_at FROM user_submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?");
            $stmt->bindValue(1, (int)$userId, PDO::PARAM_INT);
            $stmt->bindValue(2, (int)$limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$r) {
                $r['form_data'] = json_decode($r['form_data'], true);
                $r['user_info'] = json_decode($r['user_info'], true);
            }
            echo json_encode(['success' => true, 'submissions' => $rows]);
            exit;
        }
        
        // Original GET logic for listing submissions
        $page = $_GET['page'] ?? 1;
        $limit = $_GET['limit'] ?? 20;
        $status = $_GET['status'] ?? '';
        $type = $_GET['type'] ?? '';
        
        $offset = ($page - 1) * $limit;
        
        $where_conditions = [];
        $params = [];
        
        if ($status) {
            $where_conditions[] = "submission_status = ?";
            $params[] = $status;
        }
        
        if ($type) {
            $where_conditions[] = "submission_type = ?";
            $params[] = $type;
        }
        
        $where_clause = $where_conditions ? 'WHERE ' . implode(' AND ', $where_conditions) : '';
        
        // Get total count
        $count_sql = "SELECT COUNT(*) as total FROM user_submissions $where_clause";
        $count_stmt = $conn->prepare($count_sql);
        $count_stmt->execute($params);
        $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get submissions
        $sql = "SELECT * FROM user_submissions $where_clause 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?";
        
        $stmt = $conn->prepare($sql);
        
        // Bind parameters in order
        $paramIndex = 1;
        foreach ($params as $param) {
            $stmt->bindValue($paramIndex, $param);
            $paramIndex++;
        }
        $stmt->bindValue($paramIndex, (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex + 1, (int)$offset, PDO::PARAM_INT);
        
        $stmt->execute();
        
        $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode JSON fields
        foreach ($submissions as &$submission) {
            $submission['form_data'] = json_decode($submission['form_data'], true);
            $submission['user_info'] = json_decode($submission['user_info'], true);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $submissions,
            'pagination' => [
                'page' => (int)$page,
                'limit' => (int)$limit,
                'total' => (int)$total,
                'pages' => ceil($total / $limit)
            ]
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    $errorMessage = $e->getMessage();
    // Log the full error for debugging
    error_log('Submissions API Error: ' . $errorMessage);
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    echo json_encode([
        'success' => false,
        'error' => $errorMessage
    ]);
} catch (Error $e) {
    // Catch fatal errors (PHP 7+)
    http_response_code(500);
    $errorMessage = $e->getMessage();
    error_log('Submissions API Fatal Error: ' . $errorMessage);
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    echo json_encode([
        'success' => false,
        'error' => 'A server error occurred. Please try again or contact support if the problem persists.'
    ]);
}
?>