import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const hasBrevo = Boolean(env.email.brevoApiKey) && Boolean(env.email.senderEmail);
const hasSmtp = Boolean(env.email.user) && Boolean(env.email.pass);

const transporter =
  !hasBrevo && hasSmtp
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.email.user,
          pass: env.email.pass,
        },
      })
    : null;

function buildInviteHtml({ toName, inviterName, roomName, approveUrl }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #f3d6dc;border-radius:16px;background:#fffbfb;">
      <h2 style="color:#E11D48;margin-top:0;">🏠 Roomie Finder Invite</h2>
      <p style="color:#1C0A0F;font-size:15px;line-height:1.6;">
        Hi <strong>${toName}</strong>,
      </p>
      <p style="color:#6B5B5F;font-size:15px;line-height:1.6;">
        <strong>${inviterName}</strong> invited you to join the shared expense room
        <strong>"${roomName}"</strong> so you can split rent, bills, and groceries together.
      </p>
      <div style="margin:24px 0;">
        <a href="${approveUrl}"
           style="display:inline-block;background:#E11D48;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">
          Approve &amp; Join Room
        </a>
      </div>
      <p style="color:#9E8E92;font-size:12px;">
        If the button doesn't work, copy and paste this link:<br/>
        <a href="${approveUrl}" style="color:#E11D48;">${approveUrl}</a>
      </p>
    </div>
  `;
}

/**
 * Send a real room-invite email via Brevo HTTPS API (preferred) or Gmail SMTP fallback.
 */
export async function sendRoomInviteEmail({
  toEmail,
  toName,
  inviterName,
  roomName,
  token,
  appUrl,
}) {
  const baseUrl = (appUrl || env.email.appUrl).replace(/\/+$/, "");
  const approveUrl = `${baseUrl}/expenses?inviteToken=${encodeURIComponent(token)}`;
  const subject = `${inviterName} invited you to join "${roomName}" on Roomie Finder`;
  const htmlContent = buildInviteHtml({ toName, inviterName, roomName, approveUrl });

  if (hasBrevo) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.email.brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Roomie Finder", email: env.email.senderEmail },
        to: [{ email: toEmail, name: toName }],
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Brevo API error (${res.status}): ${errBody}`);
    }
    return { sent: true, provider: "brevo" };
  }

  if (transporter) {
    await transporter.sendMail({
      from: `"Roomie Finder" <${env.email.user}>`,
      to: toEmail,
      subject,
      html: htmlContent,
    });
    return { sent: true, provider: "smtp" };
  }

  return { sent: false, reason: "BREVO_API_KEY / BREVO_SENDER_EMAIL not configured" };
}
