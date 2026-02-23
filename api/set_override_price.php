<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST required');
    }

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) throw new Exception('Invalid JSON body');

    $code = trim($input['code'] ?? '');
    $price = $input['price'] ?? null;
    $fiat = $input['fiat'] ?? 'TZS';
    if ($code === '' || $price === null || !is_numeric($price)) {
        throw new Exception('Missing code or price');
    }

    $cacheDir = __DIR__ . '/../cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0775, true);
    if (!is_dir($cacheDir)) throw new Exception('Cache dir not writable');

    $file = $cacheDir . '/headless_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $code) . '.json';
    $payload = [
        'success' => true,
        'code' => $code,
        'role' => null,
        'price' => (float)$price,
        'fiat' => $fiat,
        'url' => 'override:local',
        'screenshot' => null,
        'updatedAt' => time(),
    ];
    if (file_put_contents($file, json_encode($payload)) === false) {
        throw new Exception('Failed to write override');
    }

    echo json_encode(['success' => true, 'message' => 'Override saved', 'file' => basename($file)]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>


