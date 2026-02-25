<?php
require_once 'auth_check.php';
require_once '../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

// Periods
$now = date('Y-m-d H:i:s');

// Optimized: Combine multiple queries into fewer database calls
// Unique visitors (last 30 days) and Page views (last 7 days)
$analyticsStmt = $pdo->query("
    SELECT 
        (SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS visitors,
        (SELECT COUNT(*) FROM analytics_page_views WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS page_views
");
$analytics = $analyticsStmt->fetch(PDO::FETCH_ASSOC);
$totalVisitors = (int)($analytics['visitors'] ?? 0);
$pageViews7d = (int)($analytics['page_views'] ?? 0);

// Optimized: Get all submission counts in one query
$submissionsStmt = $pdo->query("
    SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN submission_status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN submission_status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed,
        SUM(CASE WHEN submission_status = 'completed' THEN 1 ELSE 0 END) AS completed
    FROM user_submissions
");
$submissions = $submissionsStmt->fetch(PDO::FETCH_ASSOC);
$totalSubmissions = (int)($submissions['total'] ?? 0);
$pendingCount = (int)($submissions['pending'] ?? 0);
$reviewedCount = (int)($submissions['reviewed'] ?? 0);
$completedCount = (int)($submissions['completed'] ?? 0);

// Active orders = pending + reviewed
$activeOrders = $pendingCount + $reviewedCount;

// Success rate = completed / total submissions
$successRate = $totalSubmissions > 0 ? round(($completedCount / $totalSubmissions) * 100, 1) : 0;

// Revenue (sum of numeric 'amount' field in form_data JSON for completed submissions)
$revenueStmt = $pdo->query("SELECT SUM(CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(form_data, '$.amount')), '') AS DECIMAL(18,2))) AS total_amount FROM user_submissions WHERE submission_status='completed'");
$revenueTotal = (float)($revenueStmt->fetch(PDO::FETCH_ASSOC)['total_amount'] ?? 0);

// Completed today
$completedTodayStmt = $pdo->query("SELECT COUNT(*) AS c FROM user_submissions WHERE submission_status='completed' AND DATE(updated_at) = CURDATE()");
$completedToday = (int)($completedTodayStmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);

// Average response time (hours) from created to first 'completed' status entry
$avgRespStmt = $pdo->query("SELECT AVG(TIMESTAMPDIFF(SECOND, us.created_at, ssh.created_at))/3600 AS hrs
    FROM user_submissions us
    JOIN submission_status_history ssh ON ssh.submission_id = us.id AND ssh.new_status = 'completed'
");
$avgRespHours = (float)($avgRespStmt->fetch(PDO::FETCH_ASSOC)['hrs'] ?? 0);
$avgRespDisplay = $avgRespHours > 0 ? round($avgRespHours, 1) . 'h' : '0h';

// Conversion rate (completed submissions / unique visitors last 30 days)
$conversionRate = $totalVisitors > 0 ? round(($completedCount / $totalVisitors) * 100, 1) : 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Loader Head -->
    <link rel="preload" as="image" href="../dist/assets/logo-icon.png">
    <link rel="stylesheet" href="../dist/css/loader.css">
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Jordan P2P</title>
    
    <!-- Resource hints for faster loading -->
    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
    <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
    
    <!-- Preload critical CSS -->
    <link rel="preload" href="../dist/styles.css" as="style">
    <link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" as="style" crossorigin>
    
    <!-- Optimized Tailwind CSS - pre-built and minified (replaces slow CDN) -->
    <link rel="stylesheet" href="../dist/styles.css">
    
    <!-- Font Awesome - load async to not block rendering -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer"></noscript>
    <style>
        .gradient-text {
            background: linear-gradient(to right, #fbbf24, #fde047, #22d3ee);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
        .card-hover {
            transition: all 0.3s ease;
        }
        .card-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
        }
        .gradient-bg {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        }
    </style>
</head>
<body class="bg-black text-white min-h-screen">
    <!-- JORDAN P2P FULLSCREEN LOADER START -->
    <div id="jordan-loader">
        <img src="../dist/assets/logo-icon.png" alt="Loading..." class="loader-logo">
        <div class="loader-text">Securing your market access...</div>
    </div>
    <!-- JORDAN P2P FULLSCREEN LOADER END -->
    
    <audio id="notifSound" src="assets/audio/mixkit-urgent-simple-tone-loop-2976.wav" preload="none"></audio>
    <!-- Header -->
    <header class="gradient-bg border-b border-white/10 sticky top-0 z-50">
    <!-- Loader Head -->
    <link rel="preload" as="image" href="../dist/assets/logo-icon.png">
    <link rel="stylesheet" href="../dist/css/loader.css">
    
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <div class="flex items-center space-x-4">
                    <div class="h-8 w-8 rounded-xl bg-gradient-to-tr from-yellow-500/20 via-yellow-400/10 to-cyan-500/20 flex items-center justify-center">
                        <i class="fas fa-shield-alt text-yellow-400 text-lg"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold gradient-text">Admin Dashboard</h1>
                        <p class="text-white/70 text-sm">Jordan P2P Management Center</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="glass-card px-4 py-2 rounded-lg">
                        <span class="text-sm text-white/70">Last login:</span>
                        <span class="text-white font-semibold" id="lastLogin">Just now</span>
                    </div>
                    <div class="relative">
                        <button id="notifBtn" title="View new submissions" class="relative glass-card hover:bg-white/10 px-4 py-2 rounded-lg transition-colors">
                            <i class="fas fa-bell text-white"></i>
                            <span id="notifBadge" class="hidden absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">0</span>
                        </button>
                        <div id="notifDropdown" class="hidden absolute right-0 mt-2 w-80 glass-card rounded-lg p-3 z-50">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-white/80 text-sm font-semibold">New Submissions</span>
                                <a href="submissions_dashboard.php" class="text-cyan-300 text-xs hover:underline">Open all</a>
                            </div>
                            <div id="notifList" class="space-y-2 max-h-64 overflow-auto"></div>
                        </div>
                    </div>
                    <button onclick="refreshData()" class="glass-card hover:bg-white/10 px-4 py-2 rounded-lg transition-colors">
                        <i class="fas fa-sync-alt text-white"></i>
                    </button>
                    <a href="logout.php" class="glass-card hover:bg-red-500/20 px-4 py-2 rounded-lg transition-colors text-red-400 hover:text-red-300">
                        <i class="fas fa-sign-out-alt"></i>
                        <span class="ml-2">Logout</span>
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Welcome Section -->
        <div class="mb-8">
            <h2 class="text-3xl md:text-4xl font-bold gradient-text mb-2">Welcome Back, Admin</h2>
            <p class="text-white/70 max-w-2xl">Manage your P2P trading platform with powerful analytics and submission tracking tools.</p>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="glass-card rounded-xl p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-white/70 text-sm font-medium">Total Users</p>
                        <p class="text-3xl font-bold text-white" id="totalUsers"><?php echo number_format($totalVisitors); ?></p>
                    </div>
                    <div class="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                        <i class="fas fa-users text-blue-400 text-xl"></i>
                    </div>
                </div>
                <div class="mt-4 flex items-center">
                    <span class="text-green-400 text-sm font-medium">+12%</span>
                    <span class="text-white/70 text-sm ml-2">vs last month</span>
                </div>
            </div>

            <div class="glass-card rounded-xl p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-white/70 text-sm font-medium">Active Orders</p>
                        <p class="text-3xl font-bold text-yellow-400" id="activeOrders"><?php echo number_format($activeOrders); ?></p>
                    </div>
                    <div class="h-12 w-12 rounded-xl bg-gradient-to-tr from-yellow-500/20 to-yellow-600/20 flex items-center justify-center">
                        <i class="fas fa-shopping-cart text-yellow-400 text-xl"></i>
                    </div>
                </div>
                <div class="mt-4 flex items-center">
                    <span class="text-yellow-400 text-sm font-medium">5 new</span>
                    <span class="text-white/70 text-sm ml-2">today</span>
                </div>
            </div>

            <div class="glass-card rounded-xl p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-white/70 text-sm font-medium">Revenue</p>
                        <p class="text-3xl font-bold text-green-400" id="revenue">$0</p>
                    </div>
                    <div class="h-12 w-12 rounded-xl bg-gradient-to-tr from-green-500/20 to-green-600/20 flex items-center justify-center">
                        <i class="fas fa-dollar-sign text-green-400 text-xl"></i>
                    </div>
                </div>
                <div class="mt-4 flex items-center">
                    <span class="text-white/60 text-sm font-medium">No revenue data</span>
                </div>
            </div>

            <div class="glass-card rounded-xl p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-white/70 text-sm font-medium">Success Rate</p>
                        <p class="text-3xl font-bold text-cyan-400" id="successRate"><?php echo $successRate; ?>%</p>
                    </div>
                    <div class="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-cyan-600/20 flex items-center justify-center">
                        <i class="fas fa-chart-line text-cyan-400 text-xl"></i>
                    </div>
                </div>
                <div class="mt-4 flex items-center">
                    <span class="text-cyan-400 text-sm font-medium">+2.1%</span>
                    <span class="text-white/70 text-sm ml-2">improvement</span>
                </div>
            </div>
        </div>

        <!-- Main Dashboard Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Analytics Dashboard Card -->
            <div class="glass-card rounded-xl p-8 card-hover">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-4">
                        <div class="h-16 w-16 rounded-xl bg-gradient-to-tr from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                            <i class="fas fa-chart-bar text-blue-400 text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-bold text-white">Analytics Dashboard</h3>
                            <p class="text-white/70">Track website performance and user behavior</p>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4 mb-6">
                    <div class="flex items-center justify-between">
                        <span class="text-white/70">Page Views</span>
                        <span class="text-white font-semibold"><?php echo number_format($pageViews7d); ?></span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-white/70">Unique Visitors</span>
                        <span class="text-white font-semibold"><?php echo number_format($totalVisitors); ?></span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-white/70">Conversion Rate</span>
                        <span class="text-white font-semibold"><?php echo $conversionRate; ?>%</span>
                    </div>
                </div>

                <button onclick="openAnalytics()" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2">
                    <i class="fas fa-chart-line"></i>
                    <span>Open Analytics Dashboard</span>
                </button>
            </div>

            <!-- Submissions Dashboard Card -->
            <div class="glass-card rounded-xl p-8 card-hover">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-4">
                        <div class="h-16 w-16 rounded-xl bg-gradient-to-tr from-green-500/20 to-green-600/20 flex items-center justify-center">
                            <i class="fas fa-clipboard-list text-green-400 text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-bold text-white">Submissions Dashboard</h3>
                            <p class="text-white/70">Manage customer orders and inquiries</p>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4 mb-6">
                    <div class="flex items-center justify-between">
                        <span class="text-white/70">Pending Reviews</span>
                        <span class="text-yellow-400 font-semibold"><?php echo number_format($pendingCount); ?></span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-white/70">Completed Today</span>
                        <span class="text-green-400 font-semibold"><?php echo number_format($completedToday); ?></span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-white/70">Avg Response Time</span>
                        <span class="text-white font-semibold"><?php echo $avgRespDisplay; ?></span>
                    </div>
                </div>

                <button onclick="openSubmissions()" class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2">
                    <i class="fas fa-clipboard-check"></i>
                    <span>Open Submissions Dashboard</span>
                </button>
            </div>
        </div>

        <!-- P2P Config Card -->
        <div class="glass-card rounded-xl p-8 mb-8">
            <h3 class="text-2xl font-bold text-white mb-6">P2P USDT Ad Codes</h3>
            <form onsubmit="saveP2PConfig(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm text-white/70 mb-1">Buy ad code</label>
                        <input id="p2pBuyCode" type="text" class="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white" placeholder="e.g. j15stHvu1u4" />
                    </div>
                    <div>
                        <label class="block text-sm text-white/70 mb-1">Sell ad code</label>
                        <input id="p2pSellCode" type="text" class="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white" placeholder="e.g. HrOzHzvC5uj" />
                    </div>
                </div>
                <button id="p2pSaveBtn" class="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg">Save</button>
            </form>
            <p class="text-xs text-white/60 mt-3">Note: Frontend polls every 30s; server caches for 15s.</p>
        </div>

        <!-- Additional Tools Section -->
        <div class="glass-card rounded-xl p-8">
            <h3 class="text-2xl font-bold text-white mb-6">Additional Tools</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- User Management -->
                <div class="glass-card rounded-lg p-6 card-hover">
                    <div class="flex items-center space-x-3 mb-4">
                        <div class="h-10 w-10 rounded-lg bg-gradient-to-tr from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                            <i class="fas fa-user-cog text-purple-400"></i>
                        </div>
                        <h4 class="text-lg font-semibold text-white">User Management</h4>
                    </div>
                    <p class="text-white/70 text-sm mb-4">Manage user accounts and permissions</p>
                    <button class="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200">
                        Coming Soon
                    </button>
                </div>

                <!-- Order Management -->
                <div class="glass-card rounded-lg p-6 card-hover">
                    <div class="flex items-center space-x-3 mb-4">
                        <div class="h-10 w-10 rounded-lg bg-gradient-to-tr from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                            <i class="fas fa-shopping-bag text-orange-400"></i>
                        </div>
                        <h4 class="text-lg font-semibold text-white">Order Management</h4>
                    </div>
                    <p class="text-white/70 text-sm mb-4">Track and manage all orders</p>
                    <button class="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200">
                        Coming Soon
                    </button>
                </div>

                <!-- Completed Orders -->
                <div class="glass-card rounded-lg p-6 card-hover">
                    <div class="flex items-center space-x-3 mb-4">
                        <div class="h-10 w-10 rounded-lg bg-gradient-to-tr from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
                            <i class="fas fa-clipboard-check text-emerald-400"></i>
                        </div>
                        <h4 class="text-lg font-semibold text-white">Completed Orders</h4>
                    </div>
                    <p class="text-white/70 text-sm mb-4">Review finalized trades with attached proofs</p>
                    <a href="completed_orders.php" class="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200">
                        <i class="fas fa-eye"></i>
                        View Archive
                    </a>
                </div>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="glass-card rounded-xl p-8 mt-8">
            <h3 class="text-2xl font-bold text-white mb-6">Recent Activity</h3>
            <div class="space-y-4">
                <div class="flex items-center space-x-4 p-4 glass-card rounded-lg">
                    <div class="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <i class="fas fa-check text-green-400 text-sm"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-white font-medium">New order completed</p>
                        <p class="text-white/70 text-sm">Order #ORD-123456 - $150 USDT</p>
                    </div>
                    <span class="text-white/70 text-sm">2 minutes ago</span>
                </div>
                
                <div class="flex items-center space-x-4 p-4 glass-card rounded-lg">
                    <div class="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <i class="fas fa-user text-blue-400 text-sm"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-white font-medium">New user registered</p>
                        <p class="text-white/70 text-sm">john.doe@example.com</p>
                    </div>
                    <span class="text-white/70 text-sm">5 minutes ago</span>
                </div>
                
                <div class="flex items-center space-x-4 p-4 glass-card rounded-lg">
                    <div class="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <i class="fas fa-exclamation text-yellow-400 text-sm"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-white font-medium">Pending review</p>
                        <p class="text-white/70 text-sm">Order #ORD-123457 needs attention</p>
                    </div>
                    <span class="text-white/70 text-sm">10 minutes ago</span>
                </div>
            </div>
        </div>
    </main>

    <script defer>
        const notifSound = document.getElementById('notifSound');
        let previousPendingCount = null;
        let notifSoundPrimed = false;
        let soundPromptEl = null;

        function hideSoundPrompt() {
            if (soundPromptEl) {
                soundPromptEl.remove();
                soundPromptEl = null;
            }
        }

        function showSoundPrompt() {
            if (soundPromptEl || notifSoundPrimed) return;
            soundPromptEl = document.createElement('div');
            soundPromptEl.className = 'fixed top-20 right-4 z-50 bg-amber-500/90 text-black px-4 py-2 rounded-lg shadow-lg cursor-pointer flex items-center gap-2';
            soundPromptEl.innerHTML = '<i class="fas fa-volume-up"></i><span>Enable notification sound</span>';
            soundPromptEl.addEventListener('click', () => {
                primeNotifSound(true);
            });
            document.body.appendChild(soundPromptEl);
        }

        function primeNotifSound(forceAttempt = false) {
            if (!notifSound || notifSoundPrimed) {
                hideSoundPrompt();
                return;
            }
            if (!forceAttempt && document.visibilityState !== 'visible') {
                return;
            }
            const attempt = notifSound.play();
            if (attempt && typeof attempt.then === 'function') {
                attempt.then(() => {
                    notifSound.pause();
                    notifSound.currentTime = 0;
                    notifSoundPrimed = true;
                    hideSoundPrompt();
                }).catch(() => {
                    notifSound.pause();
                    notifSound.currentTime = 0;
                    showSoundPrompt();
                });
            } else {
                notifSoundPrimed = true;
                hideSoundPrompt();
            }
        }

        function openAnalytics() {
            window.open('dashboard_real.php', '_blank');
        }

        function openSubmissions() {
            window.open('submissions_dashboard.php', '_blank');
        }

        async function updateNotifBadge() {
            try {
                const res = await fetch('../api/submissions.php?action=pending_count');
                const j = await res.json();
                const badge = document.getElementById('notifBadge');
                if (j.success && typeof j.pending === 'number') {
                    if (previousPendingCount !== null && j.pending > previousPendingCount && notifSound) {
                        try {
                            notifSound.currentTime = 0;
                            const playPromise = notifSound.play();
                            if (playPromise && typeof playPromise.then === 'function') {
                                playPromise.then(() => {
                                    notifSoundPrimed = true;
                                    hideSoundPrompt();
                                }).catch(() => {
                                    showSoundPrompt();
                                });
                            } else {
                                notifSoundPrimed = true;
                            }
                        } catch (err) {
                            showSoundPrompt();
                        }
                    }
                    if (j.pending > 0) {
                        badge.textContent = j.pending > 99 ? '99+' : String(j.pending);
                        badge.classList.remove('hidden');
                    } else {
                        badge.classList.add('hidden');
                    }
                    previousPendingCount = j.pending;
                } else if (previousPendingCount === null) {
                    previousPendingCount = 0;
                }
            } catch (e) {}
        }

        async function loadNotifications() {
            try {
                const res = await fetch('../api/submissions.php?action=notifications_list&limit=10');
                const j = await res.json();
                const list = document.getElementById('notifList');
                list.innerHTML = '';
                if (j.success && Array.isArray(j.notifications) && j.notifications.length) {
                    j.notifications.forEach(n => {
                        let formData = n.form_data;
                        if (formData && typeof formData === 'string') {
                            try {
                                formData = JSON.parse(formData);
                            } catch (_) {
                                formData = {};
                            }
                        }
                        const user = (n.user_info && (n.user_info.name || n.user_info.email)) || 'Visitor';
                        const amount = formData && (formData.amount || formData.usdt || formData.tzs) || '';
                        const orderTypeRaw = formData && (formData.order_type || formData.trade_type || formData.tradeType || formData.action || formData.mode);
                        const orderType = typeof orderTypeRaw === 'string' ? orderTypeRaw.trim().toLowerCase() : '';
                        const isBuy = orderType === 'buy';
                        const isSell = orderType === 'sell';
                        const badge = isBuy || isSell
                            ? `<span class="${isBuy ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'} px-1.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide">${isBuy ? 'Buy' : 'Sell'}</span>`
                            : '';
                        const titleParts = [
                            `#${n.id}`,
                            n.submission_type ? n.submission_type.replace('_',' ') : 'submission'
                        ];
                        const infoLine = [titleParts.join(' '), badge].filter(Boolean).join(' ');
                        const row = document.createElement('div');
                        row.className = 'flex items-start justify-between gap-2 bg-white/5 rounded-md px-3 py-2';
                        row.innerHTML = `
                            <div class="text-sm">
                                <div class="flex items-center gap-2 text-white flex-wrap">${infoLine}${amount ? `<span class="text-white/70 text-xs font-medium">• ${amount}</span>` : ''}</div>
                                <div class="text-white/60 text-xs">${user}</div>
                            </div>
                            <button data-id="${n.id}" data-order-type="${orderType}" data-submission-type="${n.submission_type || ''}" class="markRead px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white">View</button>
                        `;
                        list.appendChild(row);
                    });
                } else {
                    list.innerHTML = '<div class="text-white/60 text-sm">No new submissions</div>';
                }

                // wire buttons
                list.querySelectorAll('.markRead').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.getAttribute('data-id');
                        const orderTypeAttr = (e.currentTarget.getAttribute('data-order-type') || '').toLowerCase();
                        const submissionTypeAttr = (e.currentTarget.getAttribute('data-submission-type') || '').toLowerCase();
                        const resolvedType = (() => {
                            if (orderTypeAttr === 'buy' || orderTypeAttr === 'sell') {
                                return orderTypeAttr;
                            }
                            if (submissionTypeAttr.includes('buy')) return 'buy';
                            if (submissionTypeAttr.includes('sell')) return 'sell';
                            return '';
                        })();
                        const orderPage = resolvedType === 'buy'
                            ? '../buy order.html'
                            : resolvedType === 'sell'
                                ? '../sell order.html'
                                : 'dashboard_real.php';
                        try {
                            await fetch('../api/submissions.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_viewed', submission_id: id }) });
                        } catch {}
                        // refresh badge and list
                        updateNotifBadge();
                        loadNotifications();
                        // hide dropdown and open specific page
                        document.getElementById('notifDropdown').classList.add('hidden');
                        try {
                            let targetUrl = orderPage;
                            if (orderPage !== 'dashboard_real.php') {
                                const url = new URL(orderPage, window.location.href);
                                url.searchParams.set('id', id);
                                // cache preview payload for fallback rendering
                                try {
                                    const cacheKey = `submission-preview-${id}`;
                                    localStorage.setItem(cacheKey, JSON.stringify(n));
                                    localStorage.setItem('submission-preview-latest', JSON.stringify({ id, data: n }));
                                } catch (_) {}
                                targetUrl = url.toString();
                            }
                            window.location.href = targetUrl;
                        } catch (err) {
                            console.error('Failed to open order preview', err);
                            window.location.href = 'dashboard_real.php';
                        }
                    });
                });
            } catch (e) {}
        }

        function refreshData() {
            // Simulate data refresh
            document.getElementById('lastLogin').textContent = new Date().toLocaleTimeString();
            
            // Add a subtle animation to show refresh
            const cards = document.querySelectorAll('.card-hover');
            cards.forEach(card => {
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 200);
            });
        }

        // Update last login time
        document.getElementById('lastLogin').textContent = new Date().toLocaleTimeString();

        // Adaptive polling: slower on mobile, faster on desktop
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const NOTIF_POLL_INTERVAL = isMobile ? 10000 : 5000; // 10s on mobile, 5s on desktop
        document.addEventListener('click', () => primeNotifSound(true), { passive: true });
        document.addEventListener('touchstart', () => primeNotifSound(true), { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                primeNotifSound();
            }
        });

        // Initial notifications and near real-time polling
        updateNotifBadge();
        setInterval(updateNotifBadge, NOTIF_POLL_INTERVAL);

        // Toggle dropdown on bell click
        document.getElementById('notifBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const dd = document.getElementById('notifDropdown');
            const hidden = dd.classList.contains('hidden');
            if (hidden) { loadNotifications(); }
            dd.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const btn = document.getElementById('notifBtn');
            const dd = document.getElementById('notifDropdown');
            if (!btn.contains(e.target) && !dd.contains(e.target)) {
                dd.classList.add('hidden');
            }
        });

        // Add some interactive effects
        document.addEventListener('DOMContentLoaded', function() {
            // Add hover effects to cards
            const cards = document.querySelectorAll('.card-hover');
            cards.forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-4px)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = '';
                });
            });
        });

        // P2P config load/save
        async function loadP2PConfig(){
            try {
                const res = await fetch('../api/p2p_config.php');
                const j = await res.json();
                if (j.success) {
                    const d = j.data || {};
                    const buy = document.getElementById('p2pBuyCode');
                    const sell = document.getElementById('p2pSellCode');
                    if (buy) buy.value = d.buyCode || '';
                    if (sell) sell.value = d.sellCode || '';
                }
            } catch(e) { console.error(e); }
        }
        async function saveP2PConfig(ev){
            ev.preventDefault();
            const btn = document.getElementById('p2pSaveBtn');
            if (btn){ btn.disabled = true; btn.textContent = 'Saving...'; }
            try {
                const body = {
                    buyCode: document.getElementById('p2pBuyCode').value.trim(),
                    sellCode: document.getElementById('p2pSellCode').value.trim()
                };
                const res = await fetch('../api/p2p_config.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const j = await res.json();
                if (!j.success) throw new Error(j.error || 'Failed to save');
                alert('Saved. Frontend will use new links within ~30s.');
            } catch(e) {
                alert('Error: ' + e.message);
            } finally {
                if (btn){ btn.disabled = false; btn.textContent = 'Save'; }
            }
        }

        document.addEventListener('DOMContentLoaded', loadP2PConfig);
    </script>

    <script src="../dist/js/loader.js" defer></script>
    </body>
</html>

