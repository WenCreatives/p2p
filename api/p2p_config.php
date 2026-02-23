<?php
// api/p2p_config.php
// Read/Write Binance P2P ad codes (buy/sell) stored in config/p2p.json

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();

$configDir = __DIR__ . '/../config';
$configFile = $configDir . '/p2p.json';

// Default codes: current working ones
$defaults = [
    'buyCode' => 'j15stHvu1u4',
    'sellCode' => 'HrOzHzvC5uj',
];

function read_config($file, $defaults) {
    if (is_file($file)) {
        $data = json_decode(file_get_contents($file), true);
        if (is_array($data)) return array_merge($defaults, $data);
    }
    return $defaults;
}

function write_config($file, $data) {
    if (!is_dir(dirname($file))) @mkdir(dirname($file), 0775, true);
    $tmp = $file . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT));
    rename($tmp, $file);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $cfg = read_config($configFile, $defaults);
        echo json_encode(['success' => true, 'data' => $cfg]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (empty($_SESSION['admin_logged_in'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }

        $raw = file_get_contents('php://input');
        $j = json_decode($raw, true);
        if (!is_array($j)) {
            throw new Exception('Invalid JSON body');
        }

        $buy = isset($j['buyCode']) ? trim($j['buyCode']) : '';
        $sell = isset($j['sellCode']) ? trim($j['sellCode']) : '';

        if ($buy !== '' && !preg_match('/^[A-Za-z0-9_-]{6,}$/', $buy)) {
            throw new Exception('Invalid buyCode');
        }
        if ($sell !== '' && !preg_match('/^[A-Za-z0-9_-]{6,}$/', $sell)) {
            throw new Exception('Invalid sellCode');
        }

        $cfg = read_config($configFile, $defaults);
        if ($buy !== '') $cfg['buyCode'] = $buy;
        if ($sell !== '') $cfg['sellCode'] = $sell;

        write_config($configFile, $cfg);
        echo json_encode(['success' => true, 'data' => $cfg]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>


