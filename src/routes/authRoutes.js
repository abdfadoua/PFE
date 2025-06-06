const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { verifyAdminRole } = require('../controllers/authController');
const { authenticateToken } = require('../authMiddleware');
const path = require('path');
const fs = require('fs');

// Configuration améliorée de Multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Créer le répertoire Uploads s'il n'existe pas
    const uploadDir = path.join(__dirname, '..', 'Uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  },
});

// Filtre pour vérifier le type de fichier
const fileFilter = (req, file, cb) => {
  // Accepter uniquement les images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées!'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite à 5MB
  }
});

// Middleware pour gérer les erreurs Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Fichier trop volumineux. Maximum 5MB.' });
    }
    return res.status(400).json({ message: `Erreur d'upload: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Middleware pour vérifier si le répertoire Uploads existe
router.use((req, res, next) => {
  const uploadDir = path.join(__dirname, '..', 'Uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Répertoire Uploads créé: ${uploadDir}`);
  }
  next();
});

// Configuration de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Ajoutez un middleware de débogage pour les routes d'authentification
router.use((req, res, next) => {
  console.log(`Auth Route: ${req.method} ${req.url}`);
  next();
});

// --- Routes d'authentification ---
router.post('/signup', authController.signup); // Inscription d'un nouvel utilisateur
router.post('/login', authController.login); // Connexion d'un utilisateur
router.get('/verify-email/:token', authController.verifyEmail); // Vérification de l'email
router.post('/google', authController.handleGoogleAuth); // Authentification via Google
router.post('/refresh-token', authController.refreshToken);
router.post('/send-pin', authController.sendPin); 
router.post('/verify-pin', authController.verifyPin); // Nouvelle route pour vérifier le PIN// Nouvelle route pour sendPin // Rafraîchissement du token JWT

// --- Routes de gestion de l'utilisateur ---
router.get('/me', authController.getUserData); // Récupérer les données de l'utilisateur connecté

// Mise à jour du profil utilisateur avec gestion améliorée des erreurs
router.put('/update', upload.single('profileImage'), handleMulterError, (req, res, next) => {
  console.log('Fichier reçu:', req.file);
  console.log('Corps de la requête:', req.body);
  
  // Si un fichier a été uploadé, vérifier qu'il existe
  if (req.file) {
    const filePath = req.file.path;
    if (!fs.existsSync(filePath)) {
      console.error(`Le fichier uploadé n'existe pas: ${filePath}`);
      return res.status(500).json({ message: 'Erreur lors de l\'upload du fichier.' });
    }
    
    // Modifier le chemin du fichier pour qu'il soit relatif à la racine du projet
    req.file.filename = req.file.filename;
    req.file.path = `Uploads/${req.file.filename}`;
  }
  
  next();
}, authController.updateUser);

// --- Routes de réinitialisation de mot de passe ---
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Aucun utilisateur trouvé avec cet e-mail.' });
    }
    const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: `<p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous pour procéder :</p><a href="${resetLink}">Réinitialiser mon mot de passe</a><p>Ce lien expirera dans 1 heure.</p>`,
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Un e-mail de réinitialisation a été envoyé.' });
  } catch (err) {
    console.error('Erreur lors de la demande de réinitialisation :', err);
    res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation.' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });
    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    console.error('Erreur lors de la réinitialisation du mot de passe :', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Le lien de réinitialisation a expiré.' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Lien de réinitialisation invalide.' });
    }
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe.' });
  }
});

// --- Initialisation de Prisma ---
const prisma = new PrismaClient();

// Ajoutons une route pour vérifier et corriger le rôle admin
router.get('/verify-admin-role', authController.verifyAdminRole);

module.exports = router;








