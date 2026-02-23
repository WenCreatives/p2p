<?php
// Binance P2P price fetcher via API + HTML fallback
// Usage: /api/binance_price.php?code=j15stHvu1u4
//
// Strategy:
// 1) If share code matches a known mapping, call Binance detail-with-advertiser API using advNo
// 2) Otherwise, parse the share page HTML for embedded JSON as fallback

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $code = isset($_GET['code']) ? trim($_GET['code']) : '';
    $minAmount = null;
    $maxAmount = null;
    $availableFiat = null;
    if ($code === '') {
        throw new Exception('Missing code parameter');
    }

    // 30s cache per code
    $cacheDir = __DIR__ . '/../cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0775, true);
    $cacheFile = $cacheDir . '/binance_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $code) . '.json';
    $cacheTtl = 15;

    if (is_file($cacheFile) && (time() - filemtime($cacheFile) < $cacheTtl)) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['success'])) {
            echo json_encode($cached);
            exit;
        }
    }

    // 1) Try Binance detail-with-advertiser API if we can resolve advNo
    $codeToAdvNo = [
        'd52wtrt1Sus' => '13793140957964742656', // legacy BUY link
        'j15stHvu1u4' => '13793140957964742656', // updated BUY share link (same advert)
        'HrOzHzvC5uj' => '12790984677311205376', // SELL link
    ];

    $advNo = null;
    if (ctype_digit($code)) {
        $advNo = $code; // already a numeric advNo
    } elseif (isset($codeToAdvNo[$code])) {
        $advNo = $codeToAdvNo[$code];
    }

    if ($advNo) {
        $detailUrl = 'https://c2c.binance.com/bapi/c2c/v2/public/c2c/adv/detail-with-advertiser?channel=c2c&advNo=' . urlencode($advNo) . '&area=shareAds';
        $ch = curl_init($detailUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTPHEADER => [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                'Accept: application/json',
                'Accept-Language: en-US,en;q=0.9',
            ],
        ]);
        $resp = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($resp !== false && $http === 200) {
            $j = json_decode($resp, true);
            if (isset($j['code']) && $j['code'] === '000000' && isset($j['data']['adv']['price'])) {
                $price = (float)$j['data']['adv']['price'];
                $fiat  = $j['data']['adv']['fiatUnit'] ?? 'TZS';
                $asset = $j['data']['adv']['asset'] ?? 'USDT';
                $limits = compute_limits_from_adv($j['data']['adv'], $price);

                if ($price > 0) {
                    $result = [
                        'success' => true,
                        'source' => 'binance_detail_api',
                        'code' => $code,
                        'advNo' => $advNo,
                        'price' => $price,
                        'fiat' => $fiat,
                        'asset' => $asset,
                        'timestamp' => time(),
                        'minAmount' => $limits['min'],
                        'maxAmount' => $limits['max'],
                        'availableFiat' => $limits['available'],
                        'paymentMethods' => extract_payment_methods($j['data']['adv']),
                    ];
                    @file_put_contents($cacheFile, json_encode($result));
                    echo json_encode($result);
                    exit;
                }
            }
        } else {
            error_log('Binance detail API failed (' . $http . '): ' . $err);
        }
    }

    // 2) Fallback: Parse share page HTML for embedded data
    $url = 'https://c2c.binance.com/en/adv?code=' . urlencode($code);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_HTTPHEADER => [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language: en-US,en;q=0.9',
            'Accept-Encoding: gzip, deflate, br',
        ],
    ]);
    $html = curl_exec($ch);
    if ($html === false) {
        throw new Exception('Failed to fetch Binance page: ' . curl_error($ch));
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status >= 400) {
        throw new Exception('Binance returned HTTP ' . $status);
    }

    $price = null;
    $fiat = null;
    $paymentMethods = [];

    if (preg_match('/<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s', $html, $matches)) {
        $jsonData = json_decode($matches[1], true);
        if (is_array($jsonData)) {
            $paths = [
                ['props', 'pageProps', 'initialState', 'c2c', 'advDetail', 'adv'],
                ['props', 'pageProps', 'adv'],
                ['props', 'initialState', 'c2c', 'advDetail', 'adv'],
            ];
            foreach ($paths as $path) {
                $data = $jsonData;
                foreach ($path as $key) {
                    if (!isset($data[$key])) { $data = null; break; }
                    $data = $data[$key];
                }
                if (is_array($data) && isset($data['price'])) {
                    $price = (float)$data['price'];
                    $fiat = $data['fiatUnit'] ?? $data['fiat'] ?? 'TZS';
                    $limits = compute_limits_from_adv($data, $price);
                    $paymentMethods = extract_payment_methods($data);
                    if ($limits['min'] !== null && $minAmount === null) $minAmount = $limits['min'];
                    if ($limits['max'] !== null && $maxAmount === null) $maxAmount = $limits['max'];
                    $availableFiat = $limits['available'];
                    break;
                }
            }
        }
    }

    if ($price === null) {
        $patterns = [
            '/window\.__APP_DATA__\s*=\s*(\{[\s\S]*?\});/i',
            '/window\.__APP_STATE__\s*=\s*(\{[\s\S]*?\});/i',
            '/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/i',
        ];
        foreach ($patterns as $re) {
            if (preg_match($re, $html, $m)) {
                $json = rtrim(trim($m[1]), ';');
                $data = json_decode($json, true);
                if (is_array($data)) {
                    $price = findInArray($data, ['price', 'advPrice', 'displayPrice']);
                    $fiat = findInArray($data, ['fiatUnit', 'fiat', 'currency']);
                    if ($price) {
                        $limits = compute_limits_from_adv($data, (float)$price);
                        if (empty($paymentMethods)) {
                            $paymentMethods = extract_payment_methods($data);
                        }
                        if ($limits['min'] !== null && $minAmount === null) $minAmount = $limits['min'];
                        if ($limits['max'] !== null && $maxAmount === null) $maxAmount = $limits['max'];
                        if ($availableFiat === null) $availableFiat = $limits['available'];
                    }
                    if ($price !== null) break;
                }
            }
        }
    }

    if ($price === null && preg_match('/1\s*USDT\s*[≈~=]\s*([0-9.,]+)\s*([A-Z]{3,4})/i', $html, $m)) {
        $price = $m[1];
        $fiat = $m[2] ?? 'TZS';
    }

    if ($price === null && preg_match('/Price[^\n]*?([0-9.,]+)\s*([A-Z]{3,4})/i', $html, $m)) {
        $price = $m[1];
        $fiat = $m[2] ?? 'TZS';
    }

    if ($price === null) {
        error_log("Failed to extract price from Binance page for code {$code}. HTML snippet: " . substr($html, 0, 500));
        throw new Exception('Could not extract price from Binance page');
    }

    $normalized = (float)str_replace([',', ' '], ['', ''], $price);
    $result = [
        'success' => true,
        'source' => 'binance_html_parse',
        'code' => $code,
        'price' => $normalized,
        'fiat' => $fiat ?: 'TZS',
        'timestamp' => time(),
        'minAmount' => $minAmount,
        'maxAmount' => $maxAmount,
        'availableFiat' => $availableFiat,
        'paymentMethods' => $paymentMethods,
    ];

    @file_put_contents($cacheFile, json_encode($result));
    echo json_encode($result);

} catch (Exception $e) {
    error_log("Binance price fetch error for code {$code}: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => $code ?? null,
    ]);
}

function parse_amount($value) {
    if ($value === null) {
        return null;
    }
    if (is_numeric($value)) {
        return (float)$value;
    }
    $filtered = str_replace([',', ' '], ['', ''], (string)$value);
    return is_numeric($filtered) ? (float)$filtered : null;
}

function compute_limits_from_adv(array $adv, $price) {
    $price = (float)$price;
    $minAmountCandidates = [];
    $minQuantityCandidates = [];
    $maxAmountCandidates = [];
    $maxQuantityCandidates = [];
    $availableAmountCandidates = [];
    $availableQuantityCandidates = [];

    $minAmountKeys = ['minSingleTransAmount', 'minAmount', 'dynamicMinSingleTransAmount'];
    foreach ($minAmountKeys as $key) {
        if (isset($adv[$key])) {
            $val = parse_amount($adv[$key]);
            if ($val !== null) {
                $minAmountCandidates[] = $val;
            }
        }
    }
    $minQuantityKeys = ['minSingleTransQuantity', 'minSingleTransQty'];
    foreach ($minQuantityKeys as $key) {
        if (isset($adv[$key])) {
            $val = parse_amount($adv[$key]);
            if ($val !== null) {
                $minQuantityCandidates[] = $val;
            }
        }
    }

    $maxAmountKeys = ['maxSingleTransAmount', 'maxAmount', 'dynamicMaxSingleTransAmount'];
    foreach ($maxAmountKeys as $key) {
        if (isset($adv[$key])) {
            $val = parse_amount($adv[$key]);
            if ($val !== null) {
                $maxAmountCandidates[] = $val;
            }
        }
    }
    $maxQuantityKeys = ['maxSingleTransQuantity', 'maxSingleTransQty', 'dynamicMaxSingleTransQuantity'];
    foreach ($maxQuantityKeys as $key) {
        if (isset($adv[$key])) {
            $val = parse_amount($adv[$key]);
            if ($val !== null) {
                $maxQuantityCandidates[] = $val;
            }
        }
    }

    $availableAmountKeys = ['availableAmount', 'availableFiat', 'dynamicAvailableAmount'];
    foreach ($availableAmountKeys as $key) {
        if (isset($adv[$key])) {
            $val = parse_amount($adv[$key]);
            if ($val !== null) {
                $availableAmountCandidates[] = $val;
            }
        }
    }
    $availableQuantityKeys = ['surplusAmount', 'tradableQuantity', 'availableQuantity'];
    foreach ($availableQuantityKeys as $key) {
        if (isset($adv[$key])) {
            $val = parse_amount($adv[$key]);
            if ($val !== null) {
                $availableQuantityCandidates[] = $val;
            }
        }
    }

    $minFiat = null;
    if (!empty($minAmountCandidates)) {
        $minFiat = max($minAmountCandidates);
    } elseif ($price > 0 && !empty($minQuantityCandidates)) {
        $minFiat = max($minQuantityCandidates) * $price;
    }

    $amountAvailable = !empty($availableAmountCandidates) ? min($availableAmountCandidates) : null;
    $quantityAvailable = ($price > 0 && !empty($availableQuantityCandidates))
        ? min($availableQuantityCandidates) * $price
        : null;

    if ($amountAvailable !== null) {
        $availableFiat = $amountAvailable;
    } elseif (!empty($maxAmountCandidates)) {
        // Fallback to dynamic/max amount when explicit available amount is missing
        $availableFiat = min($maxAmountCandidates);
    } else {
        $availableFiat = $quantityAvailable;
    }

    $amountMax = !empty($maxAmountCandidates) ? min($maxAmountCandidates) : null;
    $quantityMax = ($price > 0 && !empty($maxQuantityCandidates))
        ? min($maxQuantityCandidates) * $price
        : null;

    if ($amountMax !== null) {
        $maxFiat = $amountMax;
    } else {
        $maxFiat = $quantityMax;
    }

    if ($availableFiat !== null && $maxFiat !== null) {
        $maxFiat = min($maxFiat, $availableFiat);
    }

    return [
        'min' => $minFiat,
        'max' => $maxFiat,
        'available' => $availableFiat,
    ];
}

function extract_payment_methods($adv) {
    $methods = [];
    if (!is_array($adv)) {
        return $methods;
    }
    if (!empty($adv['tradeMethods']) && is_array($adv['tradeMethods'])) {
        foreach ($adv['tradeMethods'] as $tm) {
            if (!empty($tm['tradeMethodName'])) {
                $methods[] = $tm['tradeMethodName'];
            } elseif (!empty($tm['tradeMethodShortName'])) {
                $methods[] = $tm['tradeMethodShortName'];
            }
        }
    }
    return array_values(array_unique(array_filter($methods)));
}

function findInArray(array $arr, array $keys) {
    $it = new RecursiveIteratorIterator(new RecursiveArrayIterator($arr));
    foreach ($it as $k => $v) {
        if (in_array($k, $keys, true) && is_numeric($v)) {
            return $v;
        }
    }
    return null;
}
?>
