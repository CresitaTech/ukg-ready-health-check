import os
import smtplib
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import datetime
import json

# Fetch SMTP configuration from environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtpout.secureserver.net")  # GoDaddy default SMTP
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))  # Default to 465 for SSL or 587 for TLS
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USERNAME)

# Default internal recipients if none provided
DEFAULT_INTERNAL_RECIPIENT = os.getenv("INTERNAL_NOTIFICATION_EMAIL", "healthchecks@opallios.com")

def generate_email_html(customer_name: str, csm_name: str, is_update: bool, submission_id: int) -> str:
    action = "Updated" if is_update else "New"
    color = "#00a878" if not is_update else "#d97706"
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Inter', Helvetica, sans-serif; color: #0f172a; line-height: 1.6; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }}
            .header {{ background-color: #0a2540; padding: 20px; border-radius: 8px 8px 0 0; color: white; text-align: center; }}
            .badge {{ display: inline-block; padding: 4px 12px; background-color: {color}; color: white; border-radius: 999px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }}
            .content {{ padding: 20px; background-color: #f8fafc; border-radius: 0 0 8px 8px; }}
            .label {{ font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }}
            .value {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 15px; margin-top: 2px; }}
            .footer {{ margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Opallios Health Check Portal</h2>
            </div>
            <div class="content">
                <span class="badge">{action} Submission</span>
                <p>A Health Check Intake Form has been successfully finalized and submitted.</p>
                
                <div class="label">Customer Name</div>
                <div class="value">{customer_name}</div>
                
                <div class="label">Referred By (CSM)</div>
                <div class="value">{csm_name}</div>
                
                <div class="label">System ID</div>
                <div class="value">#{submission_id}</div>
                
                <p style="margin-top: 20px; font-size: 14px;">
                    You can view the full details of this submission by logging into the Health Check dashboard.
                </p>
            </div>
            <div class="footer">
                This is an automated message from the Opallios UKG Ready Health Check Application.<br>
                Generated on {datetime.datetime.now().strftime("%B %d, %Y at %I:%M %p")}
            </div>
        </div>
    </body>
    </html>
    """

def send_submission_email(customer_name: str, csm_email: str, csm_name: str, is_update: bool, submission_id: int, pdf_base64: str = None):
    """
    Sends an email notification via SMTP (GoDaddy defaults).
    If credentials are not provided in environment vectors, it gracefully prints to console.
    """
    subject = f"[{'Update' if is_update else 'New'}] Opallios Health Check Referral - {customer_name}"
    html_content = generate_email_html(customer_name, csm_name, is_update, submission_id)

    recipients = [csm_email, DEFAULT_INTERNAL_RECIPIENT]
    
    # Create message
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = SENDER_EMAIL or "noreply@opallios.com"
    msg["To"] = ", ".join(recipients)
    
    # HTML body part
    msg_body = MIMEMultipart("alternative")
    msg_body.attach(MIMEText(html_content, "html"))
    msg.attach(msg_body)

    # Attach PDF if provided
    if pdf_base64:
        try:
            pdf_bytes = base64.b64decode(pdf_base64)
            safe_name = customer_name.replace(' ', '_').replace('/', '_')
            attachment = MIMEBase("application", "pdf")
            attachment.set_payload(pdf_bytes)
            encoders.encode_base64(attachment)
            attachment.add_header(
                "Content-Disposition",
                f'attachment; filename="Opallios_HealthCheck_{safe_name}_{submission_id}.pdf"'
            )
            msg.attach(attachment)
        except Exception as e:
            print(f"Warning: Could not attach PDF to email: {e}")

    # Attach custom uploaded files
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads", str(submission_id))
    attached_files = []
    if os.path.exists(upload_dir):
        for fname in os.listdir(upload_dir):
            fpath = os.path.join(upload_dir, fname)
            if os.path.isfile(fpath):
                try:
                    with open(fpath, "rb") as f:
                        part = MIMEBase("application", "octet-stream")
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f'attachment; filename="{fname}"'
                    )
                    msg.attach(part)
                    attached_files.append(fname)
                except Exception as e:
                    print(f"Warning: Could not attach file {fname}: {e}")

    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"--- EMAIL NOTIFICATION TRIGGERED (No SMTP credentials found) ---")
        print(f"To: {recipients}")
        print(f"Subject: {subject}")
        print(f"PDF Attached: {'Yes' if pdf_base64 else 'No'}")
        if attached_files:
            print(f"Other Attachments: {', '.join(attached_files)}")
        print("--- END OF EMAIL ---")
        return

    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(msg["From"], recipients, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(msg["From"], recipients, msg.as_string())
        print(f"Successfully sent email notification for submission {submission_id}")
    except Exception as e:
        print(f"Failed to send email notification: {e}")
