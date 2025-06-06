const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendEmail = async (to, subject, text, html) => {
  try {
    await transporter.sendMail({
      from: `"Plateforme Formation" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`📧 Email envoyé à ${to}`);
  } catch (error) {
    console.error("❌ Erreur d'envoi d'email :", error);
    throw error; // Propager l'erreur pour un meilleur débogage
  }
};

module.exports = sendEmail;