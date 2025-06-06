const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../authMiddleware');

// Route to fetch emargements for the authenticated user
router.get('/user', authMiddleware, async (req, res) => {
  console.log('Utilisateur authentifié :', req.user);
  const userId = req.user?.id;

  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({ error: 'ID utilisateur invalide' });
  }

  try {
    const emargements = await prisma.emargement.findMany({
      where: { userId: parseInt(userId) },
      include: {
        session: {
          include: {
            formation: {
              include: { sections: true },
            },
          },
        },
      },
    });
    console.log('Émargements renvoyés :', JSON.stringify(emargements, null, 2));
    res.status(200).json(emargements);
  } catch (error) {
    console.error('Erreur lors de la récupération des émargements :', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des émargements',
      details: error.message
    });
  }
});

module.exports = router;