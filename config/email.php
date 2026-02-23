<?php
// Email sending class using PHPMailer or native PHP mail
// Supports SMTP authentication

class EmailSender {
    private $smtpHost = 'smtp.hostinger.com';
    private $smtpPort = 465;
    private $smtpUser = 'support@jordanmwinukatz.com';
    private $smtpPass = '0THtZ$Maj&';
    private $fromEmail = 'support@jordanmwinukatz.com';
    private $fromName = 'jordanmwinukatz P2P Trading';
    
    public function sendOrderConfirmation($userEmail, $userName, $orderData) {
        $orderNumber = $orderData['order_number'] ?? $orderData['submission_id'] ?? 'N/A';
        $subject = 'Order Confirmation - ' . $orderData['form_data']['order_type'] . ' Order #' . $orderNumber;
        $htmlBody = $this->getUserEmailTemplate($userName, $orderData);
        $textBody = $this->getPlainTextVersion($orderData);
        
        return $this->sendEmail($userEmail, $userName, $subject, $htmlBody, $textBody);
    }
    
    public function sendAdminNotification($adminEmail, $orderData) {
        $orderNumber = $orderData['order_number'] ?? $orderData['submission_id'] ?? 'N/A';
        $subject = 'New Order Submitted - Order #' . $orderNumber;
        $htmlBody = $this->getAdminEmailTemplate($orderData);
        $textBody = $this->getAdminPlainText($orderData);
        
        return $this->sendEmail($adminEmail, 'Admin', $subject, $htmlBody, $textBody);
    }
    
    public function sendPasswordResetEmail($userEmail, $userName, $resetUrl) {
        $subject = 'Reset Your Password - jordanmwinukatz P2P Trading';
        $htmlBody = $this->getPasswordResetTemplate($userName, $resetUrl);
        $textBody = "Reset Your Password\n\nClick the link below to reset your password:\n{$resetUrl}\n\nThis link will expire in 1 hour.";
        
        return $this->sendEmail($userEmail, $userName, $subject, $htmlBody, $textBody);
    }
    
    public function sendVerificationEmail($userEmail, $userName, $verifyUrl) {
        $subject = 'Verify Your Email Address - jordanmwinukatz P2P Trading';
        $htmlBody = $this->getVerificationEmailTemplate($userName, $verifyUrl);
        $textBody = "Verify Your Email Address\n\nWelcome to jordanmwinukatz P2P Trading!\n\nPlease verify your email address by clicking the link below:\n{$verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.";
        
        return $this->sendEmail($userEmail, $userName, $subject, $htmlBody, $textBody);
    }
    
    public function sendNewUserNotification($adminEmail, $userData) {
        $subject = 'New User Registration - jordanmwinukatz P2P Trading';
        $htmlBody = $this->getNewUserNotificationTemplate($userData);
        $textBody = "New User Registration\n\nA new user has registered on your platform:\n\nName: {$userData['name']}\nEmail: {$userData['email']}\nUser ID: {$userData['id']}\nRegistration Date: " . date('F j, Y \a\t g:i A') . "\n\nEmail Verified: " . ($userData['email_verified'] ? 'Yes' : 'No (Pending Verification)');
        
        return $this->sendEmail($adminEmail, 'Admin', $subject, $htmlBody, $textBody);
    }
    
    private function sendEmail($toEmail, $toName, $subject, $htmlBody, $textBody) {
        // Try PHPMailer first if available
        if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            return $this->sendViaPHPMailer($toEmail, $toName, $subject, $htmlBody, $textBody);
        }
        
        // Fallback to native PHP mail
        return $this->sendViaNativeMail($toEmail, $toName, $subject, $htmlBody, $textBody);
    }
    
    private function sendViaPHPMailer($toEmail, $toName, $subject, $htmlBody, $textBody) {
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            
            // Enable verbose debug output (level 2 = client and server messages)
            // $mail->SMTPDebug = 2;
            // $mail->Debugoutput = function($str, $level) {
            //     error_log("PHPMailer Debug: $str");
            // };
            
            // Server settings
            $mail->isSMTP();
            $mail->Host = $this->smtpHost;
            $mail->SMTPAuth = true;
            $mail->Username = $this->smtpUser;
            $mail->Password = $this->smtpPass;
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port = $this->smtpPort;
            $mail->CharSet = 'UTF-8';
            
            // Recipients
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addAddress($toEmail, $toName);
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = $textBody;
            
            error_log("PHPMailer: Attempting to send email to $toEmail via $this->smtpHost:$this->smtpPort");
            $mail->send();
            error_log("PHPMailer: Email sent successfully to $toEmail");
            return ['success' => true, 'message' => 'Email sent successfully'];
        } catch (Exception $e) {
            $errorMsg = $mail->ErrorInfo ?? $e->getMessage();
            error_log("PHPMailer Error: $errorMsg | To: $toEmail");
            return ['success' => false, 'message' => 'Email failed: ' . $errorMsg];
        }
    }
    
    private function sendViaNativeMail($toEmail, $toName, $subject, $htmlBody, $textBody) {
        // SMTP sending using sockets
        try {
            error_log("Native Mail: Attempting to connect to $this->smtpHost:$this->smtpPort");
            $socket = @fsockopen('ssl://' . $this->smtpHost, $this->smtpPort, $errno, $errstr, 30);
            
            if (!$socket) {
                error_log("Native Mail: Connection failed - $errstr ($errno)");
                return ['success' => false, 'message' => "SMTP connection failed: $errstr ($errno)"];
            }
            
            error_log("Native Mail: Connected successfully to $this->smtpHost");
            
            // Helper function to read SMTP response (handles multi-line)
            $readResponse = function() use ($socket) {
                $response = '';
                while ($line = fgets($socket, 515)) {
                    $response .= $line;
                    if (substr($line, 3, 1) === ' ') break; // Last line
                }
                return $response;
            };
            
            // Read server greeting
            $response = $readResponse();
            if (substr($response, 0, 3) !== '220') {
                fclose($socket);
                return ['success' => false, 'message' => 'SMTP server error: ' . $response];
            }
            
            // Send EHLO
            fputs($socket, "EHLO " . $this->smtpHost . "\r\n");
            $response = $readResponse();
            
            // Authentication
            fputs($socket, "AUTH LOGIN\r\n");
            $response = $readResponse();
            if (substr($response, 0, 3) !== '334') {
                fclose($socket);
                return ['success' => false, 'message' => 'SMTP AUTH not supported: ' . $response];
            }
            
            fputs($socket, base64_encode($this->smtpUser) . "\r\n");
            $response = $readResponse();
            if (substr($response, 0, 3) !== '334') {
                fclose($socket);
                return ['success' => false, 'message' => 'SMTP username rejected: ' . $response];
            }
            
            fputs($socket, base64_encode($this->smtpPass) . "\r\n");
            $response = $readResponse();
            
            if (substr($response, 0, 3) !== '235') {
                fclose($socket);
                return ['success' => false, 'message' => 'SMTP authentication failed: ' . $response];
            }
            
            // Send email
            fputs($socket, "MAIL FROM: <" . $this->fromEmail . ">\r\n");
            $response = $readResponse();
            if (substr($response, 0, 3) !== '250') {
                fclose($socket);
                return ['success' => false, 'message' => 'MAIL FROM failed: ' . $response];
            }
            
            fputs($socket, "RCPT TO: <" . $toEmail . ">\r\n");
            $response = $readResponse();
            if (substr($response, 0, 3) !== '250') {
                fclose($socket);
                return ['success' => false, 'message' => 'RCPT TO failed: ' . $response];
            }
            
            fputs($socket, "DATA\r\n");
            $response = $readResponse();
            if (substr($response, 0, 3) !== '354') {
                fclose($socket);
                return ['success' => false, 'message' => 'DATA command failed: ' . $response];
            }
            
            // Email headers
            $headers = "From: " . $this->fromName . " <" . $this->fromEmail . ">\r\n";
            $headers .= "To: " . $toName . " <" . $toEmail . ">\r\n";
            $headers .= "Subject: " . $subject . "\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "\r\n";
            
            fputs($socket, $headers . $htmlBody . "\r\n.\r\n");
            $response = $readResponse();
            
            fputs($socket, "QUIT\r\n");
            fclose($socket);
            
            if (substr($response, 0, 3) === '250') {
                error_log("Native Mail: Email sent successfully to $toEmail");
                return ['success' => true, 'message' => 'Email sent successfully'];
            } else {
                error_log("Native Mail: Email send failed - Response: $response");
                return ['success' => false, 'message' => 'Email send failed: ' . $response];
            }
        } catch (Exception $e) {
            error_log("Native Mail Exception: " . $e->getMessage() . " | To: $toEmail");
            return ['success' => false, 'message' => 'Email error: ' . $e->getMessage()];
        }
    }
    
    private function getUserEmailTemplate($userName, $orderData) {
        $formData = $orderData['form_data'];
        $amount = number_format($formData['amount']);
        $currency = $formData['currency'] ?? 'USDT';
        $orderType = $formData['order_type'] ?? 'Buy';
        $paymentMethod = $formData['payment_method'] ?? 'N/A';
        $platform = $formData['platform'] ?? 'N/A';
        $orderNumber = $orderData['order_number'] ?? $orderData['submission_id'] ?? 'N/A';
        $date = date('F j, Y \a\t g:i A');
        
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b0b0c;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0c; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #fbbf24 0%, #06b6d4 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">jordanmwinukatz P2P Trading</h1>
                            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Order Confirmation</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hello <strong style="color: #fbbf24;">{$userName}</strong>,</p>
                            
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">Thank you for your order! We have received your submission and will process it shortly.</p>
                            
                            <!-- Order Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 20px; color: #fbbf24; font-size: 20px; font-weight: 700; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px;">Order Details</h2>
                                        
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px; width: 40%;">Order ID:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">#{$orderNumber}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Order Type:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">{$orderType}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Amount:</td>
                                                <td style="color: #fbbf24; font-size: 16px; font-weight: 700;">{$amount} {$currency}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Platform:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">{$platform}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Payment Method:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">{$paymentMethod}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Date:</td>
                                                <td style="color: #ffffff; font-size: 14px;">{$date}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Your order is currently being reviewed. You will receive an update once it's processed.</p>
                            
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0;">If you have any questions, please don't hesitate to contact us.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: rgba(255, 255, 255, 0.05); padding: 25px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px;">© 2025 jordanmwinukatz P2P Trading. All rights reserved.</p>
                            <p style="color: #6b7280; font-size: 12px; margin: 0;">support@jordanmwinukatz.com</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
    
    private function getAdminEmailTemplate($orderData) {
        $formData = $orderData['form_data'];
        $userInfo = $orderData['user_info'];
        $amount = number_format($formData['amount']);
        $currency = $formData['currency'] ?? 'USDT';
        $orderType = $formData['order_type'] ?? 'Buy';
        $paymentMethod = $formData['payment_method'] ?? 'N/A';
        $platform = $formData['platform'] ?? 'N/A';
        $orderNumber = $orderData['order_number'] ?? $orderData['submission_id'] ?? 'N/A';
        $userName = $userInfo['name'] ?? 'N/A';
        $userEmail = $userInfo['email'] ?? 'N/A';
        $userPhone = $userInfo['phone'] ?? 'N/A';
        $date = date('F j, Y \a\t g:i A');
        $dashboardUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/admin/submissions_dashboard.php';
        
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Order Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b0b0c;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0c; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #fbbf24 0%, #06b6d4 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">🔔 New Order Alert</h1>
                            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">A new order has been submitted</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">A new order has been submitted and requires your attention.</p>
                            
                            <!-- Order Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255, 193, 7, 0.1); border-radius: 12px; border: 1px solid rgba(255, 193, 7, 0.3); margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 20px; color: #fbbf24; font-size: 20px; font-weight: 700; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px;">Order Information</h2>
                                        
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px; width: 40%;">Order ID:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">#{$orderNumber}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Order Type:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">{$orderType}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Amount:</td>
                                                <td style="color: #fbbf24; font-size: 16px; font-weight: 700;">{$amount} {$currency}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Platform:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">{$platform}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Payment Method:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">{$paymentMethod}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Submitted:</td>
                                                <td style="color: #ffffff; font-size: 14px;">{$date}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- User Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 20px; color: #06b6d4; font-size: 20px; font-weight: 700; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px;">Customer Information</h2>
                                        
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px; width: 40%;">Name:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">{$userName}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Email:</td>
                                                <td style="color: #06b6d4; font-size: 14px;">{$userEmail}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Phone:</td>
                                                <td style="color: #ffffff; font-size: 14px;">{$userPhone}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{$dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #fbbf24 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; text-align: center;">View Order in Dashboard</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: rgba(255, 255, 255, 0.05); padding: 25px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 jordanmwinukatz P2P Trading. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
    
    private function getPlainTextVersion($orderData) {
        $formData = $orderData['form_data'];
        return "Order Confirmation\n\n" .
               "Order ID: #" . ($orderData['order_number'] ?? $orderData['submission_id'] ?? 'N/A') . "\n" .
               "Order Type: {$formData['order_type']}\n" .
               "Amount: {$formData['amount']} {$formData['currency']}\n" .
               "Platform: {$formData['platform']}\n" .
               "Payment Method: {$formData['payment_method']}\n";
    }
    
    private function getAdminPlainText($orderData) {
        $formData = $orderData['form_data'];
        $userInfo = $orderData['user_info'];
        return "New Order Notification\n\n" .
               "Order ID: #" . ($orderData['order_number'] ?? $orderData['submission_id'] ?? 'N/A') . "\n" .
               "Customer: {$userInfo['name']} ({$userInfo['email']})\n" .
               "Order Type: {$formData['order_type']}\n" .
               "Amount: {$formData['amount']} {$formData['currency']}\n";
    }
    
    private function getVerificationEmailTemplate($userName, $verifyUrl) {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email Address</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b0b0c;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0c; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #fbbf24 0%, #06b6d4 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">jordanmwinukatz P2P Trading</h1>
                            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Email Verification Required</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hello <strong style="color: #fbbf24;">{$userName}</strong>,</p>
                            
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">Thank you for creating an account with jordanmwinukatz P2P Trading! To complete your registration and start placing orders, please verify your email address by clicking the button below:</p>
                            
                            <!-- Verification Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{$verifyUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #fbbf24 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Verify Email Address</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">Or copy and paste this link into your browser:</p>
                            <p style="color: #06b6d4; font-size: 12px; word-break: break-all; margin: 10px 0 0; font-family: monospace; background-color: rgba(6, 182, 212, 0.1); padding: 10px; border-radius: 6px;">{$verifyUrl}</p>
                            
                            <div style="background-color: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; padding: 15px; margin: 30px 0; border-radius: 6px;">
                                <p style="color: #fbbf24; font-size: 14px; font-weight: 600; margin: 0 0 8px;">⚠️ Important:</p>
                                <p style="color: #e5e7eb; font-size: 14px; line-height: 1.6; margin: 0;">You must verify your email address before you can place orders on our platform. This link will expire in <strong style="color: #fbbf24;">24 hours</strong>.</p>
                            </div>
                            
                            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">If you didn't create an account with us, please ignore this email. Your email address will not be verified and no account will be created.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: rgba(255, 255, 255, 0.05); border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 jordanmwinukatz P2P Trading. All rights reserved.</p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0;">This is an automated email. Please do not reply.</p>
                            <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0;">support@jordanmwinukatz.com</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
    
    private function getNewUserNotificationTemplate($userData) {
        $userName = $userData['name'] ?? 'N/A';
        $userEmail = $userData['email'] ?? 'N/A';
        $userId = $userData['id'] ?? 'N/A';
        $emailVerified = $userData['email_verified'] ?? false;
        $registrationDate = date('F j, Y \a\t g:i A');
        $dashboardUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/admin/users.php';
        
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New User Registration</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b0b0c;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0c; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #fbbf24 0%, #06b6d4 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">🔔 New User Registration</h1>
                            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">A new user has joined your platform</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">A new user has successfully registered on jordanmwinukatz P2P Trading platform.</p>
                            
                            <!-- User Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(6, 182, 212, 0.1); border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.3); margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 20px; color: #06b6d4; font-size: 20px; font-weight: 700; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px;">User Information</h2>
                                        
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px; width: 40%;">Name:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">{$userName}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Email:</td>
                                                <td style="color: #06b6d4; font-size: 14px;">{$userEmail}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">User ID:</td>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 600;">#{$userId}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Registration Date:</td>
                                                <td style="color: #ffffff; font-size: 14px;">{$registrationDate}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; font-size: 14px;">Email Verified:</td>
                                                <td style="color: " . ($emailVerified ? '#10b981' : '#fbbf24') . "; font-size: 14px; font-weight: 600;">
                                                    " . ($emailVerified ? '✓ Verified' : '⚠ Pending Verification') . "
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="background-color: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; padding: 15px; margin: 30px 0; border-radius: 6px;">
                                <p style="color: #fbbf24; font-size: 14px; font-weight: 600; margin: 0 0 8px;">📋 Next Steps:</p>
                                <ul style="color: #e5e7eb; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                    <li>Review the user's registration details</li>
                                    <li>Monitor their account activity</li>
                                    <li>Verify their email status if needed</li>
                                </ul>
                            </div>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{$dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #fbbf24 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; text-align: center;">View User in Dashboard</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: rgba(255, 255, 255, 0.05); padding: 25px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 jordanmwinukatz P2P Trading. All rights reserved.</p>
                            <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0;">This is an automated notification email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
    
    private function getPasswordResetTemplate($userName, $resetUrl) {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b0b0c;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0c; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #fbbf24 0%, #06b6d4 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">jordanmwinukatz P2P Trading</h1>
                            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Password Reset Request</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hello <strong style="color: #fbbf24;">{$userName}</strong>,</p>
                            
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">We received a request to reset your password. Click the button below to create a new password:</p>
                            
                            <!-- Reset Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{$resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #fbbf24 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Reset Password</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">Or copy and paste this link into your browser:</p>
                            <p style="color: #06b6d4; font-size: 12px; word-break: break-all; margin: 10px 0 0; font-family: monospace;">{$resetUrl}</p>
                            
                            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">This link will expire in <strong style="color: #fbbf24;">1 hour</strong> for security reasons.</p>
                            
                            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: rgba(255, 255, 255, 0.05); border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© " . date('Y') . " jordanmwinukatz P2P Trading. All rights reserved.</p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0;">This is an automated email. Please do not reply.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
}
?>

