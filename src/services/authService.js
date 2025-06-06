const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Inscription d'un nouvel utilisateur
const signup = async (email, password, name, phone, role = "apprenant") => {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Cet email est déjà utilisé.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, phone, role },
    });

    return user;
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    throw new Error("Échec de l'inscription.");
  }
};

// Connexion de l'utilisateur
const login = async (email, password) => {
  try {
    console.log("Tentative de connexion pour l'utilisateur :", email); // Log de l'email
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log("Utilisateur non trouvé pour l'email :", email); // Log si utilisateur non trouvé
      throw new Error('Utilisateur non trouvé.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Mot de passe valide :", isPasswordValid); // Log de la validité du mot de passe

    if (!isPasswordValid) {
      console.log("Mot de passe incorrect pour l'utilisateur :", email); // Log si mot de passe incorrect
      throw new Error('Mot de passe incorrect.');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log("Token généré :", token); // Log du token généré
    return { token, role: user.role };
  } catch (error) {
    console.error("Erreur lors de la connexion :", error.message); // Affiche l'erreur précise
    throw new Error("Échec de la connexion.");
  }
};


module.exports = { signup, login };
