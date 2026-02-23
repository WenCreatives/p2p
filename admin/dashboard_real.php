<?php
require_once 'auth_check.php';
require_once '../config/database.php';

class AdminDashboard {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function getAnalyticsData($period = '7d') {
        $dateCondition = $this->getDateCondition($period);
        $previousDateCondition = $this->getPreviousDateCondition($period);
        
        // Total visitors
        $query = "SELECT COUNT(DISTINCT session_id) as total_visitors FROM analytics_events WHERE created_at >= $dateCondition";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $visitors = $stmt->fetch(PDO::FETCH_ASSOC);

        // Previous period visitors for comparison
        $query = "SELECT COUNT(DISTINCT session_id) as prev_visitors FROM analytics_events WHERE created_at >= $previousDateCondition AND created_at < $dateCondition";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $prevVisitors = $stmt->fetch(PDO::FETCH_ASSOC);

        // Page views
        $query = "SELECT COUNT(*) as total_page_views FROM analytics_page_views WHERE created_at >= $dateCondition";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $pageViews = $stmt->fetch(PDO::FETCH_ASSOC);

        // Previous period page views
        $query = "SELECT COUNT(*) as prev_page_views FROM analytics_page_views WHERE created_at >= $previousDateCondition AND created_at < $dateCondition";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $prevPageViews = $stmt->fetch(PDO::FETCH_ASSOC);

        // Most popular pages
        $query = "SELECT page_url, COUNT(*) as views FROM analytics_page_views WHERE created_at >= $dateCondition GROUP BY page_url ORDER BY views DESC LIMIT 5";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $popularPages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Wizard analytics
        $query = "SELECT 
                    COUNT(DISTINCT session_id) as total_starts,
                    COUNT(CASE WHEN wizard_step = 7 THEN 1 END) as completions,
                    COUNT(CASE WHEN action_type = 'Buy' THEN 1 END) as buy_orders,
                    COUNT(CASE WHEN action_type = 'Sell' THEN 1 END) as sell_orders
                  FROM analytics_wizard WHERE created_at >= $dateCondition";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $wizardStats = $stmt->fetch(PDO::FETCH_ASSOC);

        // Previous period wizard stats
        $query = "SELECT 
                    COUNT(DISTINCT session_id) as prev_starts,
                    COUNT(CASE WHEN wizard_step = 7 THEN 1 END) as prev_completions
                  FROM analytics_wizard WHERE created_at >= $previousDateCondition AND created_at < $dateCondition";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $prevWizardStats = $stmt->fetch(PDO::FETCH_ASSOC);

        // Device breakdown
        $query = "SELECT device_type, COUNT(DISTINCT session_id) as count FROM analytics_events WHERE created_at >= $dateCondition GROUP BY device_type";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $deviceStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Browser breakdown
        $query = "SELECT browser, COUNT(DISTINCT session_id) as count FROM analytics_events WHERE created_at >= $dateCondition GROUP BY browser ORDER BY count DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $browserStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Recent events
        $query = "SELECT event_name, event_type, created_at, page_url FROM analytics_events WHERE created_at >= $dateCondition ORDER BY created_at DESC LIMIT 20";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $recentEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate percentage changes
        $visitorChange = $this->calculatePercentageChange($visitors['total_visitors'], $prevVisitors['prev_visitors']);
        $pageViewChange = $this->calculatePercentageChange($pageViews['total_page_views'], $prevPageViews['prev_page_views']);
        $completionChange = $this->calculatePercentageChange($wizardStats['completions'], $prevWizardStats['prev_completions']);
        $startChange = $this->calculatePercentageChange($wizardStats['total_starts'], $prevWizardStats['prev_starts']);

        return array(
            'success' => true,
            'data' => array(
                'visitors' => $visitors['total_visitors'],
                'page_views' => $pageViews['total_page_views'],
                'popular_pages' => $popularPages,
                'wizard_stats' => $wizardStats,
                'device_stats' => $deviceStats,
                'browser_stats' => $browserStats,
                'recent_events' => $recentEvents,
                'changes' => array(
                    'visitors' => $visitorChange,
                    'page_views' => $pageViewChange,
                    'completions' => $completionChange,
                    'starts' => $startChange
                )
            )
        );
    }

    private function calculatePercentageChange($current, $previous) {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }
        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function getDateCondition($period) {
        switch($period) {
            case '1d': return "DATE_SUB(NOW(), INTERVAL 1 DAY)";
            case '7d': return "DATE_SUB(NOW(), INTERVAL 7 DAY)";
            case '30d': return "DATE_SUB(NOW(), INTERVAL 30 DAY)";
            default: return "DATE_SUB(NOW(), INTERVAL 7 DAY)";
        }
    }

    private function getPreviousDateCondition($period) {
        switch($period) {
            case '1d': return "DATE_SUB(NOW(), INTERVAL 2 DAY)";
            case '7d': return "DATE_SUB(NOW(), INTERVAL 14 DAY)";
            case '30d': return "DATE_SUB(NOW(), INTERVAL 60 DAY)";
            default: return "DATE_SUB(NOW(), INTERVAL 14 DAY)";
        }
    }
}

$dashboard = new AdminDashboard();
$period = $_GET['period'] ?? '7d';
$data = $dashboard->getAnalyticsData($period);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Analytics Dashboard - jordanmwinukatz P2P Trading</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            50: '#fefce8',
                            100: '#fef3c7',
                            200: '#fde68a',
                            300: '#fcd34d',
                            400: '#fbbf24',
                            500: '#f59e0b',
                            600: '#d97706',
                            700: '#b45309',
                            800: '#92400e',
                            900: '#78350f',
                        }
                    }
                }
            }
        }
    </script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-black min-h-screen text-white">
    <div class="min-h-screen">
        <!-- Mobile-Friendly Professional Header -->
        <header class="border-b border-white/10 shadow-2xl" style="background: linear-gradient(90deg, rgba(251,191,36,0.18), rgba(253,224,71,0.12), rgba(34,211,238,0.18));">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center py-6 lg:py-8 space-y-4 lg:space-y-0">
                    <div class="flex items-center space-x-3 lg:space-x-4">
                        <div class="p-2 lg:p-3 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl shadow-lg">
                            <i class="fas fa-chart-line text-xl lg:text-2xl text-white"></i>
                        </div>
                        <div>
                            <h1 class="text-2xl lg:text-4xl font-bold bg-clip-text text-transparent" style="background-image: linear-gradient(90deg, #fbbf24, #fde047, #22d3ee);">
                                Analytics Dashboard
                            </h1>
                            <p class="text-white/70 text-sm lg:text-lg font-medium">jordanmwinukatz P2P Trading</p>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                        <a href="index.php" class="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm lg:text-base flex items-center justify-center">
                            <i class="fas fa-arrow-left mr-2"></i><span>Back to Main</span>
                        </a>
                        <a href="logout.php" class="px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm lg:text-base flex items-center justify-center">
                            <i class="fas fa-sign-out-alt mr-2"></i><span>Logout</span>
                        </a>
                        <div class="flex items-center space-x-2 lg:space-x-3">
                            <i class="fas fa-calendar-alt text-sm lg:text-base" style="color:#fbbf24"></i>
                            <select id="periodSelect" class="bg-white/5 border border-white/10 rounded-xl px-3 lg:px-4 py-2 lg:py-3 text-white font-medium focus:ring-2 focus:ring-[#22d3ee] focus:border-transparent transition-all duration-200 text-sm lg:text-base flex-1">
                                <option value="1d" <?= $period === '1d' ? 'selected' : '' ?>>Last 24 Hours</option>
                                <option value="7d" <?= $period === '7d' ? 'selected' : '' ?>>Last 7 Days</option>
                                <option value="30d" <?= $period === '30d' ? 'selected' : '' ?>>Last 30 Days</option>
                            </select>
                        </div>
                        <button onclick="location.reload()" class="text-white px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 text-sm lg:text-base" style="background-image: linear-gradient(90deg, #fbbf24, #22d3ee);">
                            <i class="fas fa-sync-alt"></i>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Mobile-Friendly Professional Stats Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-8 lg:mb-12">
                <!-- Total Visitors Card -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-600 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div class="flex-1">
                            <p class="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Visitors</p>
                            <p class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-1 sm:mt-2"><?= number_format($data['data']['visitors']) ?></p>
                            <div class="flex items-center mt-1 sm:mt-2">
                                <i class="fas fa-arrow-<?= $data['data']['changes']['visitors'] >= 0 ? 'up' : 'down' ?> text-<?= $data['data']['changes']['visitors'] >= 0 ? 'green' : 'red' ?>-400 text-xs sm:text-sm"></i>
                                <span class="text-<?= $data['data']['changes']['visitors'] >= 0 ? 'green' : 'red' ?>-400 text-xs sm:text-sm font-medium ml-1">
                                    <?= $data['data']['changes']['visitors'] >= 0 ? '+' : '' ?><?= $data['data']['changes']['visitors'] ?>% from last period
                                </span>
                            </div>
                        </div>
                        <div class="p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg self-start sm:self-auto">
                            <i class="fas fa-users text-lg sm:text-xl lg:text-2xl text-white"></i>
                        </div>
                    </div>
                </div>

                <!-- Page Views Card -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-600 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div class="flex-1">
                            <p class="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Page Views</p>
                            <p class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-1 sm:mt-2"><?= number_format($data['data']['page_views']) ?></p>
                            <div class="flex items-center mt-1 sm:mt-2">
                                <i class="fas fa-arrow-<?= $data['data']['changes']['page_views'] >= 0 ? 'up' : 'down' ?> text-<?= $data['data']['changes']['page_views'] >= 0 ? 'green' : 'red' ?>-400 text-xs sm:text-sm"></i>
                                <span class="text-<?= $data['data']['changes']['page_views'] >= 0 ? 'green' : 'red' ?>-400 text-xs sm:text-sm font-medium ml-1">
                                    <?= $data['data']['changes']['page_views'] >= 0 ? '+' : '' ?><?= $data['data']['changes']['page_views'] ?>% from last period
                                </span>
                            </div>
                        </div>
                        <div class="p-3 sm:p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg self-start sm:self-auto">
                            <i class="fas fa-eye text-lg sm:text-xl lg:text-2xl text-white"></i>
                        </div>
                    </div>
                </div>

                <!-- Wizard Completions Card -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-600 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div class="flex-1">
                            <p class="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Wizard Completions</p>
                            <p class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-1 sm:mt-2"><?= number_format($data['data']['wizard_stats']['completions']) ?></p>
                            <div class="flex items-center mt-1 sm:mt-2">
                                <i class="fas fa-arrow-<?= $data['data']['changes']['completions'] >= 0 ? 'up' : 'down' ?> text-<?= $data['data']['changes']['completions'] >= 0 ? 'primary' : 'red' ?>-400 text-xs sm:text-sm"></i>
                                <span class="text-<?= $data['data']['changes']['completions'] >= 0 ? 'primary' : 'red' ?>-400 text-xs sm:text-sm font-medium ml-1">
                                    <?= $data['data']['changes']['completions'] >= 0 ? '+' : '' ?><?= $data['data']['changes']['completions'] ?>% from last period
                                </span>
                            </div>
                        </div>
                        <div class="p-3 sm:p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg self-start sm:self-auto">
                            <i class="fas fa-check-circle text-lg sm:text-xl lg:text-2xl text-white"></i>
                        </div>
                    </div>
                </div>

                <!-- Completion Rate Card -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-600 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div class="flex-1">
                            <p class="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Completion Rate</p>
                            <p class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-1 sm:mt-2">
                                <?= $data['data']['wizard_stats']['total_starts'] > 0 ? 
                                    round(($data['data']['wizard_stats']['completions'] / $data['data']['wizard_stats']['total_starts']) * 100, 1) : 0 ?>%
                            </p>
                            <div class="flex items-center mt-1 sm:mt-2">
                                <i class="fas fa-arrow-<?= $data['data']['changes']['starts'] >= 0 ? 'up' : 'down' ?> text-<?= $data['data']['changes']['starts'] >= 0 ? 'purple' : 'red' ?>-400 text-xs sm:text-sm"></i>
                                <span class="text-<?= $data['data']['changes']['starts'] >= 0 ? 'purple' : 'red' ?>-400 text-xs sm:text-sm font-medium ml-1">
                                    <?= $data['data']['changes']['starts'] >= 0 ? '+' : '' ?><?= $data['data']['changes']['starts'] ?>% from last period
                                </span>
                            </div>
                        </div>
                        <div class="p-3 sm:p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg self-start sm:self-auto">
                            <i class="fas fa-chart-line text-lg sm:text-xl lg:text-2xl text-white"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile-Friendly Professional Content Sections -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8 lg:mb-12">
                <!-- Popular Pages Section -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-600 shadow-2xl">
                    <div class="flex items-center mb-4 sm:mb-6">
                        <div class="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3 sm:mr-4">
                            <i class="fas fa-globe text-lg sm:text-xl text-white"></i>
                        </div>
                        <h3 class="text-lg sm:text-xl lg:text-2xl font-bold text-white">Most Popular Pages</h3>
                    </div>
                    <div class="space-y-4">
                        <?php if(empty($data['data']['popular_pages'])): ?>
                        <div class="text-center py-8">
                            <i class="fas fa-chart-bar text-4xl text-gray-500 mb-4"></i>
                            <p class="text-gray-400">No page data available</p>
                        </div>
                        <?php else: ?>
                        <?php foreach($data['data']['popular_pages'] as $index => $page): ?>
                        <div class="bg-gray-700 rounded-xl p-4 hover:bg-gray-600 transition-all duration-200">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                        <?= $index + 1 ?>
                                    </div>
                                    <div>
                                        <p class="text-white font-medium truncate max-w-xs"><?= htmlspecialchars($page['page_url']) ?></p>
                                        <p class="text-gray-400 text-sm">Page URL</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-2xl font-bold text-primary-400"><?= number_format($page['views']) ?></p>
                                    <p class="text-gray-400 text-sm">views</p>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Device & Browser Stats Section -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-600 shadow-2xl">
                    <div class="flex items-center mb-4 sm:mb-6">
                        <div class="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg mr-3 sm:mr-4">
                            <i class="fas fa-mobile-alt text-lg sm:text-xl text-white"></i>
                        </div>
                        <h3 class="text-lg sm:text-xl lg:text-2xl font-bold text-white">Device & Browser Stats</h3>
                    </div>
                    <div class="space-y-6">
                        <!-- Devices Section -->
                        <div>
                            <div class="flex items-center mb-4">
                                <i class="fas fa-laptop text-primary-400 mr-2"></i>
                                <h4 class="text-lg font-semibold text-white">Devices</h4>
                            </div>
                            <div class="space-y-3">
                                <?php if(empty($data['data']['device_stats'])): ?>
                                <p class="text-gray-400 text-center py-4">No device data available</p>
                                <?php else: ?>
                                <?php foreach($data['data']['device_stats'] as $device): ?>
                                <div class="bg-gray-700 rounded-xl p-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                                <i class="fas fa-<?= $device['device_type'] === 'mobile' ? 'mobile-alt' : ($device['device_type'] === 'tablet' ? 'tablet-alt' : 'desktop') ?> text-white"></i>
                                            </div>
                                            <span class="text-white font-medium"><?= ucfirst($device['device_type']) ?></span>
                                        </div>
                                        <span class="text-xl font-bold text-blue-400"><?= number_format($device['count']) ?></span>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                                <?php endif; ?>
                            </div>
                        </div>

                        <!-- Browsers Section -->
                        <div>
                            <div class="flex items-center mb-4">
                                <i class="fas fa-browser text-green-400 mr-2"></i>
                                <h4 class="text-lg font-semibold text-white">Browsers</h4>
                            </div>
                            <div class="space-y-3">
                                <?php if(empty($data['data']['browser_stats'])): ?>
                                <p class="text-gray-400 text-center py-4">No browser data available</p>
                                <?php else: ?>
                                <?php foreach($data['data']['browser_stats'] as $browser): ?>
                                <div class="bg-gray-700 rounded-xl p-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                                                <i class="fas fa-globe text-white"></i>
                                            </div>
                                            <span class="text-white font-medium"><?= $browser['browser'] ?></span>
                                        </div>
                                        <span class="text-xl font-bold text-green-400"><?= number_format($browser['count']) ?></span>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <!-- Mobile-Friendly Professional Recent Events -->
            <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-600 shadow-2xl">
                <div class="flex items-center mb-6 sm:mb-8">
                    <div class="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg mr-3 sm:mr-4">
                        <i class="fas fa-clock text-lg sm:text-xl text-white"></i>
                    </div>
                    <h3 class="text-lg sm:text-xl lg:text-2xl font-bold text-white">Recent Activity</h3>
                </div>
                
                <?php if(empty($data['data']['recent_events'])): ?>
                <div class="text-center py-12">
                    <i class="fas fa-chart-line text-6xl text-gray-500 mb-6"></i>
                    <h4 class="text-xl font-semibold text-gray-400 mb-2">No Recent Activity</h4>
                    <p class="text-gray-500">User interactions will appear here once tracking begins</p>
                </div>
                <?php else: ?>
                <div class="space-y-4">
                    <?php foreach($data['data']['recent_events'] as $event): ?>
                    <div class="bg-gray-700 rounded-xl p-6 hover:bg-gray-600 transition-all duration-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                    <i class="fas fa-<?= $event['event_type'] === 'page_view' ? 'eye' : ($event['event_type'] === 'user_action' ? 'mouse-pointer' : 'chart-bar') ?> text-white"></i>
                                </div>
                                <div>
                                    <h4 class="text-lg font-semibold text-white"><?= htmlspecialchars($event['event_name']) ?></h4>
                                    <p class="text-gray-400"><?= htmlspecialchars($event['event_type']) ?> • <?= htmlspecialchars($event['page_url']) ?></p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-primary-400 font-semibold"><?= date('H:i:s', strtotime($event['created_at'])) ?></p>
                                <p class="text-gray-500 text-sm"><?= date('M j', strtotime($event['created_at'])) ?></p>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
            </div>
        </main>
    </div>

    <script>
        // Period selector
        document.getElementById('periodSelect').addEventListener('change', function() {
            const period = this.value;
            window.location.href = `?period=${period}`;
        });
    </script>
</body>
</html>
