import nodemailer from "nodemailer";
import { EmailTemplate } from "../models/EmailTemplate.model.js";
import { envConfig } from "../config/environment.js";
import { NotFoundError } from "../utils/errorHandler.js";

export class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT || "5000"),
      socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT || "5000"),
      pool: {
        maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || "5"),
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: true,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production" ? true : false,
      },
    });
  }

  async sendEmailDirect(to, subject, html, text = "") {
    try {
      const mailOptions = {
        from: envConfig.SMTP_FROM_EMAIL,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✉️ Email sent to ${to}:`, result.messageId);
      return result;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  async sendEmail(to, subject, html, text = "") {
    // Send email asynchronously without blocking
    setImmediate(async () => {
      try {
        await this.sendEmailDirect(to, subject, html, text);
      } catch (error) {
        console.error(`Background email error for ${to}:`, error.message);
      }
    });
    return { async: true, email: to };
  }

  async sendLeaveNotification(to, trainerName, leaveData) {
    const html = `
      <h2>Leave Request Notification</h2>
      <p>A new leave request has been submitted:</p>
      <ul>
        <li><strong>Trainer:</strong> ${trainerName}</li>
        <li><strong>Leave Type:</strong> ${leaveData.leaveType}</li>
        <li><strong>From Date:</strong> ${new Date(leaveData.fromDate).toDateString()}</li>
        <li><strong>To Date:</strong> ${new Date(leaveData.toDate).toDateString()}</li>
        <li><strong>Duration:</strong> ${leaveData.numberOfDays} days</li>
        <li><strong>Reason:</strong> ${leaveData.reason}</li>
      </ul>
      <p>Please log in to the system to review and approve/reject this request.</p>
    `;

    return this.sendEmail(to, `Leave Request - ${trainerName}`, html);
  }

  async sendLeaveApprovalEmail(to, trainerName, leaveData, approved = true) {
    const status = approved ? "Approved" : "Rejected";
    const html = `
      <h2>Leave Request ${status}</h2>
      <p>Your leave request has been ${status.toLowerCase()}:</p>
      <ul>
        <li><strong>Leave Type:</strong> ${leaveData.leaveType}</li>
        <li><strong>From Date:</strong> ${new Date(leaveData.fromDate).toDateString()}</li>
        <li><strong>To Date:</strong> ${new Date(leaveData.toDate).toDateString()}</li>
        <li><strong>Duration:</strong> ${leaveData.numberOfDays} days</li>
        ${leaveData.comments ? `<li><strong>Comments:</strong> ${leaveData.comments}</li>` : ""}
      </ul>
    `;

    return this.sendEmail(to, `Leave Request ${status}`, html);
  }

  async sendClockInNotification(to, trainerName, clockInData) {
    const html = `
    <h2>Trainer Clocked In</h2>
    <p>A trainer has clocked in for work:</p>
    <ul>
      <li><strong>Trainer:</strong> ${trainerName}</li>
      <li><strong>Clock-In Time:</strong> ${new Date(clockInData.clockInTime).toLocaleString()}</li>
      <li><strong>Location:</strong> ${clockInData.location || "Recorded"}</li>
      <li><strong>Employee ID:</strong> ${clockInData.employeeId || "N/A"}</li>
    </ul>
    <p>You can view real-time attendance on the admin dashboard.</p>
  `;

    return this.sendEmail(to, `Clock-In: ${trainerName}`, html);
  }

  async sendClockOutNotification(to, trainerName, clockOutData) {
    const totalHours = clockOutData.totalWorkingHours || 0;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    const html = `
    <h2>Trainer Clocked Out</h2>
    <p>A trainer has clocked out:</p>
    <ul>
      <li><strong>Trainer:</strong> ${trainerName}</li>
      <li><strong>Date:</strong> ${new Date(clockOutData.clockOutTime).toLocaleDateString()}</li>
      <li><strong>Clock-In:</strong> ${new Date(clockOutData.clockInTime).toLocaleTimeString()}</li>
      <li><strong>Clock-Out:</strong> ${new Date(clockOutData.clockOutTime).toLocaleTimeString()}</li>
      <li><strong>Total Hours:</strong> ${hours}h ${minutes}m</li>
      <li><strong>Location:</strong> ${clockOutData.location || "Recorded"}</li>
      <li><strong>Employee ID:</strong> ${clockOutData.employeeId || "N/A"}</li>
    </ul>
    <p>Daily attendance summary has been updated.</p>
  `;

    return this.sendEmail(to, `Clock-Out: ${trainerName}`, html);
  }

  async sendAttendanceConfirmation(
    to,
    trainerName,
    attendanceData,
    isClockIn = true,
  ) {
    const action = isClockIn ? "Clocked In" : "Clocked Out";
    const greeting = isClockIn
      ? "Have a productive day!"
      : "Thank you for your work today!";

    let hoursInfo = "";
    if (!isClockIn && attendanceData.totalWorkingHours) {
      const totalHours = attendanceData.totalWorkingHours;
      const hours = Math.floor(totalHours);
      const minutes = Math.round((totalHours - hours) * 60);
      hoursInfo = `<li><strong>Total Hours:</strong> ${hours}h ${minutes}m</li>`;
    }

    const html = `
    <h2>${action} Successful</h2>
    <p>You have successfully ${action.toLowerCase()}:</p>
    <ul>
      <li><strong>Time:</strong> ${new Date(isClockIn ? attendanceData.clockInTime : attendanceData.clockOutTime).toLocaleString()}</li>
      <li><strong>Location:</strong> ${attendanceData.location || "Recorded"}</li>
      ${hoursInfo}
    </ul>
    <p>${greeting}</p>
  `;

    return this.sendEmail(to, `${action} Confirmation`, html);
  }

  async sendDailyAttendanceReport(to, reportData) {
    const {
      date,
      totalTrainers,
      clockedIn,
      clockedOut,
      absent,
      presentPercentage,
    } = reportData;

    const html = `
    <h2>Daily Attendance Report</h2>
    <p><strong>Date:</strong> ${new Date(date).toDateString()}</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left; background-color: #f2f2f2;">Metric</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left; background-color: #f2f2f2;">Value</th>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total Trainers</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px;">${totalTrainers}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;"><strong>Clocked In Today</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px;">${clockedIn}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;"><strong>Clocked Out Today</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px;">${clockedOut}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;"><strong>Absent</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px;">${absent}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;"><strong>Attendance Rate</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px;">${presentPercentage}%</td>
      </tr>
    </table>
    <p>This report is automatically generated at the end of each work day.</p>
  `;

    return this.sendEmail(
      to,
      `Daily Attendance Report - ${new Date(date).toDateString()}`,
      html,
    );
  }

  async sendWelcomeEmail(to, username, tempPassword) {
    const html = `
      <h2>Welcome to TrainerSync!</h2>
      <p>Your account has been created successfully.</p>
      <h3>Login Credentials:</h3>
      <ul>
        <li><strong>Username:</strong> ${username}</li>
        <li><strong>Temporary Password:</strong> ${tempPassword}</li>
      </ul>
      <p>Please log in and change your password immediately for security reasons.</p>
      <p><a href="${envConfig.FRONTEND_URL}/login">Click here to log in</a></p>
    `;

    return this.sendEmail(to, "Welcome to TrainerSync", html);
  }

  async sendPasswordResetEmail(to, resetLink) {
    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return this.sendEmail(to, "Password Reset Request", html);
  }

  async sendDailySummaryEmail(to, summaryData) {
    const { date, totalTrainers, clockedIn, clockedOut, absent } = summaryData;

    const html = `
      <h2>Daily Attendance Summary</h2>
      <p><strong>Date:</strong> ${new Date(date).toDateString()}</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total Trainers</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${totalTrainers}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Clocked In</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${clockedIn}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Clocked Out</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${clockedOut}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Absent</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${absent}</td>
        </tr>
      </table>
    `;

    return this.sendEmail(to, "Daily Attendance Summary", html);
  }

  async loadTemplate(templateName, variables = {}) {
    const template = await EmailTemplate.findOne({
      templateName,
      isActive: true,
    });

    if (!template) {
      throw new NotFoundError(`Email template '${templateName}' not found`);
    }

    let subject = template.subject;
    let body = template.body;

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, variables[key]);
      body = body.replace(regex, variables[key]);
    });

    return { subject, body };
  }

  async sendFromTemplate(to, templateName, variables = {}) {
    const { subject, body } = await this.loadTemplate(templateName, variables);
    return this.sendEmail(to, subject, body);
  }
}