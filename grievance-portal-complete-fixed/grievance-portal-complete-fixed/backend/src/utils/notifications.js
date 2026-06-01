const nodemailer = require('nodemailer');
const { getDb, COLLECTIONS, serverTimestamp } = require('../config/firebase');

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ======= Email Templates =======
const EMAIL_TEMPLATES = {
  complaint_submitted: (data) => ({
    subject: `Complaint Registered - ID: ${data.complaintId}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🏛️ Grievance Redressal Portal</h1>
          <p style="color: #93c5fd; margin: 5px 0 0;">Government of India</p>
        </div>
        <div style="padding: 30px; background: white; margin: 20px;">
          <h2 style="color: #1e3a5f;">Complaint Successfully Registered</h2>
          <p>Dear ${data.name || 'Citizen'},</p>
          <p>Your complaint has been registered and routed to the appropriate authority.</p>
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1e3a5f;">Complaint ID: ${data.complaintId}</p>
            <p style="margin: 5px 0 0; color: #64748b;">Please save this ID for tracking your complaint.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Category</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${data.category}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Status</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #f59e0b; font-weight: 500;">Pending Review</td></tr>
            <tr><td style="padding: 8px; color: #64748b;">Submitted On</td><td style="padding: 8px; font-weight: 500;">${new Date().toLocaleDateString('en-IN')}</td></tr>
          </table>
          <p style="margin-top: 20px;">You will receive updates as your complaint is processed. Track your complaint at <a href="${process.env.CLIENT_URL}/track" style="color: #2563eb;">our portal</a>.</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} Grievance Redressal Portal, Government of India</p>
        </div>
      </div>
    `,
  }),

  status_update: (data) => ({
    subject: `Complaint ${data.complaintId} - Status Updated: ${data.status.toUpperCase()}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🏛️ Grievance Redressal Portal</h1>
        </div>
        <div style="padding: 30px; background: white; margin: 20px;">
          <h2>Status Update for Your Complaint</h2>
          <p>Dear ${data.name || 'Citizen'},</p>
          <p>The status of your complaint <strong>${data.complaintId}</strong> has been updated.</p>
          <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #166534; font-size: 16px; font-weight: bold;">New Status: ${data.status.replace(/_/g, ' ').toUpperCase()}</p>
            ${data.remarks ? `<p style="margin: 10px 0 0; color: #374151;"><strong>Remarks:</strong> ${data.remarks}</p>` : ''}
          </div>
          <p>Track your complaint: <a href="${process.env.CLIENT_URL}/track/${data.complaintId}" style="color: #2563eb;">${data.complaintId}</a></p>
        </div>
      </div>
    `,
  }),
};

// ======= Send Email =======
const sendEmail = async (to, templateKey, data) => {
  try {
    const template = EMAIL_TEMPLATES[templateKey](data);
    await transporter.sendMail({
      from: `"Grievance Portal" <${process.env.EMAIL_FROM}>`,
      to,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error.message);
    return false;
  }
};

// ======= Send SMS via Twilio =======
const sendSMS = async (to, message) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_account_sid') {
      console.log('SMS (Twilio not configured):', message);
      return true;
    }
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${to}`,
    });
    return true;
  } catch (error) {
    console.error('SMS send error:', error.message);
    return false;
  }
};

// ======= Save Notification to Firestore =======
const saveNotification = async (userId, type, title, message, metadata = {}) => {
  const db = getDb();
  try {
    await db.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId,
      type,
      title,
      message,
      metadata,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Notification save error:', error);
  }
};

// ======= Notify user on complaint submission =======
const notifyComplaintSubmitted = async (user, complaint) => {
  const data = { name: user?.name, complaintId: complaint.complaintId, category: complaint.category };

  if (user?.email && !complaint.isAnonymous) {
    await sendEmail(user.email, 'complaint_submitted', data);
  }
  if (user?.phone) {
    await sendSMS(user.phone, `Your complaint ${complaint.complaintId} has been registered. Track at: ${process.env.CLIENT_URL}/track`);
  }
  if (user?.id) {
    await saveNotification(user.id, 'complaint_submitted', 'Complaint Registered', `Your complaint ${complaint.complaintId} has been submitted successfully.`, { complaintId: complaint.complaintId });
  }
};

// ======= Notify on status change =======
const notifyStatusChange = async (user, complaint) => {
  if (!complaint.isAnonymous && user) {
    const data = { name: user.name, complaintId: complaint.complaintId, status: complaint.status, remarks: complaint.latestRemark };
    if (user.email) await sendEmail(user.email, 'status_update', data);
    if (user.phone) await sendSMS(user.phone, `Complaint ${complaint.complaintId} status: ${complaint.status.toUpperCase()}. Details at ${process.env.CLIENT_URL}`);
    await saveNotification(user.id, 'status_update', 'Status Updated', `Your complaint ${complaint.complaintId} is now ${complaint.status.replace(/_/g, ' ')}.`, { complaintId: complaint.complaintId, status: complaint.status });
  }
};

module.exports = { sendEmail, sendSMS, saveNotification, notifyComplaintSubmitted, notifyStatusChange };
