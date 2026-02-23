<?php
require_once 'auth_check.php';
require_once '../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 200;
$limit = max(1, min(500, $limit));

$stmt = $pdo->prepare("SELECT id, order_number, submission_type, form_data, user_info, created_at, updated_at FROM user_submissions WHERE submission_status = 'completed' ORDER BY updated_at DESC LIMIT ?");
$stmt->bindValue(1, $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$records = [];
foreach ($rows as $row) {
    $form = json_decode($row['form_data'] ?? '[]', true);
    if (!is_array($form)) { $form = []; }
    $user = json_decode($row['user_info'] ?? '[]', true);
    if (!is_array($user)) { $user = []; }

    $sideRaw = $form['order_type'] ?? $row['submission_type'] ?? 'Buy';
    $side = strtolower((string)$sideRaw) === 'sell' ? 'Sell' : 'Buy';
    $platform = $form['platform'] ?? $form['platform_name'] ?? $form['exchange'] ?? '—';
    $paymentMethod = $form['payment_method'] ?? $form['paymentMethod'] ?? $form['payout_channel'] ?? '—';

    $amountInput = $form['amount_input'] ?? null;
    $amountInputUnit = $form['amount_input_unit'] ?? null;
    $primaryAmount = $amountInput
        ? trim($amountInput . ' ' . ($amountInputUnit ?: ''))
        : ($form['amount'] ?? '—');
    $amountUsdt = $form['amount_usdt'] ?? $form['cryptoAmount'] ?? $form['amountCrypto'] ?? null;
    $amountTzs = $form['amount_tzs'] ?? $form['fiatAmount'] ?? $form['amountFiat'] ?? $form['tzs'] ?? null;

    $receipts = [];
    if (!empty($form['receipts']) && is_array($form['receipts'])) {
        $receipts = array_filter($form['receipts']);
    } elseif (!empty($form['receipt_url'])) {
        $receipts = [$form['receipt_url']];
    }

    $records[] = [
        'id' => (int)$row['id'],
        'order_number' => $row['order_number'] ?: 'ORD-' . str_pad($row['id'], 6, '0', STR_PAD_LEFT),
        'side' => $side,
        'platform' => $platform,
        'payment_method' => $paymentMethod,
        'amount_primary' => $primaryAmount,
        'amount_usdt' => $amountUsdt,
        'amount_tzs' => $amountTzs,
        'user_name' => $user['name'] ?? '—',
        'user_email' => $user['email'] ?? '—',
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
        'receipts' => $receipts,
    ];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Completed Orders - Jordan P2P Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-950 text-white min-h-screen">
    <header class="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
                    <i class="fas fa-clipboard-check text-emerald-400"></i>
                </div>
                <div>
                    <h1 class="text-2xl font-bold">Completed Orders Archive</h1>
                    <p class="text-sm text-white/60">Reference log of all finalized buy &amp; sell flows.</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <a href="index.php" class="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition">← Back to Dashboard</a>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section class="glass-card rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-xl font-semibold">Completed Orders</h2>
                    <p class="text-sm text-white/60">Showing the most recent <?php echo htmlspecialchars((string)$limit); ?> records.</p>
                </div>
                <form method="get" class="flex items-center gap-2">
                    <label class="text-sm text-white/60">Show</label>
                    <select name="limit" onchange="this.form.submit()" class="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60">
                        <?php foreach ([50, 100, 200, 300, 500] as $opt): ?>
                            <option value="<?php echo $opt; ?>" <?php if ($opt === $limit) echo 'selected'; ?>><?php echo $opt; ?></option>
                        <?php endforeach; ?>
                    </select>
                    <span class="text-sm text-white/60">entries</span>
                </form>
            </div>

            <?php if (empty($records)): ?>
                <div class="text-center py-14 text-white/60">
                    <i class="fas fa-inbox text-4xl mb-4"></i>
                    <p>No completed orders yet. Finish an order to see it logged here.</p>
                </div>
            <?php else: ?>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-white/10 text-sm">
                        <thead class="bg-white/5 text-white/70 uppercase tracking-wider text-xs">
                            <tr>
                                <th class="px-4 py-3 text-left">Order</th>
                                <th class="px-4 py-3 text-left">Type</th>
                                <th class="px-4 py-3 text-left">Customer</th>
                                <th class="px-4 py-3 text-left">Platform</th>
                                <th class="px-4 py-3 text-left">Amounts</th>
                                <th class="px-4 py-3 text-left">Payment/Payout</th>
                                <th class="px-4 py-3 text-left">Proofs</th>
                                <th class="px-4 py-3 text-left">Updated</th>
                                <th class="px-4 py-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            <?php foreach ($records as $record): 
                                $previewTarget = strtolower($record['side']) === 'sell'
                                    ? '../sell%20order.html?id=' . $record['id'] . '&readonly=1'
                                    : '../buy%20order.html?id=' . $record['id'] . '&readonly=1';
                                $proofCount = count($record['receipts']);
                            ?>
                                <tr class="hover:bg-white/5 transition">
                                    <td class="px-4 py-3">
                                        <div class="font-semibold text-white"><?php echo htmlspecialchars($record['order_number']); ?></div>
                                        <div class="text-xs text-white/50">#<?php echo htmlspecialchars((string)$record['id']); ?> • <?php echo htmlspecialchars(date('M j, Y H:i', strtotime($record['created_at']))); ?></div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
                                            <?php echo strtolower($record['side']) === 'sell'
                                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'; ?>">
                                            <i class="fas fa-exchange-alt"></i>
                                            <?php echo htmlspecialchars($record['side']); ?>
                                        </span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="font-medium"><?php echo htmlspecialchars($record['user_name']); ?></div>
                                        <div class="text-xs text-white/50"><?php echo htmlspecialchars($record['user_email']); ?></div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="font-medium"><?php echo htmlspecialchars($record['platform']); ?></div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div><?php echo htmlspecialchars($record['amount_primary']); ?></div>
                                        <?php if ($record['amount_usdt']): ?>
                                            <div class="text-xs text-white/50"><?php echo htmlspecialchars($record['amount_usdt']); ?> USDT</div>
                                        <?php endif; ?>
                                        <?php if ($record['amount_tzs']): ?>
                                            <div class="text-xs text-white/50"><?php echo htmlspecialchars($record['amount_tzs']); ?> TZS</div>
                                        <?php endif; ?>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div><?php echo htmlspecialchars($record['payment_method']); ?></div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <?php if ($proofCount > 0): ?>
                                            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs border border-amber-400/40">
                                                <i class="fas fa-paperclip"></i>
                                                <?php echo $proofCount; ?>
                                            </span>
                                        <?php else: ?>
                                            <span class="text-white/30 text-xs">None</span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-white/60">
                                        <?php echo htmlspecialchars(date('M j, Y H:i', strtotime($record['updated_at']))); ?>
                                    </td>
                                    <td class="px-4 py-3">
                                        <a href="<?php echo htmlspecialchars($previewTarget); ?>" target="_blank" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs hover:bg-emerald-500/30 transition">
                                            <i class="fas fa-eye"></i> Review
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </section>

        <section class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-info-circle text-white/50"></i>
                Tips
            </h3>
            <ul class="space-y-2 text-sm text-white/60">
                <li>• Use this log to reconcile payouts or investigate disputes.</li>
                <li>• Click “Review” to reopen the exact order summary with attached proof files.</li>
                <li>• Export data by copying the table into a spreadsheet when needed.</li>
            </ul>
        </section>
    </main>
</body>
</html>

