const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  if (!to) {
    console.error("Email error: No recipient provided");
    return;
  }
  try {
    const { data, error } = await resend.emails.send({
      from: 'Move Cash <noreply@movecash.site>',
      to,
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    console.log(`✅ Email sent to ${to}: ${data.id}`);
    return data;
  } catch (err) {
    console.error("❌ Email error:", err.message);
    return null;
  }
};

// Variante qui lève une erreur si l'envoi échoue (ex : code de connexion,
// où l'appelant doit prévenir l'utilisateur au lieu de continuer).
const sendEmailOrThrow = async ({ to, subject, html }) => {
  const { data, error } = await resend.emails.send({
    from: 'Move Cash <noreply@movecash.site>',
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
  return data;
};

module.exports = { sendEmail, sendEmailOrThrow };