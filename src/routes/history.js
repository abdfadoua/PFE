const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Accès interdit. Admin requis.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide ou expiré.' });
  }
};

// Get all history records
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const history = await prisma.history.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { name: true, role: true },
        },
        request: {
          select: {
            id: true,
            formation: { select: { title: true } },
            email: true,
            rejectionReason: true,
          },
        },
      },
    });

    // Format the response to match frontend expectations
    const formattedHistory = history.map((item) => ({
      id: item.id,
      action: item.action,
      actorType: item.actor.role.toUpperCase(), // e.g., ADMIN, LEARNER, TRAINER
      createdAt: item.createdAt,
      details: {
        userId: item.details.userId || null,
        userName: item.details.userName || null,
        formationTitle: item.request?.formation?.title || item.details.formationTitle || null,
        requestId: item.requestId || null,
        rejectionReason: item.request?.rejectionReason || item.details.rejectionReason || null,
      },
    }));

    res.status(200).json(formattedHistory);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;