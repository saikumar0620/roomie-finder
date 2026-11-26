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

async function deliverEmail({ toEmail, toName, subject, htmlContent }) {
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

function buildExpenseHtml({
  toName,
  creatorName,
  roomName,
  description,
  category,
  totalAmount,
  shareAmount,
  expensesUrl,
}) {
  const titleText = description ? `${category} — ${description}` : category;
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #f3d6dc;border-radius:16px;background:#fffbfb;">
      <h2 style="color:#E11D48;margin-top:0;">🧾 New Shared Expense</h2>
      <p style="color:#1C0A0F;font-size:15px;line-height:1.6;">
        Hi <strong>${toName}</strong>,
      </p>
      <p style="color:#6B5B5F;font-size:15px;line-height:1.6;">
        <strong>${creatorName}</strong> added a new expense in <strong>"${roomName}"</strong>:
      </p>
      <div style="background:#ffffff;border:1px solid #f3d6dc;border-radius:12px;padding:16px;margin:16px 0;">
        <div style="color:#1C0A0F;font-weight:600;font-size:15px;margin-bottom:6px;">${titleText}</div>
        <div style="color:#6B5B5F;font-size:14px;">Total Bill: <strong>₹${Number(totalAmount).toFixed(2)}</strong></div>
        <div style="color:#E11D48;font-size:16px;font-weight:700;margin-top:6px;">Your Share: ₹${Number(shareAmount).toFixed(2)}</div>
      </div>
      <div style="margin:24px 0;">
        <a href="${expensesUrl}"
           style="display:inline-block;background:#E11D48;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">
          View &amp; Settle Expense
        </a>
      </div>
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
  return deliverEmail({ toEmail, toName, subject, htmlContent });
}

/**
 * Send a personalized expense notification email to a roommate.
 */
export async function sendExpenseNotificationEmail({
  toEmail,
  toName,
  creatorName,
  roomName,
  description,
  category,
  totalAmount,
  shareAmount,
  appUrl,
}) {
  const baseUrl = (appUrl || env.email.appUrl).replace(/\/+$/, "");
  const expensesUrl = `${baseUrl}/expenses`;
  const subject = `${creatorName} added ₹${Number(totalAmount).toFixed(0)} (${category}) in "${roomName}"`;
  const htmlContent = buildExpenseHtml({
    toName,
    creatorName,
    roomName,
    description,
    category,
    totalAmount,
    shareAmount,
    expensesUrl,
  });
  return deliverEmail({ toEmail, toName, subject, htmlContent });
}

/**
 * Send a 15-minute password reset link.
 */
export async function sendPasswordResetEmail({
  toEmail,
  toName,
  token,
  appUrl,
}) {
  const baseUrl = (appUrl || env.email.appUrl).replace(/\/+$/, "");
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "Reset your Roomie Finder password";
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #f3d6dc;border-radius:16px;background:#fffbfb;">
      <h2 style="color:#E11D48;margin-top:0;">🔐 Password Reset</h2>
      <p style="color:#1C0A0F;font-size:15px;line-height:1.6;">
        Hi <strong>${toName}</strong>,
      </p>
      <p style="color:#6B5B5F;font-size:15px;line-height:1.6;">
        We received a request to reset your Roomie Finder password. This link expires in <strong>15 minutes</strong>.
      </p>
      <div style="margin:24px 0;">
        <a href="${resetUrl}"
           style="display:inline-block;background:#E11D48;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">
          Reset Password
        </a>
      </div>
      <p style="color:#9E8E92;font-size:12px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
  return deliverEmail({ toEmail, toName, subject, htmlContent });
}

/**
 * Notify a listing owner when a renter requests a room visit.
 */
export async function sendVisitRequestEmail({
  toEmail,
  toName,
  requesterName,
  listingTitle,
  visitDate,
  note,
  conversationId,
  appUrl,
}) {
  const baseUrl = (appUrl || env.email.appUrl).replace(/\/+$/, "");
  const chatUrl = `${baseUrl}/chat/${conversationId}`;
  const formattedDate = new Date(visitDate).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const subject = `📅 ${requesterName} requested a visit for "${listingTitle}"`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #f3d6dc;border-radius:16px;background:#fffbfb;">
      <h2 style="color:#E11D48;margin-top:0;">📅 New Room Visit Request</h2>
      <p style="color:#1C0A0F;font-size:15px;line-height:1.6;">
        Hi <strong>${toName}</strong>,
      </p>
      <p style="color:#6B5B5F;font-size:15px;line-height:1.6;">
        <strong>${requesterName}</strong> wants to visit <strong>"${listingTitle}"</strong>.
      </p>
      <div style="background:#ffffff;border:1px solid #f3d6dc;border-radius:12px;padding:16px;margin:16px 0;">
        <div style="color:#1C0A0F;font-weight:600;font-size:14px;">Requested Time: ${formattedDate}</div>
        ${note ? `<div style="color:#6B5B5F;font-size:14px;margin-top:6px;">Note: ${note}</div>` : ""}
      </div>
      <div style="margin:24px 0;">
        <a href="${chatUrl}"
           style="display:inline-block;background:#E11D48;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">
          Reply in Chat
        </a>
      </div>
    </div>
  `;
  return deliverEmail({ toEmail, toName, subject, htmlContent });
}

/**
 * Send a 6-digit account verification OTP code.
 */
export async function sendVerificationEmail({ toEmail, toName, code }) {
  const subject = `${code} is your Roomie Finder verification code`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #f3d6dc;border-radius:16px;background:#fffbfb;">
      <h2 style="color:#E11D48;margin-top:0;">✓ Verify your Roomie Finder account</h2>
      <p style="color:#1C0A0F;font-size:15px;line-height:1.6;">
        Hi <strong>${toName}</strong>,
      </p>
      <p style="color:#6B5B5F;font-size:15px;line-height:1.6;">
        Enter this 6-digit code in your Profile to earn your <strong>Verified</strong> badge (expires in 15 minutes):
      </p>
      <div style="margin:20px 0;padding:16px;background:#ffffff;border:1px solid #f3d6dc;border-radius:12px;text-align:center;font-size:28px;font-weight:700;letter-spacing:6px;color:#E11D48;">
        ${code}
      </div>
    </div>
  `;
  return deliverEmail({ toEmail, toName, subject, htmlContent });
}
