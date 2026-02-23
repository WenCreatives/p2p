<?php
// Disable error display for production, but log errors
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../config/database.php';

// Start session before any output
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    if (!$pdo) {
        throw new Exception('Database connection failed');
    }

    // Ensure the table exists - support multiple accounts per payment method
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_payment_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        payment_method VARCHAR(100) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_payment_method (payment_method),
        INDEX idx_user_payment (user_id, payment_method)
    )");
    
    // Remove old UNIQUE constraint if it exists (migration for existing installations)
    try {
        $pdo->exec("ALTER TABLE user_payment_accounts DROP INDEX unique_user_payment");
    } catch (Exception $e) {
        // Index doesn't exist, that's fine
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $_GET['action'] ?? $input['action'] ?? '';

    // Get user_id from session, GET, or POST input
    $user_id = $_SESSION['user_id'] ?? $_GET['user_id'] ?? $input['user_id'] ?? null;

    if (!$user_id) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'User not authenticated']);
        exit;
    }

    if ($method === 'GET' || $action === 'get') {
        // Get all saved accounts for the user - support multiple accounts per payment method
        $stmt = $pdo->prepare("SELECT id, payment_method, account_name, account_number FROM user_payment_accounts WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user_id]);
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert to object format: { payment_method: [{ id, name, number }, ...] }
        $savedAccounts = [];
        foreach ($accounts as $account) {
            $pm = $account['payment_method'];
            if (!isset($savedAccounts[$pm])) {
                $savedAccounts[$pm] = [];
            }
            $savedAccounts[$pm][] = [
                'id' => $account['id'],
                'name' => $account['account_name'],
                'number' => $account['account_number']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'accounts' => $savedAccounts
        ]);
        
    } elseif ($method === 'POST' || $action === 'save') {
        // Save a new account (always insert, allow multiple accounts per payment method)
        $payment_method = trim($input['payment_method'] ?? '');
        $account_name = trim($input['account_name'] ?? '');
        $account_number = trim($input['account_number'] ?? '');
        
        if (empty($payment_method)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Payment method is required']);
            exit;
        }
        
        if (empty($account_name) || empty($account_number)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Account name and number are required']);
            exit;
        }
        
        // Check if this exact account already exists (prevent duplicates)
        $checkStmt = $pdo->prepare("SELECT id FROM user_payment_accounts WHERE user_id = ? AND payment_method = ? AND account_name = ? AND account_number = ?");
        $checkStmt->execute([$user_id, $payment_method, $account_name, $account_number]);
        if ($checkStmt->fetch()) {
            echo json_encode([
                'success' => true,
                'message' => 'Account already exists',
                'account' => [
                    'payment_method' => $payment_method,
                    'account_name' => $account_name,
                    'account_number' => $account_number
                ]
            ]);
            exit;
        }
        
        // Insert new account
        $stmt = $pdo->prepare("
            INSERT INTO user_payment_accounts (user_id, payment_method, account_name, account_number)
            VALUES (?, ?, ?, ?)
        ");
        
        $stmt->execute([$user_id, $payment_method, $account_name, $account_number]);
        $account_id = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Account saved successfully',
            'account' => [
                'id' => $account_id,
                'payment_method' => $payment_method,
                'account_name' => $account_name,
                'account_number' => $account_number
            ]
        ]);
        
    } elseif ($method === 'DELETE' || $action === 'delete') {
        // Delete a specific saved account by ID (or all accounts for a payment method if no ID)
        $account_id = $input['account_id'] ?? $_GET['account_id'] ?? null;
        $payment_method = trim($input['payment_method'] ?? $_GET['payment_method'] ?? '');
        
        if ($account_id) {
            // Delete specific account by ID
            $stmt = $pdo->prepare("DELETE FROM user_payment_accounts WHERE id = ? AND user_id = ?");
            $stmt->execute([$account_id, $user_id]);
        } elseif ($payment_method) {
            // Delete all accounts for a payment method (backward compatibility)
            $stmt = $pdo->prepare("DELETE FROM user_payment_accounts WHERE user_id = ? AND payment_method = ?");
            $stmt->execute([$user_id, $payment_method]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Account ID or payment method is required']);
            exit;
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Account deleted successfully'
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>

