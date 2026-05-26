export async function sendOtpEmail({ email, otp, purpose = "login" }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "RentPE";

  if (!apiKey || !senderEmail) {
    console.log(`Dev OTP for ${email}: ${otp}`);
    return { delivered: false, devOtp: otp };
  }

  const isSignup = purpose === "signup";
  const title = isSignup ? "Verify your RentPE email" : "Your RentPE OTP";

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
      htmlContent: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2>${title}</h2>
          <p>Use this code ${isSignup ? "to verify your email and create your account" : "to continue"}:</p>
          <div style="font-size:28px;font-weight:800;letter-spacing:8px">${otp}</div>
          <p style="color:#64748b">This code expires in 10 minutes.</p>
        </div>
      `,
      textContent: `${title}: ${otp}. It expires in 10 minutes.`,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Brevo email failed: ${message}`);
  }

  return { delivered: true };
}
