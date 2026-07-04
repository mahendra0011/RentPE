import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "RentPE";
const DIGEST_DELAY_MS = 12 * 60 * 60 * 1000;

async function sendEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    console.log(`[EmailDigest] Dev mode — would send to ${toEmail}: ${subject}`);
    return { delivered: false };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject,
      htmlContent,
      textContent: textContent || "",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[EmailDigest] Brevo failed for ${toEmail}: ${text}`);
    return { delivered: false };
  }

  console.log(`[EmailDigest] Sent digest to ${toEmail}`);
  return { delivered: true };
}

function buildDigestHtml(conversations) {
  const items = conversations
    .map(
      (c) => `
    <tr>
      <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:900;color:#0f172a;">${c.roomTitle}</p>
        <p style="margin:0 0 4px;font-size:12px;color:#475569;font-weight:600;">From: ${c.otherName || c.otherEmail}</p>
        <p style="margin:0;font-size:13px;color:#64748b;font-weight:600;">${c.lastMessage?.text || "(media)"}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">${c.lastMessage?.timestamp ? new Date(c.lastMessage.timestamp).toLocaleString() : ""}</p>
        <a href="${process.env.CLIENT_URL || "http://localhost:5180"}/#/dashboard" style="display:inline-block;margin-top:8px;padding:6px 16px;border-radius:999px;background:#6d5dfc;color:#fff;font-size:11px;font-weight:900;text-decoration:none;">Reply now</a>
      </td>
    </tr>`,
    )
    .join("");

  return `
  <!doctype html>
  <html><body style="margin:0;background:#f5f7fb;padding:28px 12px;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <tr><td style="padding:24px 28px;background:#0f172a;color:#fff;font-size:20px;font-weight:900;">RentPE</td></tr>
          <tr><td style="padding:24px 28px 8px;">
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#0f172a;">You have unread messages</h1>
            <p style="margin:10px 0 0;color:#475569;font-size:14px;line-height:1.6;font-weight:600;">${conversations.length > 1 ? `${conversations.length} conversations need your reply` : "A conversation needs your reply"}.</p>
          </td></tr>
          ${items}
          <tr><td style="padding:24px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#64748b;font-size:12px;font-weight:600;">RentPE — Direct rooms, PGs, and flats.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

export async function processEmailDigest() {
  const cutoff = new Date(Date.now() - DIGEST_DELAY_MS);

  const conversations = await Conversation.find({
    "lastMessage.timestamp": { $lte: cutoff },
  })
    .sort({ updatedAt: -1 })
    .lean();

  const pending = [];

  for (const conv of conversations) {
    const lastMsg = conv.lastMessage;
    if (!lastMsg?.senderEmail) continue;

    const receiverEmail = conv.participants.find((p) => p !== lastMsg.senderEmail);
    if (!receiverEmail) continue;

    const recentReply = await Message.findOne({
      conversationId: conv._id,
      senderEmail: receiverEmail,
      createdAt: { $gte: lastMsg.timestamp },
    }).lean();

    if (recentReply) continue;

    const unreadForReceiver = (conv.unreadCount || {})[receiverEmail] || 0;
    if (unreadForReceiver <= 0) continue;

    pending.push({ conv, receiverEmail, lastMsg });
  }

  const byEmail = {};
  for (const { conv, receiverEmail, lastMsg } of pending) {
    if (!byEmail[receiverEmail]) byEmail[receiverEmail] = [];
    byEmail[receiverEmail].push({
      roomTitle: conv.roomTitle || "Room",
      otherEmail: lastMsg.senderEmail,
      otherName: "",
      lastMessage: lastMsg,
    });
  }

  for (const [email, items] of Object.entries(byEmail)) {
    const user = await User.findOne({ email }).select("name").lean();
    const html = buildDigestHtml(items.map((i) => ({ ...i, otherName: user?.name || "" })));
    await sendEmail({
      toEmail: email,
      toName: user?.name || email,
      subject:
        items.length > 1
          ? `RentPE — ${items.length} unread conversations`
          : "RentPE — You have an unread message",
      htmlContent: html,
    });
  }

  return { sent: Object.keys(byEmail).length };
}
