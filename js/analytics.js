// Analytics Tracking System
class AnalyticsTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        // Use relative path so it works under /jordan/
        this.apiUrl = 'api/analytics.php';
        this.userAgent = navigator.userAgent;
        this.deviceType = this.getDeviceType();
        this.browser = this.getBrowser();
        this.startTime = Date.now();
        
        // Track initial page load
        this.trackPageView();
    }

    generateSessionId() {
        // Check if session ID exists in localStorage
        let sessionId = localStorage.getItem('analytics_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
    }

    // Public getter used by other scripts (e.g., submissions.js)
    getSessionId() {
        return this.sessionId;
    }

    getDeviceType() {
        const userAgent = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
            return 'tablet';
        }
        if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }

    getBrowser() {
        const userAgent = navigator.userAgent;
        if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
        if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
        if (userAgent.indexOf('Safari') > -1) return 'Safari';
        if (userAgent.indexOf('Edge') > -1) return 'Edge';
        return 'Other';
    }

    async sendData(action, data) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    data: {
                        ...data,
                        session_id: this.sessionId,
                        user_agent: this.userAgent,
                        device_type: this.deviceType,
                        browser: this.browser,
                        ip_address: null, // Will be detected server-side
                        country: null,    // Can be enhanced with IP geolocation
                        city: null
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            console.log('Analytics tracked:', result);
            return result;
        } catch (error) {
            console.error('Analytics error:', error);
            return { success: false, message: error.message };
        }
    }

    // Track page views
    trackPageView(pageTitle = document.title) {
        const timeOnPage = Date.now() - this.startTime;
        return this.sendData('track_page_view', {
            page_url: window.location.href,
            page_title: pageTitle,
            time_on_page: timeOnPage
        });
    }

    // Track general events
    trackEvent(eventName, eventData = {}) {
        return this.sendData('track_event', {
            event_type: 'user_action',
            event_name: eventName,
            page_url: window.location.href,
            event_data: JSON.stringify(eventData)
        });
    }

    // Track wizard steps
    trackWizardStep(step, actionType, paymentMethod = null, routeType = null, stepData = {}) {
        return this.sendData('track_wizard_step', {
            wizard_step: step,
            action_type: actionType,
            payment_method: paymentMethod,
            route_type: routeType,
            step_data: JSON.stringify(stepData)
        });
    }

    // Track button clicks
    trackButtonClick(buttonName, buttonLocation = '') {
        return this.trackEvent('button_click', {
            button_name: buttonName,
            button_location: buttonLocation,
            page_url: window.location.href
        });
    }

    // Track form interactions
    trackFormInteraction(formName, action, formData = {}) {
        return this.trackEvent('form_interaction', {
            form_name: formName,
            form_action: action,
            form_data: formData
        });
    }

    // Track WhatsApp clicks
    trackWhatsAppClick(location = '') {
        return this.trackEvent('whatsapp_click', {
            location: location,
            page_url: window.location.href
        });
    }

    // Track order wizard start
    trackOrderStart(actionType) {
        return this.trackWizardStep(1, actionType, null, null, { action: 'wizard_started' });
    }

    // Track order wizard completion
    trackOrderCompletion(actionType, paymentMethod, routeType) {
        return this.trackWizardStep(7, actionType, paymentMethod, routeType, { action: 'wizard_completed' });
    }
}

// Initialize analytics
const analytics = new AnalyticsTracker();

// Export for use in React components
window.analytics = analytics;

// Track page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        analytics.trackEvent('page_visible');
    } else {
        analytics.trackEvent('page_hidden');
    }
});

// Track page unload
window.addEventListener('beforeunload', function() {
    analytics.trackPageView();
});

console.log('Analytics system initialized');
