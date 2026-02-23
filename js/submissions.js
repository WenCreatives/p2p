// User Submissions Tracking
// Add this to your analytics.js or create a new submissions.js file

window.submissions = {
    // Track form submission
    trackSubmission: async function(submissionType, formData, userInfo = {}) {
        try {
            // Get session ID from analytics (fallback if missing)
            let sessionId = this.generateSessionId();
            try {
                if (window.analytics && typeof window.analytics.getSessionId === 'function') {
                    sessionId = window.analytics.getSessionId() || sessionId;
                }
            } catch (e) {}
            
            // Get user_id from localStorage if user is logged in
            let userId = null;
            try {
                const authUser = JSON.parse(localStorage.getItem('authUser') || 'null');
                if (authUser && authUser.id) {
                    userId = authUser.id;
                }
            } catch (e) {}

            const submissionData = {
                session_id: sessionId,
                user_id: userId,
                submission_type: submissionType,
                form_data: formData,
                user_info: userInfo,
                status: 'pending'
            };

            const response = await fetch('api/submissions.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP Error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            const result = await response.json();
            
            // Check for email verification error
            if (!result.success && result.error && result.error.includes('verify your email')) {
                throw new Error('EMAIL_VERIFICATION_REQUIRED: ' + result.error);
            }
            
            if (result.success) {
                // Use order_number if available (for order_form), otherwise use submission_id
                const returnId = result.order_number || result.submission_id;
                console.log('Submission tracked successfully:', returnId);
                return returnId;
            } else {
                const errorMsg = result.error || 'Unknown error';
                console.error('Error tracking submission:', errorMsg, result);
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Error tracking submission:', error);
            // Re-throw the error so caller can handle it
            throw error;
        }
    },

    // Track order form submission
    trackOrderSubmission: async function(orderData) {
        const formData = {
            order_type: orderData.side || 'Buy',
            amount: orderData.amount || 'N/A',
            currency: orderData.currency || 'USDT',
            platform: orderData.platform || 'N/A',
            payment_method: orderData.paymentMethod || 'N/A',
            route_type: orderData.route || 'stay'
        };

        if (orderData.amountInput) {
            formData.amount_input = orderData.amountInput;
        }
        if (orderData.amountInputUnit) {
            formData.amount_input_unit = orderData.amountInputUnit;
        }
        if (orderData.amountUsdt !== undefined && orderData.amountUsdt !== null && orderData.amountUsdt !== '') {
            formData.amount_usdt = orderData.amountUsdt;
        }
        if (orderData.amountTzs !== undefined && orderData.amountTzs !== null && orderData.amountTzs !== '') {
            formData.amount_tzs = orderData.amountTzs;
        }
        if (orderData.platformUid) {
            formData.platform_uid = orderData.platformUid;
        }
        if (orderData.platformEmail) {
            formData.platform_email = orderData.platformEmail;
        }
        if (orderData.payoutChannel) {
            formData.payout_channel = orderData.payoutChannel;
        }
        if (orderData.payoutName) {
            formData.payout_name = orderData.payoutName;
        }
        if (orderData.payoutAccount) {
            formData.payout_account = orderData.payoutAccount;
        }
        if (orderData.payoutAmount) {
            formData.payout_amount = orderData.payoutAmount;
        }
        if (orderData.notes) {
            formData.notes = orderData.notes;
        }

        // Include receipt URLs if provided
        if (orderData.receipts && Array.isArray(orderData.receipts) && orderData.receipts.length > 0) {
            formData.receipts = orderData.receipts;
            formData.receipt_url = orderData.receipts[0]; // Keep first one for backward compatibility
            console.log('✅ Including receipts in submission:', orderData.receipts);
        } else {
            console.warn('⚠️ No receipts provided or empty array. orderData.receipts:', orderData.receipts);
        }

        console.log('📦 Final formData being submitted:', JSON.stringify(formData, null, 2));

        const userInfo = {
            name: orderData.name || 'N/A',
            email: orderData.email || 'N/A',
            phone: orderData.phone || 'N/A'
        };

        return await this.trackSubmission('order_form', formData, userInfo);
    },

    // Track wizard completion
    trackWizardCompletion: async function(wizardData) {
        const formData = {
            wizard_step: wizardData.step || 5,
            order_type: wizardData.side || 'Buy',
            amount: wizardData.amount || 'N/A',
            currency: wizardData.currency || 'USDT',
            platform: wizardData.platform || 'N/A',
            route_type: wizardData.route || 'stay',
            payment_method: wizardData.paymentMethod || 'N/A'
        };

        const userInfo = {
            name: wizardData.name || 'N/A',
            email: wizardData.email || 'N/A',
            phone: wizardData.phone || 'N/A'
        };

        return await this.trackSubmission('wizard_completion', formData, userInfo);
    },

    // Track contact form submission
    trackContactSubmission: async function(contactData) {
        const formData = {
            subject: contactData.subject || 'N/A',
            message: contactData.message || 'N/A',
            priority: contactData.priority || 'medium'
        };

        const userInfo = {
            name: contactData.name || 'N/A',
            email: contactData.email || 'N/A',
            phone: contactData.phone || 'N/A'
        };

        return await this.trackSubmission('contact_form', formData, userInfo);
    },

    // Generate session ID if analytics not available
    generateSessionId: function() {
        return 'submission_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Show submission success message
    showSuccessMessage: function(submissionId) {
        // Create a success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-check-circle"></i>
                <span>Submission #${submissionId} received successfully!</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    },

    // Show submission error message
    showErrorMessage: function(error) {
        const isVerificationError = error && (error.includes('EMAIL_VERIFICATION_REQUIRED') || error.includes('verify your email'));
        
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md';
        
        if (isVerificationError) {
            const errorMsg = error.replace('EMAIL_VERIFICATION_REQUIRED: ', '');
            notification.innerHTML = `
                <div class="flex flex-col space-y-3 p-2">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                        <span class="font-bold text-lg">Email Verification Required</span>
                    </div>
                    <div class="bg-yellow-900/30 border-l-4 border-yellow-400 p-3 rounded">
                        <p class="text-sm mb-2">${errorMsg}</p>
                        <div class="flex flex-col space-y-2 mt-3">
                            <a href="verify_email.html" class="inline-block text-center px-4 py-2 bg-yellow-400 text-slate-900 font-semibold rounded hover:bg-yellow-300 transition text-sm">
                                ✓ Verify Email Now
                            </a>
                            <button onclick="location.reload()" class="text-xs text-yellow-300 underline hover:text-yellow-200 mt-1">
                                Refresh page after verifying
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            notification.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Error submitting form: ${error}</span>
                </div>
            `;
        }
        
        document.body.appendChild(notification);
        
        // Remove after 8 seconds for verification errors, 5 seconds for others
        setTimeout(() => {
            notification.remove();
        }, isVerificationError ? 8000 : 5000);
    }
};
