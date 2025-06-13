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

// Get all learners
router.get('/learners', verifyAdmin, async (req, res) => {
  try {
    const learners = await prisma.user.findMany({
      where: { role: 'apprenant' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        profileImage: true,
      },
    });
    res.status(200).json(learners);
  } catch (error) {
    console.error('Erreur lors de la récupération des apprenants:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Get all trainers
router.get('/trainers', verifyAdmin, async (req, res) => {
  try {
    const trainers = await prisma.user.findMany({
      where: { role: 'formateur' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        profileImage: true,
      },
    });
    res.status(200).json(trainers);
  } catch (error) {
    console.error('Erreur lors de la récupération des formateurs:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Update a user
router.put('/:id', verifyAdmin, async (req, res) => {
  console.log('Requête PUT reçue pour ID:', req.params.id);

  const { id } = req.params;
  const { name, email, phone, city, country } = req.body;

  // Validation des données
  if (!name || !email) {
    return res.status(400).json({ message: 'Le nom et l\'email sont requis.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    console.log('Utilisateur trouvé:', user);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: parseInt(id) },
      },
    });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        phone: phone || null,
        city: city || null,
        country: country || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
      },
    });

    // Log the action in history
    await prisma.history.create({
      data: {
        action: user.role === 'apprenant' ? 'UPDATE_LEARNER' : 'UPDATE_TRAINER',
        actor: { connect: { id: req.user.userId } },
        actorType: req.user.role.toUpperCase(),
        details: {
          userId: parseInt(id),
          userName: user.name,
        },
      },
    });

    res.status(200).json({ message: 'Utilisateur mis à jour avec succès.', user: updatedUser });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l’utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Delete a user
router.delete('/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // On utilise une transaction pour garantir l'intégrité des données
    await prisma.$transaction(async (prisma) => {
      // 1. Récupérer les IDs des formations de l'utilisateur
      const formations = await prisma.formation.findMany({
        where: { formateurId: parseInt(id) },
        select: { id: true },
      });

      const formationIds = formations.map((f) => f.id);

      // 2. Supprimer les notifications liées aux demandes des formations
      await prisma.notification.deleteMany({
        where: {
          request: {
            formationId: { in: formationIds },
          },
        },
      });

      // 3. Supprimer les demandes de participation liées aux formations
      await prisma.participantRequest.deleteMany({
        where: { formationId: { in: formationIds } },
      });

      // 4. Supprimer les feedbacks liés aux émargements
      await prisma.feedback.deleteMany({
        where: { userId: parseInt(id) },
      });

      // 5. Supprimer les validations de compétences liées aux émargements
      await prisma.skillValidation.deleteMany({
        where: { userId: parseInt(id) },
      });

      // 6. Supprimer les émargements liés aux sessions
      await prisma.emargement.deleteMany({
        where: {
          session: {
            formationId: { in: formationIds },
          },
        },
      });

      // 7. Supprimer les sessions liées aux formations
      await prisma.session.deleteMany({
        where: { formationId: { in: formationIds } },
      });

      // 8. Supprimer les sections liées aux formations
      await prisma.section.deleteMany({
        where: { formationId: { in: formationIds } },
      });

      // 9. Supprimer les achats liés aux formations
      await prisma.purchase.deleteMany({
        where: { formationId: { in: formationIds } },
      });

      // 10. Supprimer les formations de l'utilisateur
      await prisma.formation.deleteMany({
        where: { formateurId: parseInt(id) },
      });

      // 11. Supprimer les feedbacks du formateur
      await prisma.formateurFeedback.deleteMany({
        where: { userId: parseInt(id) },
      });

      // 12. Supprimer les émargements validés par l'utilisateur
      await prisma.emargement.updateMany({
        where: { validatedBy: parseInt(id) },
        data: { validatedBy: null, validationDate: null },
      });

      // 13. Supprimer les émargements de l'utilisateur
      // D'abord supprimer les feedbacks liés aux émargements de l'utilisateur
      const userEmargements = await prisma.emargement.findMany({
        where: { userId: parseInt(id) },
        select: { id: true },
      });
      
      const emargementIds = userEmargements.map(e => e.id);
      
      await prisma.feedback.deleteMany({
        where: { emargementId: { in: emargementIds } },
      });
      
      await prisma.skillValidation.deleteMany({
        where: { emargementId: { in: emargementIds } },
      });
      
      // Maintenant supprimer les émargements
      await prisma.emargement.deleteMany({
        where: { userId: parseInt(id) },
      });

      // 14. Supprimer les achats de l'utilisateur
      await prisma.purchase.deleteMany({
        where: { userId: parseInt(id) },
      });

      // 15. Supprimer les notifications de l'utilisateur
      await prisma.notification.deleteMany({
        where: { recipientId: parseInt(id) },
      });

      // 16. Supprimer les demandes envoyées par l'utilisateur
      await prisma.participantRequest.deleteMany({
        where: { requestedById: parseInt(id) },
      });

      // 17. Log the action in history
      await prisma.history.create({
        data: {
          action: user.role === 'apprenant' ? 'DELETE_LEARNER' : 'DELETE_TRAINER',
          actor: { connect: { id: req.user.userId } },
          actorType: req.user.role.toUpperCase(),
          details: {
            userId: parseInt(id),
            userName: user.name,
          },
        },
      });

      // 18. Finalement, supprimer l'utilisateur
      await prisma.user.delete({
        where: { id: parseInt(id) },
      });
    });

    return res.status(200).json({ message: 'Utilisateur supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;




