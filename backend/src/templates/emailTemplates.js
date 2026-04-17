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

module.exports = {
  transactionCreatedTemplate,
  redirectionTemplate
};