export async function sendOtpEmail({ email, otp, purpose = "login" }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "RentPE";

  if (!apiKey || !senderEmail) {
    console.log(`Dev OTP for ${email}: ${otp}`);
    return { delivered: false, devOtp: otp };
  }

  const isSignup = purpose === "signup";
  const isReset = purpose === "reset";
  const title = isSignup
    ? "Verify your RentPE email"
    : isReset
      ? "Reset your RentPE password"
      : "Your RentPE OTP";
  const action = isSignup
    ? "verify your email and create your account"
    : isReset
      ? "reset your password"
      : "continue securely";
  const intro = isSignup
    ? "You are almost ready to start using RentPE. Enter this code to verify your email."
    : isReset
      ? "We received a request to reset your RentPE password. Use this code to continue."
      : "Use this one-time code to continue to your RentPE account.";
  const htmlContent = buildOtpEmailHtml({ title, intro, action, otp });
  const textContent = [
    title,
    "",
    intro,
    "",
    `OTP: ${otp}`,
    "",
    "This code expires in 10 minutes.",
    "If you did not request this, you can ignore this email.",
    "",
    "RentPE",
  ].join("\n");

  // Brevo calls this Transactional Email REST route /smtp/email, but this uses API-key HTTP.
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      subject: title,
      htmlContent,
      textContent,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Brevo email failed: ${message}`);
  }

  return { delivered: true };
}

function buildOtpEmailHtml({ title, intro, action, otp }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#f5f7fb;padding:0;font-family:Inter,Arial,sans-serif;color:#0f172a;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          Your RentPE verification code is ${otp}. It expires in 10 minutes.
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;box-shadow:0 24px 70px -40px rgba(15,23,42,0.45);">
                <tr>
                  <td style="padding:28px 32px 22px;background:#0f172a;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display:inline-block;width:34px;height:34px;border-radius:999px;background:#6d5dfc;color:#ffffff;text-align:center;line-height:34px;font-weight:900;">R</div>
                          <span style="display:inline-block;margin-left:10px;color:#ffffff;font-size:20px;font-weight:900;vertical-align:middle;">RentPE</span>
                        </td>
                        <td align="right" style="color:#cbd5e1;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">
                          Secure OTP
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 32px 12px;">
                    <p style="margin:0 0 10px;color:#6d5dfc;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">${title}</p>
                    <h1 style="margin:0;color:#0f172a;font-size:28px;line-height:1.2;font-weight:900;">Use this code to ${action}.</h1>
                    <p style="margin:14px 0 0;color:#475569;font-size:15px;line-height:1.7;font-weight:600;">${intro}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 32px 12px;">
                    <div style="background:#f4f2ff;border:1px solid #ded8ff;border-radius:20px;padding:22px;text-align:center;">
                      <p style="margin:0 0 10px;color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;">Your 6 digit code</p>
                      <div style="font-size:38px;line-height:1;font-weight:900;letter-spacing:10px;color:#4f46e5;">${otp}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 32px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:900;">Security note</p>
                          <p style="margin:6px 0 0;color:#64748b;font-size:13px;line-height:1.6;font-weight:600;">This code expires in 10 minutes. Never share it with anyone. RentPE will never ask for your OTP on a phone call.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;font-weight:600;">If you did not request this email, you can safely ignore it. Your account stays protected.</p>
                    <p style="margin:14px 0 0;color:#94a3b8;font-size:11px;font-weight:700;">RentPE - Direct rooms, PGs, flats, and roommate search.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
