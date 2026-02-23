<?php
require_once 'config/database.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    echo "<h2>Database Contents Check</h2>";
    
    // Check analytics events
    $eventsCount = $pdo->query('SELECT COUNT(*) FROM analytics_events')->fetchColumn();
    echo "<p><strong>Analytics Events:</strong> $eventsCount</p>";
    
    // Check page views
    $pageViewsCount = $pdo->query('SELECT COUNT(*) FROM analytics_page_views')->fetchColumn();
    echo "<p><strong>Page Views:</strong> $pageViewsCount</p>";
    
    // Check user submissions
    $submissionsCount = $pdo->query('SELECT COUNT(*) FROM user_submissions')->fetchColumn();
    echo "<p><strong>User Submissions:</strong> $submissionsCount</p>";
    
    if ($eventsCount > 0) {
        echo "<h3>Recent Analytics Events:</h3>";
        $events = $pdo->query('SELECT event_name, event_type, created_at FROM analytics_events ORDER BY created_at DESC LIMIT 10')->fetchAll(PDO::FETCH_ASSOC);
        echo "<ul>";
        foreach($events as $event) {
            echo "<li>" . htmlspecialchars($event['event_name']) . " (" . htmlspecialchars($event['event_type']) . ") - " . $event['created_at'] . "</li>";
        }
        echo "</ul>";
    }
    
    if ($submissionsCount > 0) {
        echo "<h3>Recent User Submissions:</h3>";
        $submissions = $pdo->query('SELECT submission_type, submission_status, created_at FROM user_submissions ORDER BY created_at DESC LIMIT 10')->fetchAll(PDO::FETCH_ASSOC);
        echo "<ul>";
        foreach($submissions as $sub) {
            echo "<li>" . htmlspecialchars($sub['submission_type']) . " (" . htmlspecialchars($sub['submission_status']) . ") - " . $sub['created_at'] . "</li>";
        }
        echo "</ul>";
    }
    
    if ($eventsCount == 0 && $submissionsCount == 0) {
        echo "<p style='color: green;'><strong>Database is empty - no tracking data yet!</strong></p>";
        echo "<p>This means:</p>";
        echo "<ul>";
        echo "<li>No one has visited your website yet</li>";
        echo "<li>No analytics events have been tracked</li>";
        echo "<li>No form submissions have been made</li>";
        echo "</ul>";
        echo "<p>The dashboard should show zeros for all metrics.</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>Database Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>
