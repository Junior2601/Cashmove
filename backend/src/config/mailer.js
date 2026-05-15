// src/config/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Crucial : false pour le port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // 👇 Ajoutez ces timeouts pour éviter que le processus ne reste bloqué
  connectionTimeout: 10000, // 10 secondes max pour établir la connexion
  socketTimeout: 10000,     // 10 secondes max pour l'envoi des données
});

// Vérifiez la connexion
transporter.verify(function (error, success) {
  if (error) {
    console.error("SMTP connection error:", error);
  } else {
    console.log("SMTP server is ready to send messages");
  }
});

module.exports = transporter;