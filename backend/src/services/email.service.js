const transporter = require("../config/mailer");

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"Move Cash" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email error:", err);
  }
};

module.exports = { sendEmail };