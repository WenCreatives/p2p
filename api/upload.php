<?php
// Simple file upload endpoint for payment proof images
// Stores files under ../uploads/receipts and returns a public URL

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit;
    }

    if (!isset($_FILES['file'])) {
        throw new Exception('No file uploaded. $_FILES: ' . json_encode($_FILES));
    }

    $file = $_FILES['file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'PHP extension stopped the upload'
        ];
        $errorMsg = isset($errorMessages[$file['error']]) ? $errorMessages[$file['error']] : 'Unknown error';
        throw new Exception('Upload error code ' . $file['error'] . ': ' . $errorMsg);
    }

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    
    // Try mime_content_type first
    $mime = @mime_content_type($file['tmp_name']);
    
    // Fallback: check file extension
    if (!$mime) {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $mimeMap = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
        if (isset($mimeMap[$ext])) {
            $mime = $mimeMap[$ext];
        }
    }
    
    if (!isset($allowed[$mime])) {
        throw new Exception('Unsupported file type: ' . $mime . ' (detected from: ' . ($file['name'] ?? 'unknown') . '). Allowed types: ' . implode(', ', array_keys($allowed)));
    }

    $ext = $allowed[$mime];
    $dir = __DIR__ . '/../uploads/receipts';
    
    // Ensure parent uploads directory exists first
    $parentDir = dirname($dir);
    if (!is_dir($parentDir)) {
        if (!@mkdir($parentDir, 0775, true)) {
            error_log('Failed to create parent uploads directory: ' . $parentDir);
            throw new Exception('Failed to create upload directory. Please contact administrator.');
        }
    }
    
    // Ensure receipts directory exists
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0775, true)) {
            error_log('Failed to create receipts directory: ' . $dir);
            // Try to get more details about the error
            $parentWritable = is_writable($parentDir);
            $errorMsg = 'Failed to create upload directory. ';
            if (!$parentWritable) {
                $errorMsg .= 'Parent directory is not writable. ';
            }
            $errorMsg .= 'Please contact administrator or check server permissions.';
            throw new Exception($errorMsg);
        }
    }

    // Check directory is writable - try to make it writable if not
    $isWritable = is_writable($dir);
    if (!$isWritable) {
        // Try to change permissions to be more permissive
        @chmod($dir, 0777);
        @chmod(dirname($dir), 0777);
        
        // Wait a moment for permissions to take effect
        usleep(100000); // 0.1 second
        
        $isWritable = is_writable($dir);
    }
    
    // Final check - try to actually write a test file
    if (!$isWritable) {
        $testFile = $dir . '/.write_test_' . time() . '.tmp';
        $testResult = @file_put_contents($testFile, 'test');
        if ($testResult !== false) {
            @unlink($testFile);
            $isWritable = true; // We can write, so treat as writable
        }
    }
    
    if (!$isWritable) {
        // Get detailed error information
        $perms = @fileperms($dir);
        $owner = @fileowner($dir);
        $group = @filegroup($dir);
        $currentUser = @get_current_user();
        $processUser = function_exists('posix_getpwuid') && function_exists('posix_geteuid') ? @posix_getpwuid(@posix_geteuid()) : null;
        
        error_log('Upload directory write check failed:');
        error_log('  Directory: ' . $dir);
        error_log('  Exists: ' . (is_dir($dir) ? 'yes' : 'no'));
        error_log('  Permissions: ' . ($perms ? substr(sprintf('%o', $perms), -4) : 'unknown'));
        error_log('  Owner ID: ' . ($owner ?: 'unknown'));
        error_log('  Group ID: ' . ($group ?: 'unknown'));
        error_log('  Current user: ' . ($currentUser ?: 'unknown'));
        error_log('  Process user: ' . ($processUser ? ($processUser['name'] ?? 'unknown') : 'unknown'));
        
        throw new Exception('Upload directory is not writable: ' . $dir);
    }

    $name = 'proof_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $dest = $dir . '/' . $name;
    
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new Exception('Failed to save file. Source: ' . $file['tmp_name'] . ', Destination: ' . $dest);
    }

    // Verify file was saved
    if (!file_exists($dest)) {
        throw new Exception('File was not saved successfully. Expected at: ' . $dest);
    }

    // Build a URL relative to project root (/jordan/uploads/receipts/...)
    $url = 'uploads/receipts/' . $name;

    echo json_encode([
        'success' => true, 
        'url' => $url, 
        'filename' => $name, 
        'size' => filesize($dest),
        'mime' => $mime
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
