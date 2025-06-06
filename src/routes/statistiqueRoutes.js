const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateJWT } = require('../authMiddleware');
const { getUserFromToken } = require('../utils/jwt');

router.get('/formateur/statistics', authenticateJWT, async (req, res) => {
  try {
    console.log('Route /api/formateur/statistics appelée');
    
    // 1. Récupérer l'utilisateur à partir du token
    const userId = req.user.userId;
    console.log('ID utilisateur:', userId);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }
    
    console.log('Utilisateur trouvé:', user.name, user.role);
    
    if (user.role !== 'formateur') {
      return res.status(403).json({ message: 'Accès réservé aux formateurs' });
    }
    
    // 2. Récupérer les formations du formateur
    console.log('Recherche des formations pour le formateur:', userId);
    const formations = await prisma.formation.findMany({
      where: { formateurId: userId },
      select: {
        id: true,
        title: true,
        sessions: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            emargements: {
              select: {
                id: true,
                isPresent: true,
                userId: true,
                feedbacks: {
                  select: {
                    id: true,
                    clarity: true,
                    objectives: true,
                    trainer: true,
                    materials: true,
                    materialOrganization: true,
                    welcomeQuality: true,
                    premisesComfort: true,
                    globalRating: true,
                    comments: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log(`Nombre de formations trouvées: ${formations.length}`);
    
    // 3. Si aucune formation n'est trouvée, renvoyer un tableau vide
    if (formations.length === 0) {
      console.log('Aucune formation trouvée pour ce formateur');
      return res.json([]);
    }
    
    // 4. Traiter les données pour créer les statistiques
    const statistics = formations.map(formation => {
      // Calculer le taux de présence
      let totalEmargements = 0;
      let presentEmargements = 0;
      
      formation.sessions.forEach(session => {
        totalEmargements += session.emargements.length;
        presentEmargements += session.emargements.filter(e => e.isPresent).length;
      });
      
      const attendanceRate = totalEmargements > 0 ? (presentEmargements / totalEmargements) * 100 : 0;
      
      // Récupérer tous les feedbacks
      const feedbacks = formation.sessions.flatMap(session => 
        session.emargements.flatMap(emargement => emargement.feedbacks || [])
      );
      const feedbackCount = feedbacks.length;
      
      // Calculer les moyennes des différents critères de feedback
      const calculateAvg = (property) => {
        if (feedbackCount === 0) return 0;
        const sum = feedbacks.reduce((total, fb) => total + (fb[property] || 0), 0);
        return parseFloat((sum / feedbackCount).toFixed(2));
      };
      
      const feedbackAverages = {
        clarity: calculateAvg('clarity'),
        objectives: calculateAvg('objectives'),
        trainer: calculateAvg('trainer'),
        materials: calculateAvg('materials'),
        materialOrganization: calculateAvg('materialOrganization'),
        welcomeQuality: calculateAvg('welcomeQuality'),
        premisesComfort: calculateAvg('premisesComfort'),
        globalRating: calculateAvg('globalRating')
      };
      
      // Calculer le nombre de participants uniques
      const participantIds = new Set();
      formation.sessions.forEach(session => {
        session.emargements.forEach(emargement => {
          participantIds.add(emargement.userId);
        });
      });
      
      const participantCount = participantIds.size;
      
      // Valeur de validation par défaut (à remplacer par un vrai calcul plus tard)
      const validationProgress = 75;
      
      // Générer les données de tendance par session
      const sessionTrendData = formation.sessions.map(session => ({
        date: session.startTime,
        attendanceRate: session.emargements.length > 0 
          ? (session.emargements.filter(e => e.isPresent).length / session.emargements.length) * 100 
          : 0
      }));
      
      // Trier par date
      sessionTrendData.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return {
        formationId: formation.id,
        formationTitle: formation.title || `Formation ${formation.id}`,
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        satisfaction: parseFloat(((feedbackAverages.globalRating || 0) / 5 * 100).toFixed(2)),
        feedbackCount,
        feedbackAverages,
        validationProgress,
        participantCount,
        comments: feedbacks.map(fb => fb.comments).filter(Boolean),
        // Ajouter les données de tendance
        sessionDates: sessionTrendData.map(s => s.date),
        sessionAttendanceRates: sessionTrendData.map(s => parseFloat(s.attendanceRate.toFixed(2)))
      };
    });
    
    console.log('Statistiques générées avec succès');
    res.json(statistics);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération des statistiques', 
      error: error.message
    });
  }
});

// Fonction utilitaire pour calculer les moyennes
function calculateAverage(items, property) {
  if (!items || items.length === 0) return 0;
  const validValues = items.map(item => item[property] || 0).filter(val => !isNaN(val));
  if (validValues.length === 0) return 0;
  const sum = validValues.reduce((total, val) => total + val, 0);
  return parseFloat((sum / validValues.length).toFixed(2));
}

router.get('/statistics/apprenant', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { formationId } = req.query;
    
    // Récupérer les données de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Construire la condition de recherche pour les feedbacks
    let whereCondition = {
      userId: userId,
    };
    
    // Ajouter la condition de formationId si elle est fournie
    if (formationId) {
      whereCondition.formationId = parseInt(formationId);
    }

    // Récupérer les feedbacks de l'utilisateur
    const feedbacks = await prisma.feedback.findMany({
      where: whereCondition,
      include: {
        formation: true,
      },
    });

    // Calculer les moyennes des feedbacks
    const feedbackCount = feedbacks.length;
    const feedbackAverages = {
      clarity: calculateAverageFromFeedbacks(feedbacks, 'clarity', feedbackCount),
      objectives: calculateAverageFromFeedbacks(feedbacks, 'objectives', feedbackCount),
      trainer: calculateAverageFromFeedbacks(feedbacks, 'trainer', feedbackCount),
      materials: calculateAverageFromFeedbacks(feedbacks, 'materials', feedbackCount),
      materialOrganization: calculateAverageFromFeedbacks(feedbacks, 'materialOrganization', feedbackCount),
      welcomeQuality: calculateAverageFromFeedbacks(feedbacks, 'welcomeQuality', feedbackCount),
      premisesComfort: calculateAverageFromFeedbacks(feedbacks, 'premisesComfort', feedbackCount),
      globalRating: calculateAverageFromFeedbacks(feedbacks, 'globalRating', feedbackCount),
    };

    // Récupérer les validations de l'utilisateur
    let validationsWhereCondition = {
      userId: userId,
    };
    
    // Ajouter la condition de formationId si elle est fournie
    if (formationId) {
      validationsWhereCondition.session = {
        formation: {
          id: parseInt(formationId)
        }
      };
    }

    const validations = await prisma.validation.findMany({
      where: validationsWhereCondition,
      include: {
        session: {
          include: {
            formation: {
              include: {
                sections: true
              }
            }
          }
        }
      }
    });

    // Calculer les statistiques de validation
    const validationStats = calculateValidationStats(validations);

    // Renvoyer les statistiques
    res.json({
      user,
      feedbackCount,
      feedbackAverages,
      validationStats,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

function calculateValidationStats(validations) {
  const totalSections = validations.reduce((sum, validation) => sum + validation.session.formation.sections.length, 0);
  const completedSections = validations.reduce((sum, validation) => sum + (validation.completed ? 1 : 0), 0);
  const completionRate = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  return {
    totalSections,
    completedSections,
    completionRate: parseFloat(completionRate.toFixed(2)),
  };
}

// Version alternative - Route pour compter le nombre de formations
router.get('/learner/formations/count', authenticateJWT, async (req, res) => {
  try {
    console.log('Requête reçue pour compter les formations de l\'utilisateur:', req.user.userId);
    const userId = req.user.userId;
    
    // Version simplifiée - compter les formations où l'utilisateur a au moins un émargement
    const formationCount = await prisma.formation.count({
      where: {
        sessions: {
          some: {
            emargements: {
              some: {
                userId: userId
              }
            }
          }
        }
      }
    });
    
    console.log('Nombre de formations trouvées:', formationCount);
    
    res.json({ count: formationCount });
  } catch (error) {
    console.error('Erreur lors du comptage des formations:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Version alternative - Route pour compter le nombre de certificats
router.get('/learner/certificates/count', authenticateJWT, async (req, res) => {
  try {
    console.log('Requête reçue pour compter les certificats de l\'utilisateur:', req.user.userId);
    const userId = req.user.userId;
    
    // Version simplifiée - compter les formations où l'utilisateur a au moins un émargement validé
    const certificateCount = await prisma.formation.count({
      where: {
        sessions: {
          every: {
            emargements: {
              some: {
                userId: userId,
                isPresent: true
              }
            }
          }
        }
      }
    });
    
    console.log('Nombre de certificats trouvés:', certificateCount);
    
    res.json({ count: certificateCount });
  } catch (error) {
    console.error('Erreur lors du comptage des certificats:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Routes de test avec valeurs statiques
router.get('/learner/formations/test', authenticateJWT, (req, res) => {
  console.log('Route de test formations appelée');
  res.json({ count: 5 }); // Valeur statique pour test
});

router.get('/learner/certificates/test', authenticateJWT, (req, res) => {
  console.log('Route de test certificats appelée');
  res.json({ count: 3 }); // Valeur statique pour test
});

// Version ultra-simplifiée pour tester
router.get('/formateur/statistics/test', authenticateJWT, async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    
    // Renvoyer des données de test statiques
    const testData = [
      {
        formationId: 1,
        formationTitle: "Formation test 1",
        attendanceRate: 85.5,
        satisfaction: 4.2,
        feedbackCount: 15,
        validationProgress: 75.0,
        participantCount: 20
      },
      {
        formationId: 2,
        formationTitle: "Formation test 2",
        attendanceRate: 92.0,
        satisfaction: 4.5,
        feedbackCount: 18,
        validationProgress: 80.0,
        participantCount: 25
      }
    ];
    
    res.json(testData);
  } catch (error) {
    console.error('Erreur route test:', error);
    res.status(500).json({ message: 'Erreur test', error: error.message });
  }
});

module.exports = router;





























