const jwt = require('jsonwebtoken');


// Correction dans authMiddleware.js
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extrait "Bearer <token>"
  if (!token) {
    return res.status(401).json({ error: 'Aucun token fourni' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // La correction est ici: utiliser decoded.userId au lieu de decoded.id
    req.user = { id: decoded.userId }; 
    console.log("User ID extrait:", req.user.id); // Pour vérifier l'ID
    next();
  } catch (error) {
    console.error('Erreur dans authMiddleware :', error);
    return res.status(403).json({ error: 'Token invalide' });
  }
};

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log("Token reçu :", authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Aucun token fourni' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_clé_secrète');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erreur de vérification du token :', error);
    return res.status(403).json({ message: 'Token invalide' });
  }
};

// Exporter les deux fonctions
module.exports = { authMiddleware, authenticateJWT };