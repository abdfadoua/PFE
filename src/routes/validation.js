const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../authMiddleware');

// Submit validation
router.post('/submit', authMiddleware, async (req, res) => {
  const { emargementId, skillsBeforeTraining, skillsAfterTraining } = req.body;
  const userId = req.user.id;

  try {
    // Vérifier si l'émargement existe et appartient à l'utilisateur
    const emargement = await prisma.emargement.findFirst({
      where: {
        id: parseInt(emargementId),
        userId: parseInt(userId),
      },
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

    if (!emargement) {
      return res.status(404).json({ error: 'Émargement non trouvé ou non autorisé' });
    }

    // Vérifier que skillsBeforeTraining et skillsAfterTraining sont des objets
    if (typeof skillsBeforeTraining !== 'object' || typeof skillsAfterTraining !== 'object') {
      return res.status(400).json({ error: 'skillsBeforeTraining et skillsAfterTraining doivent être des objets' });
    }

    // Vérifier que les sectionId dans skills correspondent aux sections de la formation
    const sectionIds = emargement.session.formation.sections.map((section) => section.id.toString());
    for (const sectionId of Object.keys(skillsBeforeTraining)) {
      if (!sectionIds.includes(sectionId)) {
        return res.status(400).json({ error: `Section ID ${sectionId} non valide pour cette formation` });
      }
      if (
        typeof skillsBeforeTraining[sectionId] !== 'number' ||
        typeof skillsAfterTraining[sectionId] !== 'number' ||
        skillsBeforeTraining[sectionId] < 0 || skillsBeforeTraining[sectionId] > 10 ||
        skillsAfterTraining[sectionId] < 0 || skillsAfterTraining[sectionId] > 10
      ) {
        return res.status(400).json({ error: `Valeurs pour la section ${sectionId} doivent être des nombres entre 0 et 10` });
      }
    }

    // Créer ou mettre à jour la validation
    await prisma.skillValidation.upsert({
      where: {
        emargementId_userId: {
          emargementId: parseInt(emargementId),
          userId: parseInt(userId),
        },
      },
      update: {
        skillsBeforeTraining,
        skillsAfterTraining,
      },
      create: {
        emargementId: parseInt(emargementId),
        userId: parseInt(userId),
        skillsBeforeTraining,
        skillsAfterTraining,
      },
    });

    // Enregistrer dans l'historique
    await prisma.history.create({
      data: {
        action: 'SUBMIT_VALIDATION',
        actorId: userId,
        actorType: 'LEARNER',
        details: {
          emargementId,
          skillsBeforeTraining,
          skillsAfterTraining,
        },
      },
    });

    res.status(200).json({ message: 'Validation soumise avec succès' });
  } catch (error) {
    console.error('Erreur lors de la soumission de la validation:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// Récupérer une validation par émargementId
router.get('/emargement/:id', authMiddleware, async (req, res) => {
  console.log('Route /api/validation/emargement/:id appelée');
  const emargementId = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const validation = await prisma.skillValidation.findUnique({
      where: {
        emargementId_userId: {
          emargementId: emargementId,
          userId: userId,
        },
      },
      include: {
        emargement: {
          include: {
            session: {
              include: { formation: true },
            },
          },
        },
      },
    });

    if (!validation) {
      return res.status(404).json({ error: 'Aucune validation trouvée pour cet émargement' });
    }

    res.status(200).json(validation);
  } catch (error) {
    console.error('Erreur lors de la récupération de la validation:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// Récupérer toutes les validations de l'utilisateur
router.get('/user', authMiddleware, async (req, res) => {
  console.log('Route /api/validation/user appelée');
  const userId = req.user.id;

  try {
    const skillValidations = await prisma.skillValidation.findMany({
      where: { userId: parseInt(userId) },
      include: {
        emargement: {
          include: {
            session: {
              include: {
                formation: {
                  include: { sections: true },
                },
              },
            },
          },
        },
      },
    });

    res.status(200).json(skillValidations);
  } catch (error) {
    console.error('Erreur lors de la récupération des validations :', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la récupération des validations',
      details: error.message,
    });
  }
});

// Récupérer la progression des validations pour toutes les formations
router.get('/progress', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // Récupérer toutes les formations auxquelles l'utilisateur est inscrit
    const userEmargements = await prisma.emargement.findMany({
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

    // Récupérer toutes les validations de l'utilisateur
    const userValidations = await prisma.skillValidation.findMany({
      where: { userId: parseInt(userId) },
    });

    // Calculer la progression par formation
    const formationProgress = {};
    
    userEmargements.forEach(emargement => {
      const formationId = emargement.session.formation.id;
      const formationTitle = emargement.session.formation.title;
      
      if (!formationProgress[formationId]) {
        formationProgress[formationId] = {
          formationId,
          formationTitle,
          totalSections: 0,
          totalImprovement: 0,
          maxPossibleImprovement: 0,
        };
      }
      
      // Trouver la validation pour cet émargement
      const validation = userValidations.find(v => v.emargementId === emargement.id);
      
      if (validation) {
        const sections = emargement.session.formation.sections || [];
        
        sections.forEach(section => {
          formationProgress[formationId].totalSections++;
          
          // Calculer l'amélioration pour cette section
          const before = validation.skillsBeforeTraining[section.id] || 0;
          const after = validation.skillsAfterTraining[section.id] || 0;
          const improvement = after - before;
          
          formationProgress[formationId].totalImprovement += improvement;
          formationProgress[formationId].maxPossibleImprovement += (10 - before); // 10 est le score maximum
        });
      }
    });

    // Calculer les pourcentages d'amélioration
    const progressData = Object.entries(formationProgress).map(([formationId, data]) => {
      // Si aucune amélioration n'est possible (déjà au max), on considère la progression comme 100%
      const progress = data.maxPossibleImprovement > 0
        ? Math.round((data.totalImprovement / data.maxPossibleImprovement) * 100)
        : 100;
      
      return {
        formationId: parseInt(formationId),
        formationTitle: data.formationTitle,
        progress: Math.min(progress, 100) // Limiter à 100% maximum
      };
    });

    res.status(200).json(progressData);
  } catch (error) {
    console.error('Erreur lors du calcul de la progression des validations:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;

