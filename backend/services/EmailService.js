// EmailService.js - COMPLETE UPDATED VERSION
import axios from "axios";
import { EmailTemplate } from "../models/EmailTemplate.model.js";
import { envConfig } from "../config/environment.js";
import User from "../models/User.model.js";

export class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || envConfig.BREVO_API_KEY;
    this.apiUrl = "https://api.brevo.com/v3/smtp/email";
    this.fromEmail = process.env.SMTP_FROM_EMAIL || "noreply@trainersync.com";
    this.fromName = process.env.SMTP_FROM_NAME || "TrainerSync";
    this.frontendUrl = process.env.FRONTEND_URL || envConfig.FRONTEND_URL || "http://localhost:3000";
    
    if (!this.apiKey) {
      console.warn("⚠️ BREVO_API_KEY not set - emails will fail");
    } else {
      console.log(`📧 Email Service initialized with Brevo REST API`);
    }
  }

  // ============================================
  // ✅ CORE EMAIL SENDING METHODS
  // ============================================

  // In your EmailService.js - update sendEmailDirect method
async sendEmailDirect(to, subject, html, text = "", bcc = []) {
  try {
    if (!this.apiKey) {
      console.warn("⚠️ BREVO_API_KEY not configured, skipping email");
      return { success: false, message: "Email service not configured" };
    }

    const payload = {
      sender: {
        email: this.fromEmail,
        name: this.fromName,
      },
      to: Array.isArray(to) 
        ? to.map(email => ({ email }))
        : [{ email: to }],
      subject: subject,
      htmlContent: html,
      textContent: text || this.stripHtml(html),
      ...(bcc.length > 0 && {
        bcc: bcc.map(email => ({ email }))
      }),
      // ✅ DISABLE LINK TRACKING
      options: {
        trackLinks: 'none', // This disables link tracking
        trackClicks: false,  // This also helps
        trackOpens: false    // Optional: disable open tracking
      }
    };

    const response = await axios.post(this.apiUrl, payload, {
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 15000,
    });

    console.log(`✅ Email sent to ${Array.isArray(to) ? to.join(', ') : to}:`, response.data.messageId);
    return { 
      success: true, 
      messageId: response.data.messageId,
      to 
    };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.response?.data || error.message);
    throw error;
  }
}

  async sendEmail(to, subject, html, text = "", bcc = []) {
    // Send email asynchronously without blocking
    setImmediate(async () => {
      try {
        await this.sendEmailDirect(to, subject, html, text, bcc);
      } catch (error) {
        console.error(`❌ Background email error for ${to}:`, error.message);
      }
    });
    return { async: true, email: to };
  }

  // ============================================
  // ✅ HELPER METHODS FOR ROLE-BASED NOTIFICATIONS
  // ============================================

  async getAdminEmails() {
    const admins = await User.find({ 
      role: "ADMIN", 
      status: "ACTIVE" 
    }).select("email");
    return admins.map(admin => admin.email);
  }

  async getHRAndAdminEmails() {
    const users = await User.find({ 
      role: { $in: ["HR", "ADMIN"] }, 
      status: "ACTIVE" 
    }).select("email");
    return users.map(user => user.email);
  }

  // ============================================
  // ✅ WELCOME EMAIL
  // ============================================

  async sendWelcomeEmail(to, username, tempPassword, trainerCategory = "PERMANENT") {
    const categoryInfo = {
      PERMANENT: "permanent trainer with monthly leave increments",
      CONTRACTED: "contracted trainer with fixed leave balance"
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin-bottom: 10px;">Welcome to TrainerSync! 👋</h1>
          <p style="color: #666; font-size: 16px;">Your account has been successfully created</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
          <h3 style="color: #333; margin-bottom: 15px;">Your Account Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Username:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${username}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Trainer Category:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <span style="background-color: ${trainerCategory === 'PERMANENT' ? '#10B981' : '#3B82F6'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                  ${trainerCategory}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Temporary Password:</strong></td>
              <td style="padding: 10px;">
                <code style="background-color: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px; font-weight: bold; letter-spacing: 1px;">
                  ${tempPassword}
                </code>
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 25px;">
          <h3 style="color: #333; margin-bottom: 10px;">⚠️ Important Security Notice</h3>
          <p style="color: #666; line-height: 1.6;">
            For security reasons, you <strong>must change your password</strong> on first login. 
            Your temporary password will expire in 24 hours.
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; margin-bottom: 10px;">🚀 Quick Start Guide</h3>
          <ol style="color: #666; line-height: 1.6; padding-left: 20px;">
            <li>Click the login button below</li>
            <li>Use your username and temporary password</li>
            <li>Change your password immediately</li>
            <li>Complete your profile setup</li>
            <li>Check your leave balance</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.frontendUrl}/login" 
             style="display: inline-block; background-color: #4F46E5; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            🔐 Login to Your Account
          </a>
        </div>

        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; color: #888; font-size: 14px;">
          <p><strong>Note:</strong> As a ${categoryInfo[trainerCategory]}, your leave benefits are configured accordingly.</p>
          <p>If you didn't expect this email or need assistance, please contact your HR department.</p>
          <p style="margin-top: 20px;">© ${new Date().getFullYear()} TrainerSync. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, `🎉 Welcome to TrainerSync - Account Created`, html);
  }

  // ============================================
  // ✅ LEAVE NOTIFICATION (Trainer/HR)
  // ============================================

  async sendLeaveNotification(to, applicantName, leaveData, applicantRole = "TRAINER") {
    const roleColor = applicantRole === "HR" ? "#8B5CF6" : "#10B981";
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5;">📋 New Leave Request</h1>
          <p style="color: #666; font-size: 16px;">A new leave request requires your attention</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; width: 150px; border-bottom: 1px solid #e0e0e0;"><strong>Applicant:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">${applicantName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"><strong>Role:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                <span style="background-color: ${roleColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                  ${applicantRole}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"><strong>Leave Type:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                <span style="background-color: #3B82F6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                  ${leaveData.leaveType}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"><strong>Dates:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                ${new Date(leaveData.fromDate).toLocaleDateString()} → ${new Date(leaveData.toDate).toLocaleDateString()}
                <span style="background-color: #f3f4f6; padding: 2px 8px; border-radius: 12px; margin-left: 8px; font-size: 11px;">
                  ${leaveData.numberOfDays} days
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"><strong>Reason:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">${leaveData.reason}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Submitted:</strong></td>
              <td style="padding: 10px 0;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.frontendUrl}/admin/leaves/pending" 
             style="display: inline-block; background-color: #4F46E5; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            👁️ Review Leave Request
          </a>
        </div>

        <p style="color: #666; font-size: 14px; text-align: center;">
          This is an automated notification. Please log in to the system to review and take action.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 12px; text-align: center;">
          <p>© ${new Date().getFullYear()} TrainerSync. All rights reserved.</p>
        </div>
      </div>
    `;

    const rolePrefix = applicantRole === "HR" ? "👔 HR" : "📋 Trainer";
    return this.sendEmail(to, `${rolePrefix} Leave Request - ${applicantName}`, html);
  }

  // ============================================
  // ✅ HR LEAVE NOTIFICATION (Admin only)
  // ============================================

  async sendHRLeaveNotification(to, hrName, leaveData) {
    return this.sendLeaveNotification(to, hrName, leaveData, "HR");
  }

  // ============================================
  // ✅ LEAVE APPROVAL/REJECTION EMAIL
  // ============================================

  async sendLeaveApprovalEmail(to, applicantName, leaveData, approved = true) {
    const status = approved ? "Approved" : "Rejected";
    const statusColor = approved ? "#10B981" : "#EF4444";
    const statusIcon = approved ? "✅" : "❌";
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: ${statusColor};">${statusIcon} Leave Request ${status}</h1>
          <p style="color: #666;">Your leave request has been processed</p>
        </div>
        
        <div style="background-color: ${approved ? '#f0fdf4' : '#fef2f2'}; 
                    border-left: 4px solid ${statusColor}; 
                    padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px;">
            Your leave request has been <strong style="color: ${statusColor};">${status.toLowerCase()}</strong>.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            ${leaveData.approvedBy ? `
            <tr>
              <td style="padding: 10px 0; width: 150px; border-bottom: 1px solid #e0e0e0;"><strong>${approved ? 'Approved By' : 'Rejected By'}:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                <span style="font-weight: bold; color: ${statusColor};">${leaveData.approvedBy || leaveData.rejectedBy}</span>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"><strong>Leave Type:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                <span style="background-color: #3B82F6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                  ${leaveData.leaveType}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"><strong>Dates:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                ${new Date(leaveData.fromDate).toLocaleDateString()} → ${new Date(leaveData.toDate).toLocaleDateString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"><strong>Duration:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">${leaveData.numberOfDays} days</td>
            </tr>
            ${leaveData.comments ? `
            <tr>
              <td style="padding: 10px 0;"><strong>Comments:</strong></td>
              <td style="padding: 10px 0;"><em>"${leaveData.comments}"</em></td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background-color: ${approved ? '#f0fdf4' : '#fff3f3'}; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: ${approved ? '#065f46' : '#991b1b'};">
            ${approved 
              ? '✅ Your leave balance has been updated accordingly.' 
              : '❌ Please contact HR if you have any questions about this decision.'}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.frontendUrl}/dashboard/leaves" 
             style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            📋 View Leave Dashboard
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 12px; text-align: center;">
          <p>© ${new Date().getFullYear()} TrainerSync. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, `${statusIcon} Leave Request ${status} - ${leaveData.leaveType}`, html);
  }

  // ============================================
  // ✅ PASSWORD RESET EMAIL
  // ============================================

  async sendPasswordResetEmail(to, username, resetToken) {
  const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4F46E5;">🔐 Password Reset Request</h1>
        <p style="color: #666; font-size: 16px;">We received a request to reset your password</p>
      </div>
      
      <div style="background-color: #fef3c7; border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>Username:</strong> ${username}</p>
        <p style="margin: 5px 0 0 0;"><strong>Email:</strong> ${to}</p>
      </div>

      <!-- ✅ PLAIN TEXT LINK - This won't be modified -->
      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 16px; color: #333;">
          Click this link to reset your password:
        </p>
        <p style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px;">
          <a href="${resetLink}" style="color: #4F46E5; text-decoration: none;">${resetLink}</a>
        </p>
      </div>

      <!-- ✅ SHOW TOKEN SEPARATELY (Always works) -->
      <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
        <h3 style="margin-top: 0; color: #333; text-align: center;">Your 6-Digit Reset Token</h3>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; text-align: center; margin: 10px 0;">
          ${resetToken}
        </p>
        <p style="font-size: 14px; color: #666; text-align: center;">
          Go to ${this.frontendUrl}/reset-password and enter this token manually
        </p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 12px;">
        <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
        <p style="margin-top: 20px;">© ${new Date().getFullYear()} TrainerSync. All rights reserved.</p>
      </div>
    </div>
  `;

  return this.sendEmail(to, `🔐 Password Reset Request - ${username}`, html);
}

  // ============================================
  // ✅ PASSWORD CHANGED CONFIRMATION
  // ============================================

  async sendPasswordChangedConfirmation(to, username) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10B981;">✅ Password Changed Successfully</h1>
          <p style="color: #666;">Your password has been updated</p>
        </div>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Account:</strong> ${username}</p>
          <p style="margin: 5px 0 0 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #92400e;">🔒 Security Tips:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Use a strong, unique password</li>
            <li>Never share your password with anyone</li>
            <li>Enable two-factor authentication if available</li>
            <li>Always log out from shared devices</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.frontendUrl}/login" 
             style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            🔐 Login with New Password
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 14px;">
          <p>If you didn't make this change, please contact support immediately.</p>
          <p style="margin-top: 20px;">© ${new Date().getFullYear()} TrainerSync. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, `✅ Password Changed Successfully - ${username}`, html);
  }

  // ============================================
  // ✅ LEAVE BALANCE UPDATE
  // ============================================

  async sendLeaveBalanceUpdate(to, trainerName, updateData) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5;">📊 Leave Balance Updated</h1>
          <p style="color: #666;">Your leave balance has been modified</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Hello ${trainerName},</h3>
          <p>Your <strong>${updateData.leaveType}</strong> leave balance has been updated:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Leave Type:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                <span style="background-color: #3B82F6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                  ${updateData.leaveType}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>New Balance:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                <strong style="color: #10B981; font-size: 18px;">
                  ${updateData.newBalance === Infinity ? 'Unlimited' : updateData.newBalance} days
                </strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Updated By:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${updateData.updatedBy}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Reason:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${updateData.reason}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Updated On:</strong></td>
              <td style="padding: 10px;">${new Date(updateData.updatedAt).toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.frontendUrl}/dashboard/leaves" 
             style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            📋 View Leave Dashboard
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 14px;">
          <p>This is an automated notification regarding your leave balance. Contact HR if you have any questions.</p>
          <p>© ${new Date().getFullYear()} TrainerSync. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, `📊 Leave Balance Update - ${updateData.leaveType}`, html);
  }

  // ============================================
  // ✅ MONTHLY INCREMENT NOTIFICATION
  // ============================================

  async sendMonthlyIncrementNotification(to, trainerName, incrementData) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10B981;">🎉 Monthly Leave Credits Added!</h1>
          <p style="color: #666;">Your monthly leave credits have been added</p>
        </div>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #10B981; padding: 20px; margin: 20px 0; border-radius: 6px;">
          <h3 style="margin-top: 0;">Good news, ${trainerName}!</h3>
          <p>Your monthly leave credits have been automatically added to your balance.</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Credits Added This Month:</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Sick Leave:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                <span style="color: #10B981; font-weight: bold;">+${incrementData.sickDays} days</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Casual Leave:</strong></td>
              <td style="padding: 10px; text-align: right;">
                <span style="color: #10B981; font-weight: bold;">+${incrementData.casualDays} days</span>
              </td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Current Balance:</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px;"><strong>Sick Leave:</strong></td>
              <td style="padding: 10px; text-align: right;"><strong>${incrementData.totalSick} days</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Casual Leave:</strong></td>
              <td style="padding: 10px; text-align: right;"><strong>${incrementData.totalCasual} days</strong></td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.frontendUrl}/dashboard/leaves" 
             style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            📋 Check Your Leave Balance
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          This is an automated monthly leave increment for permanent trainers. 
          Unused leaves may be carried forward as per company policy.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 12px; text-align: center;">
          <p>© ${new Date().getFullYear()} TrainerSync. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, `🎉 Monthly Leave Credits Added`, html);
  }

  // ============================================
  // ✅ BULK EMAIL
  // ============================================

  async sendBulkEmail(recipients, subject, html, bcc = []) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("Recipients array is required");
    }

    if (recipients.length > 50) {
      console.warn(`⚠️ Bulk email to ${recipients.length} recipients may hit rate limits`);
    }

    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail(recipient, subject, html);
        results.push({ recipient, success: true, result });
      } catch (error) {
        results.push({ recipient, success: false, error: error.message });
      }
    }

    return results;
  }

  // ============================================
  // ✅ HELPER METHODS
  // ============================================

  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async testConnection() {
    try {
      const testEmail = "test@example.com";
      const subject = "Test Email - TrainerSync Service";
      const html = "<p>This is a test email from TrainerSync.</p>";
      
      const result = await this.sendEmailDirect(testEmail, subject, html);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // ✅ TEMPLATE METHODS
  // ============================================

  async loadTemplate(templateName, variables = {}) {
    const template = await EmailTemplate.findOne({
      templateName,
      isActive: true,
    });

    if (!template) {
      console.warn(`Template '${templateName}' not found, using default`);
      return {
        subject: "Notification from TrainerSync",
        body: "<p>Notification content</p>"
      };
    }

    let subject = template.subject;
    let body = template.body;

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, variables[key] || '');
      body = body.replace(regex, variables[key] || '');
    });

    return { subject, body };
  }

  async sendFromTemplate(to, templateName, variables = {}) {
    const { subject, body } = await this.loadTemplate(templateName, variables);
    return this.sendEmail(to, subject, body);
  }

  // ============================================
  // ✅ ATTENDANCE NOTIFICATIONS (Placeholders)
  // ============================================

  async sendClockInNotification(to, trainerName, clockInData) {
    // Implementation here
  }

  async sendClockOutNotification(to, trainerName, clockOutData) {
    // Implementation here
  }

  async sendAttendanceConfirmation(to, trainerName, attendanceData, isClockIn = true) {
    // Implementation here
  }

  async sendDailyAttendanceReport(to, reportData) {
    // Implementation here
  }

  async sendDailySummaryEmail(to, summaryData) {
    // Implementation here
  }
}