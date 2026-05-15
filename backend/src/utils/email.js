// src/utils/email.js
const transporter = require("../config/mailer");

const sendEmail = async ({ to, subject, html }) => {
  if (!to) {
    console.error("Email error: No recipient provided");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Move Cash" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("Email error:", err.message);
    // Ne pas bloquer l'application si l'email échoue
    return null;
  }
};

module.exports = { sendEmail };