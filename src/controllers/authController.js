const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { OAuth2Client } = require('google-auth-library');

// Initialisation de Prisma
const prisma = new PrismaClient();
const tempPinStorage = {};

// Configuration de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Configuration de Google OAuth
const client = new OAuth2Client({
  clientId: '355051455832-oearohcicvqg73m3f7g18gh2sfjo7mha.apps.googleusercontent.com',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Assurez-vous que cette variable d'environnement est définie
  redirectUri: 'postmessage'
});

// Configuration de Multer pour l'upload d'image
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../Uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Fonction pour l'inscription
const signup = async (req, res) => {
  try {
    // Ajoutez des logs pour déboguer
    console.log("Données reçues:", req.body);
    
    const { email, password, name, phone, country, city, role, birthDate, interests } = req.body;

    // Validation des champs obligatoires
    if (!email || !password || !name || !phone || !country || !city) {
      console.log("Champs manquants:", { email, password, name, phone, country, city });
      return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
    }

    // Validation du rôle
    const validRoles = ['apprenant', 'formateur'];
    if (role && !validRoles.includes(role)) {
      console.log("Rôle invalide:", role);
      return res.status(400).json({ message: 'Rôle invalide. Les rôles autorisés sont : apprenant, formateur.' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log("Email déjà utilisé:", email);
      return res.status(400).json({ message: 'Cet e-mail est déjà utilisé.' });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Générer un token de vérification
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Convertir la date de naissance en objet Date si elle est fournie
    let parsedBirthDate = null;
    if (birthDate) {
      parsedBirthDate = new Date(birthDate);
      if (isNaN(parsedBirthDate.getTime())) {
        return res.status(400).json({ message: 'Format de date de naissance invalide.' });
      }
    }

    // Créer l'utilisateur avec try/catch spécifique
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          country,
          city,
          role: role || 'apprenant',
          isVerified: false,
          verificationToken,
          birthDate: parsedBirthDate,
          interests: interests || []
        }
      });
    } catch (dbError) {
      console.error("Erreur lors de la création de l'utilisateur dans la base de données:", dbError);
      return res.status(500).json({ 
        message: "Erreur lors de la création de l'utilisateur.", 
        error: dbError.message,
        code: dbError.code // Code d'erreur Prisma
      });
    }

    // Envoyer l'e-mail de vérification
    const verificationLink = `http://localhost:3000/verify-email/${verificationToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Vérification de votre compte',
      html: `<p>Merci de vous être inscrit ! Veuillez cliquer sur le lien suivant pour vérifier votre compte :</p><a href="${verificationLink}">Vérifier mon compte</a><p>Ce lien expirera dans 24 heures.</p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      message: 'Inscription réussie ! Un e-mail de vérification a été envoyé.',
      userId: user.id,
      role: user.role,
    });
  } catch (err) {
    console.error("Erreur lors de l'inscription :", err);
    return res.status(500).json({ message: "Erreur lors de l'inscription.", error: err.message });
  }
};

// Fonction pour vérifier l'e-mail
const verifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email } = decoded;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    if (user.isVerified) {
      return res.status(200).json({ message: 'Compte déjà vérifié. Veuillez vous connecter.' });
    }

    if (user.verificationToken !== token) {
      return res.status(400).json({ message: 'Token de vérification invalide.' });
    }

    // Mettre à jour l'utilisateur pour marquer le compte comme vérifié
    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    return res.status(200).json({
      message: 'Compte vérifié avec succès. Veuillez vous connecter.',
    });
  } catch (err) {
    console.error("Erreur lors de la vérification de l'e-mail :", err);
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Le lien de vérification a expiré.' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Lien de vérification invalide.' });
    }
    return res.status(500).json({ message: "Erreur lors de la vérification de l'e-mail." });
  }
};

// Fonction pour la connexion
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs.' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Veuillez vérifier votre compte via l'e-mail de vérification." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe incorrect.' });
    }

    // Appeler sendPin au lieu de générer les tokens immédiatement
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    tempPinStorage[email] = pin;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Code de Sécurité UNOW',
      text: `Votre code PIN de connexion pour UNOW est : ${pin}`,
    };
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'PIN envoyé à votre email. Veuillez le vérifier.' });
  } catch (err) {
    console.error("Erreur lors de la connexion :", err);
    return res.status(500).json({ message: "Erreur inconnue lors de la connexion.", error: err.message });
  }
};

// Fonction pour renouveler le token
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token requis' });
  }
  try {
    const user = await prisma.user.findFirst({
      where: { refreshToken },
    });
    if (!user) {
      return res.status(403).json({ message: 'Refresh token invalide' });
    }
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'votre_refresh_secret');
    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'votre_secret_jwt',
      { expiresIn: '1h' }
    );
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Erreur lors du renouvellement du token :', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Refresh token expiré' });
    }
    return res.status(403).json({ message: 'Refresh token invalide' });
  }
};

// Fonction pour récupérer les données de l'utilisateur
const getUserData = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profileImage: true,
        city: true,
        country: true,
        isVerified: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération des données utilisateur :', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Fonction pour mettre à jour les données de l'utilisateur
const updateUser = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    const userId = decoded.userId;
    const { name, email, phone, city, country } = req.body;
    let profileImage = null;
    if (req.file) {
      profileImage = `Uploads/${req.file.filename}`;
    }
    const updatedData = {};
    if (name) updatedData.name = name;
    if (email) updatedData.email = email;
    if (phone) updatedData.phone = phone;
    if (city) updatedData.city = city;
    if (country) updatedData.country = country;
    if (profileImage) updatedData.profileImage = profileImage;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatedData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImage: true,
        city: true,
        country: true,
        isVerified: true,
      },
    });
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l’utilisateur :', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    return res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// Fonction pour l'authentification Google
const handleGoogleAuth = async (req, res) => {
  const { token, role } = req.body;
  
  try {
    console.log("=== Début de l'authentification Google ===");
    console.log("Token reçu (premiers caractères):", token ? token.substring(0, 20) + "..." : "null");
    console.log("Rôle reçu:", role);
    console.log("Client ID utilisé:", '355051455832-oearohcicvqg73m3f7g18gh2sfjo7mha.apps.googleusercontent.com');
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '355051455832-oearohcicvqg73m3f7g18gh2sfjo7mha.apps.googleusercontent.com',
    }).catch(error => {
      console.error("Erreur lors de la vérification du token:", error);
      throw error;
    });
    
    console.log("Token vérifié avec succès");
    const payload = ticket.getPayload();
    console.log("Payload reçu - Email:", payload.email);
    console.log("Payload reçu - Nom:", payload.name);
    
    const { email, name } = payload;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: 'google-auth', // Mot de passe fictif pour les comptes Google
          phone: '', // Champ obligatoire, mais vide pour l'authentification Google
          country: '', // Champ obligatoire, mais vide pour l'authentification Google
          city: '', // Champ obligatoire, mais vide pour l'authentification Google
          role: role || 'apprenant',
          isVerified: true,
          interests: [], // Initialiser avec un tableau vide
        },
      });
    }
    
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'votre_secret_jwt',
      { expiresIn: '1h' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET || 'votre_refresh_secret',
      { expiresIn: '7d' }
    );
    
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });
    
    return res.status(200).json({
      accessToken,
      refreshToken,
      role: user.role,
      email,
      name,
      userId: user.id,
    });
  } catch (error) {
    console.error("=== Erreur lors de l'authentification Google ===");
    console.error("Type d'erreur:", error.name);
    console.error("Message d'erreur:", error.message);
    console.error("Stack trace:", error.stack);
    return res.status(401).json({ 
      message: 'Authentification Google échouée.', 
      error: error.message,
      errorType: error.name
    });
  }
};

// Fonction sendPin
const sendPin = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Veuillez fournir un email.' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    tempPinStorage[email] = pin;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Code de Sécurité UNOW',
      text: `Votre code PIN de connexion pour UNOW est : ${pin}`,
    };
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'Code PIN envoyé avec succès par e-mail.' });
  } catch (err) {
    console.error("Erreur lors de l'envoi du code PIN :", err);
    return res.status(500).json({ message: "Échec de l'envoi du code PIN." });
  }
};

// Fonction verifyPin
const verifyPin = async (req, res) => {
  const { email, pin } = req.body;
  if (!email || !pin) {
    return res.status(400).json({ message: 'Veuillez fournir un email et un PIN.' });
  }
  try {
    const storedPin = tempPinStorage[email];
    if (!storedPin || storedPin !== pin) {
      return res.status(401).json({ message: 'PIN invalide.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Générer les tokens après vérification réussie
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'votre_secret_jwt',
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET || 'votre_refresh_secret',
      { expiresIn: '7d' }
    );
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Supprimer le PIN temporaire après utilisation
    delete tempPinStorage[email];

    return res.status(200).json({
      accessToken,
      refreshToken,
      role: user.role,
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    });
  } catch (err) {
    console.error("Erreur lors de la vérification du PIN :", err);
    return res.status(500).json({ message: "Erreur lors de la vérification du PIN." });
  }
};

// Ajoutons une fonction pour vérifier et corriger le rôle admin
const verifyAdminRole = async (req, res) => {
  try {
    // Vérifier l'email spécifique
    const adminEmail = 'fadoua.abdelhak@polytechnicien.tn';
    const user = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!user) {
      console.log(`Utilisateur admin ${adminEmail} non trouvé`);
      // Créer l'utilisateur admin s'il n'existe pas
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Admin',
          password: hashedPassword,
          role: 'admin',
          phone: '123456789',
          country: 'France',
          city: 'Paris',
          isVerified: true,
        },
      });
      console.log(`Utilisateur admin ${adminEmail} créé avec succès`);
      return res.status(201).json({ message: 'Utilisateur admin créé avec succès' });
    }

    console.log(`Vérification du rôle pour ${adminEmail}: rôle actuel = ${user.role}`);

    // Si l'utilisateur existe mais n'a pas le rôle admin, mettre à jour
    if (user.role !== 'admin') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'admin', isVerified: true }
      });
      console.log(`Rôle mis à jour pour ${adminEmail}: nouveau rôle = admin`);
      return res.status(200).json({ message: 'Rôle admin corrigé avec succès' });
    }

    return res.status(200).json({ message: 'Le rôle admin est déjà correctement configuré' });
  } catch (error) {
    console.error('Erreur lors de la vérification/correction du rôle admin:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = {
  signup,
  login,
  refreshToken,
  getUserData,
  updateUser,
  handleGoogleAuth,
  verifyEmail,
  sendPin,
  verifyPin,
  verifyAdminRole
};
























