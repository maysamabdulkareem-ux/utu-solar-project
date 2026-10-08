import os
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import quote


def smtp_is_configured() -> bool:
    host = os.getenv("SMTP_HOST")
    sender = os.getenv("SMTP_FROM_EMAIL")
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    return bool(host and sender and (bool(username) == bool(password)))


def send_password_reset_email(recipient: str, token: str) -> None:
    if not smtp_is_configured():
        raise RuntimeError("SMTP settings are incomplete")

    app_url = os.getenv("PUBLIC_APP_URL", "http://127.0.0.1:5173").rstrip("/")
    reset_url = f"{app_url}/#/company?reset_token={quote(token, safe='')}"
    message = EmailMessage()
    message["Subject"] = "Reset your Utu company password"
    message["From"] = os.environ["SMTP_FROM_EMAIL"]
    message["To"] = recipient
    message.set_content(
        "A password reset was requested for your Utu company account.\n\n"
        f"Use this one-time link within 30 minutes:\n{reset_url}\n\n"
        "If you did not request this, ignore this email."
    )

    host = os.environ["SMTP_HOST"]
    port = int(os.getenv("SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=10) as server:
        server.starttls(context=ssl.create_default_context())
        username = os.getenv("SMTP_USERNAME")
        password = os.getenv("SMTP_PASSWORD")
        if username and password:
            server.login(username, password)
        server.send_message(message)