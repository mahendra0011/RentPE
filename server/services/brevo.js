export async function sendOtpEmail({ email, otp }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "RoomRadar";

  if (!apiKey || !senderEmail) {
    console.log(`Dev OTP for ${email}: ${otp}`);
    return { delivered: false, devOtp: otp };
  }

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
      subject: "Your RoomRadar login OTP",
      htmlContent: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2>Your RoomRadar OTP</h2>
          <p>Use this code to continue:</p>
          <div style="font-size:28px;font-weight:800;letter-spacing:8px">${otp}</div>
          <p style="color:#64748b">This code expires in 10 minutes.</p>
        </div>
      `,
      textContent: `Your RoomRadar OTP is ${otp}. It expires in 10 minutes.`,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Brevo email failed: ${message}`);
  }

  return { delivered: true };
}
