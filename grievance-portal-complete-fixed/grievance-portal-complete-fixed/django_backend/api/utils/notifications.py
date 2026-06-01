import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from api.models import Notification

def send_email(to_email, template_key, data):
    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASS')
    email_from = os.getenv('EMAIL_FROM', 'Grievance Portal <noreply@grievanceportal.gov.in>')

    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"📧 Email not configured. Skipping email to {to_email} with template {template_key}")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = email_from
        msg['To'] = to_email

        if template_key == 'complaint_submitted':
            msg['Subject'] = f"Complaint Registered - ID: {data.get('complaintId')}"
            html_content = f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🏛️ Grievance Redressal Portal</h1>
                    <p style="color: #93c5fd; margin: 5px 0 0;">Government of India</p>
                </div>
                <div style="padding: 30px; background: white; margin: 20px;">
                    <h2 style="color: #1e3a5f;">Complaint Successfully Registered</h2>
                    <p>Dear {data.get('name', 'Citizen')},</p>
                    <p>Your complaint has been registered and routed to the appropriate authority.</p>
                    <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1e3a5f;">Complaint ID: {data.get('complaintId')}</p>
                        <p style="margin: 5px 0 0; color: #64748b;">Please save this ID for tracking your complaint.</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Category</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">{data.get('category')}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Status</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #f59e0b; font-weight: 500;">Pending Review</td></tr>
                        <tr><td style="padding: 8px; color: #64748b;">Submitted On</td><td style="padding: 8px; font-weight: 500;">{datetime.now().strftime('%d/%m/%Y')}</td></tr>
                    </table>
                    <p style="margin-top: 20px;">You will receive updates as your complaint is processed. Track your complaint at <a href="{os.getenv('CLIENT_URL', 'http://localhost:3000')}/track" style="color: #2563eb;">our portal</a>.</p>
                </div>
                <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>© {datetime.now().year} Grievance Redressal Portal, Government of India</p>
                </div>
            </div>
            """
        elif template_key == 'status_update':
            msg['Subject'] = f"Complaint {data.get('complaintId')} - Status Updated: {str(data.get('status')).upper()}"
            remarks_section = f"<p style='margin: 10px 0 0; color: #374151;'><strong>Remarks:</strong> {data.get('remarks')}</p>" if data.get('remarks') else ""
            html_content = f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🏛️ Grievance Redressal Portal</h1>
                </div>
                <div style="padding: 30px; background: white; margin: 20px;">
                    <h2>Status Update for Your Complaint</h2>
                    <p>Dear {data.get('name', 'Citizen')},</p>
                    <p>The status of your complaint <strong>{data.get('complaintId')}</strong> has been updated.</p>
                    <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #166534; font-size: 16px; font-weight: bold;">New Status: {str(data.get('status')).replace('_', ' ').upper()}</p>
                        {remarks_section}
                    </div>
                    <p>Track your complaint: <a href="{os.getenv('CLIENT_URL', 'http://localhost:3000')}/track/{data.get('complaintId')}" style="color: #2563eb;">{data.get('complaintId')}</a></p>
                </div>
            </div>
            """
        else:
            return False

        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(email_from, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Email sending failed: {str(e)}")
        return False

def send_sms(to_phone, message):
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    phone_number = os.getenv('TWILIO_PHONE_NUMBER')

    if not account_sid or account_sid == 'your_account_sid' or not auth_token:
        print(f"📱 SMS (Twilio not configured): to={to_phone}, msg={message}")
        return True

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(account_sid, auth_token)
        client.messages.create(
            body=message,
            from_=phone_number,
            to=f"+91{to_phone}"
        )
        return True
    except Exception as e:
        print(f"❌ SMS sending failed: {str(e)}")
        return False

def save_notification(user_id, n_type, title, message, metadata=None):
    if metadata is None:
        metadata = {}
    try:
        notification = Notification(
            user_id=user_id,
            type=n_type,
            title=title,
            message=message,
            metadata=metadata,
            is_read=False
        )
        notification.save()
    except Exception as e:
        print(f"❌ Notification save failed: {str(e)}")

def notify_complaint_submitted(user, complaint):
    data = {
        'name': user.name if user else 'Citizen',
        'complaintId': complaint.complaint_id,
        'category': complaint.category
    }

    if user and user.email and not complaint.is_anonymous:
        send_email(user.email, 'complaint_submitted', data)

    if user and user.phone:
        send_sms(user.phone, f"Your complaint {complaint.complaint_id} has been registered. Track at: {os.getenv('CLIENT_URL', 'http://localhost:3000')}/track")

    if user and user.id:
        save_notification(
            user_id=user.id,
            n_type='complaint_submitted',
            title='Complaint Registered',
            message=f"Your complaint {complaint.complaint_id} has been submitted successfully.",
            metadata={'complaintId': complaint.complaint_id}
        )

def notify_status_change(user, complaint):
    if not complaint.is_anonymous and user:
        latest_remark = complaint.remarks[-1]['text'] if complaint.remarks else ''
        data = {
            'name': user.name,
            'complaintId': complaint.complaint_id,
            'status': complaint.status,
            'remarks': latest_remark
        }
        
        if user.email:
            send_email(user.email, 'status_update', data)
            
        if user.phone:
            send_sms(user.phone, f"Complaint {complaint.complaint_id} status: {complaint.status.upper()}. Details at {os.getenv('CLIENT_URL', 'http://localhost:3000')}")
            
        save_notification(
            user_id=user.id,
            n_type='status_update',
            title='Status Updated',
            message=f"Your complaint {complaint.complaint_id} is now {complaint.status.replace('_', ' ')}.",
            metadata={'complaintId': complaint.complaint_id, 'status': complaint.status}
        )
