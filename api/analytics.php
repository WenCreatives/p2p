<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

class AnalyticsAPI {
    private $conn;
    private $table_name = "analytics_events";

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // Track a general event
    public function trackEvent($data) {
        try {
            $query = "INSERT INTO " . $this->table_name . " 
                     (event_type, event_name, user_id, session_id, page_url, referrer, user_agent, ip_address, country, city, device_type, browser, event_data) 
                     VALUES (:event_type, :event_name, :user_id, :session_id, :page_url, :referrer, :user_agent, :ip_address, :country, :city, :device_type, :browser, :event_data)";

            $stmt = $this->conn->prepare($query);
            
            $stmt->bindParam(':event_type', $data['event_type']);
            $stmt->bindParam(':event_name', $data['event_name']);
            $stmt->bindParam(':user_id', $data['user_id']);
            $stmt->bindParam(':session_id', $data['session_id']);
            $stmt->bindParam(':page_url', $data['page_url']);
            $stmt->bindParam(':referrer', $data['referrer']);
            $stmt->bindParam(':user_agent', $data['user_agent']);
            $stmt->bindParam(':ip_address', $data['ip_address']);
            $stmt->bindParam(':country', $data['country']);
            $stmt->bindParam(':city', $data['city']);
            $stmt->bindParam(':device_type', $data['device_type']);
            $stmt->bindParam(':browser', $data['browser']);
            $stmt->bindParam(':event_data', $data['event_data']);

            if ($stmt->execute()) {
                return array('success' => true, 'message' => 'Event tracked successfully');
            }
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }

    // Track page view
    public function trackPageView($data) {
        try {
            // Insert into page views table
            $query = "INSERT INTO analytics_page_views (session_id, page_url, page_title, time_on_page) 
                     VALUES (:session_id, :page_url, :page_title, :time_on_page)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':session_id', $data['session_id']);
            $stmt->bindParam(':page_url', $data['page_url']);
            $stmt->bindParam(':page_title', $data['page_title']);
            $stmt->bindParam(':time_on_page', $data['time_on_page']);

            if ($stmt->execute()) {
                // Also track as general event
                $this->trackEvent(array_merge($data, [
                    'event_type' => 'page_view',
                    'event_name' => 'page_view',
                    'user_id' => null,
                    'referrer' => null,
                    'user_agent' => null,
                    'ip_address' => null,
                    'country' => null,
                    'city' => null,
                    'device_type' => null,
                    'browser' => null,
                    'event_data' => null
                ]));
                
                return array('success' => true, 'message' => 'Page view tracked');
            }
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }

    // Track wizard step
    public function trackWizardStep($data) {
        try {
            $query = "INSERT INTO analytics_wizard (session_id, wizard_step, action_type, payment_method, route_type, step_data) 
                     VALUES (:session_id, :wizard_step, :action_type, :payment_method, :route_type, :step_data)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':session_id', $data['session_id']);
            $stmt->bindParam(':wizard_step', $data['wizard_step']);
            $stmt->bindParam(':action_type', $data['action_type']);
            $stmt->bindParam(':payment_method', $data['payment_method']);
            $stmt->bindParam(':route_type', $data['route_type']);
            $stmt->bindParam(':step_data', $data['step_data']);

            if ($stmt->execute()) {
                return array('success' => true, 'message' => 'Wizard step tracked');
            }
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }

    // Get analytics data for dashboard
    public function getAnalyticsData($period = '7d') {
        try {
            $dateCondition = $this->getDateCondition($period);
            
            // Total visitors
            $query = "SELECT COUNT(DISTINCT session_id) as total_visitors FROM analytics_events WHERE created_at >= $dateCondition";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $visitors = $stmt->fetch(PDO::FETCH_ASSOC);

            // Page views
            $query = "SELECT COUNT(*) as total_page_views FROM analytics_page_views WHERE created_at >= $dateCondition";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $pageViews = $stmt->fetch(PDO::FETCH_ASSOC);

            // Most popular pages
            $query = "SELECT page_url, COUNT(*) as views FROM analytics_page_views WHERE created_at >= $dateCondition GROUP BY page_url ORDER BY views DESC LIMIT 5";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $popularPages = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Wizard completion rate
            $query = "SELECT 
                        COUNT(DISTINCT session_id) as total_starts,
                        COUNT(CASE WHEN wizard_step = 7 THEN 1 END) as completions
                      FROM analytics_wizard WHERE created_at >= $dateCondition";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $wizardStats = $stmt->fetch(PDO::FETCH_ASSOC);

            return array(
                'success' => true,
                'data' => array(
                    'visitors' => $visitors['total_visitors'],
                    'page_views' => $pageViews['total_page_views'],
                    'popular_pages' => $popularPages,
                    'wizard_stats' => $wizardStats
                )
            );
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }

    private function getDateCondition($period) {
        switch($period) {
            case '1d': return "DATE_SUB(NOW(), INTERVAL 1 DAY)";
            case '7d': return "DATE_SUB(NOW(), INTERVAL 7 DAY)";
            case '30d': return "DATE_SUB(NOW(), INTERVAL 30 DAY)";
            default: return "DATE_SUB(NOW(), INTERVAL 7 DAY)";
        }
    }
}

// Handle API requests
$analytics = new AnalyticsAPI();

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['action'])) {
        switch($input['action']) {
            case 'track_event':
                echo json_encode($analytics->trackEvent($input['data']));
                break;
            case 'track_page_view':
                echo json_encode($analytics->trackPageView($input['data']));
                break;
            case 'track_wizard_step':
                echo json_encode($analytics->trackWizardStep($input['data']));
                break;
            case 'get_analytics':
                echo json_encode($analytics->getAnalyticsData($input['period'] ?? '7d'));
                break;
            default:
                echo json_encode(array('success' => false, 'message' => 'Invalid action'));
        }
    } else {
        echo json_encode(array('success' => false, 'message' => 'No action specified'));
    }
} else {
    echo json_encode(array('success' => false, 'message' => 'Only POST requests allowed'));
}
?>
