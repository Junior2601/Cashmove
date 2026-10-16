// src/templates/emailTemplates.js
const transactionCreatedTemplate = (data) => {
  const isAgent = data.recipient_type === "agent";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 10px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .info { margin: 10px 0; padding: 10px; background-color: #f9f9f9; }
        .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Nouvelle Transaction</h2>
        </div>
        <div class="content">
          <h3>Détails de la transaction</h3>
          <div class="info">
            <p><strong>Code de suivi:</strong> ${data.tracking_code}</p>
            <p><strong>Montant envoyé:</strong> ${data.send_amount}</p>
            <p><strong>Montant reçu:</strong> ${data.receive_amount}</p>
            <p><strong>Date:</strong> ${new Date(data.created_at).toLocaleString()}</p>
          </div>
          
          ${isAgent ? `
            <div class="info">
              <h4>Instructions pour l'agent:</h4>
              <p>Numéro autorisé à utiliser: <strong>${data.number}</strong></p>
              <p>Veuillez traiter cette transaction dans votre espace agent.</p>
            </div>
          ` : `
            <div class="info">
              <h4>Instructions:</h4>
              <p>Un agent a été assigné à cette transaction.</p>
              <p>Connectez-vous à votre espace admin pour voir les détails.</p>
            </div>
          `}
        </div>
      </div>
    </body>
    </html>
  `;
};

const redirectionTemplate = (data) => {
  const isAgent = data.recipient_type === "agent";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ff9800; color: white; padding: 10px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .info { margin: 10px 0; padding: 10px; background-color: #f9f9f9; }
        .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; margin: 5px; display: inline-block; }
        .button-red { background-color: #f44336; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Redirection de Transaction</h2>
        </div>
        <div class="content">
          <h3>Détails de la redirection</h3>
          <div class="info">
            <p><strong>Code de suivi:</strong> ${data.tracking_code}</p>
            <p><strong>Montant:</strong> ${data.amount}</p>
            ${data.reason ? `<p><strong>Raison:</strong> ${data.reason}</p>` : ''}
          </div>
          
          ${isAgent ? `
            <div class="info">
              <h4>Action requise:</h4>
              <p>Une transaction vous a été redirigée.</p>
              <p>Veuillez vous connecter à votre espace agent pour accepter ou refuser cette redirection.</p>
            </div>
          ` : `
            <div class="info">
              <h4>Information:</h4>
              <p>Une redirection a été créée pour la transaction ${data.tracking_code}</p>
            </div>
          `}
        </div>
      </div>
    </body>
    </html>
  `;
};

// Code de connexion client V2 (CPT-01/02). Styles en ligne : les clients mail
// (Gmail notamment) ignorent souvent les balises <style>.
const loginCodeTemplate = ({ code, first_name, is_new, language = "fr" }) => {
  const en = language === "en";
  const greeting = first_name
    ? (en ? `Hello ${first_name},` : `Bonjour ${first_name},`)
    : (en ? "Hello," : "Bonjour,");
  const intro = is_new
    ? (en ? "Here is your code to confirm your email and create your MoveCash account:"
          : "Voici votre code pour confirmer votre e-mail et créer votre compte MoveCash :")
    : (en ? "Here is your code to sign in to MoveCash:"
          : "Voici votre code pour vous connecter à MoveCash :");
  const expiry = en ? "This code expires in 10 minutes." : "Ce code expire dans 10 minutes.";
  const warning = en
    ? "Never share this code. MoveCash will never ask you for it. If you did not request it, you can ignore this email."
    : "Ne communiquez jamais ce code. MoveCash ne vous le demandera jamais. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.";

  return `
    <!DOCTYPE html>
    <html lang="${en ? "en" : "fr"}">
    <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr><td style="background:#1d4ed8;padding:24px;text-align:center;">
              <span style="font-size:24px;font-weight:bold;color:#ffffff;">Move</span><span style="font-size:24px;font-weight:bold;color:#facc15;">Cash</span>
            </td></tr>
            <tr><td style="padding:32px 28px;">
              <p style="margin:0 0 12px;font-size:16px;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${intro}</p>
              <div style="text-align:center;margin:0 0 24px;">
                <span style="display:inline-block;padding:16px 24px;background:#eff6ff;border:2px dashed #1d4ed8;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;">${code}</span>
              </div>
              <p style="margin:0 0 8px;font-size:14px;color:#4b5563;">${expiry}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">${warning}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
};

module.exports = {
  transactionCreatedTemplate,
  redirectionTemplate,
  loginCodeTemplate
};