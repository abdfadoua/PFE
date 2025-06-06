
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateJWT } = require('../authMiddleware');
const { getUserFromToken } = require('../utils/jwt');

router.get('/admin/statistics', authenticateJWT, async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    // Fetch all formations with sessions and emargements
    const formations = await prisma.formation.findMany({
      include: {
        sessions: {
          include: {
            emargements: true,
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
    });

    // Get all emargement IDs
    const emargementIds = formations.flatMap((formation) =>
      formation.sessions.flatMap((session) => session.emargements.map((emargement) => emargement.id))
    );

    // Fetch feedbacks and skill validations
    const feedbacks = await prisma.feedback.findMany({
      where: { emargementId: { in: emargementIds } },
    });

    const skillValidations = await prisma.skillValidation.findMany({
      where: { emargementId: { in: emargementIds } },
    });

    // Process statistics
    const statistics = formations.map((formation) => {
      const formationEmargementIds = formation.sessions.flatMap((session) =>
        session.emargements.map((emargement) => emargement.id)
      );

      const formationFeedbacks = feedbacks.filter((feedback) =>
        formationEmargementIds.includes(feedback.emargementId)
      );

      const formationValidations = skillValidations.filter((validation) =>
        formationEmargementIds.includes(validation.emargementId)
      );

      // Attendance rate
      const totalEmargements = formation.sessions.reduce(
        (sum, session) => sum + session.emargements.length,
        0
      );
      const presentEmargements = formation.sessions.reduce(
        (sum, session) => sum + session.emargements.filter((e) => e.isPresent).length,
        0
      );
      const attendanceRate = totalEmargements > 0 ? (presentEmargements / totalEmargements) * 100 : 0;

      // Feedback averages
      const feedbackCount = formationFeedbacks.length;
      const avgGlobalRating = feedbackCount > 0
        ? (formationFeedbacks.reduce((sum, fb) => sum + (fb.globalRating || 0), 0) / feedbackCount) * 20
        : 0;

      const feedbackAverages = {
        clarity: calculateAverageFromFeedbacks(formationFeedbacks, 'clarity', feedbackCount),
        objectives: calculateAverageFromFeedbacks(formationFeedbacks, 'objectives', feedbackCount),
        trainer: calculateAverageFromFeedbacks(formationFeedbacks, 'trainer', feedbackCount),
        materials: calculateAverageFromFeedbacks(formationFeedbacks, 'materials', feedbackCount),
        materialOrganization: calculateAverageFromFeedbacks(formationFeedbacks, 'materialOrganization', feedbackCount),
        welcomeQuality: calculateAverageFromFeedbacks(formationFeedbacks, 'welcomeQuality', feedbackCount),
        premisesComfort: calculateAverageFromFeedbacks(formationFeedbacks, 'premisesComfort', feedbackCount),
      };

      // Validation progress
      const totalExpectedValidations = formation._count.sessions * totalEmargements;
      const submittedValidations = formationValidations.length;
      const validationProgress = totalExpectedValidations > 0
        ? (submittedValidations / totalExpectedValidations) * 100
        : 0;

      // Feedback evaluation rate
      const totalSessions = formation._count.sessions;
      const emargementIdsWithFeedback = formationFeedbacks.map((fb) => fb.emargementId);
      const sessionIdsWithFeedback = new Set(
        formation.sessions
          .filter((session) =>
            session.emargements.some((emargement) => emargementIdsWithFeedback.includes(emargement.id))
          )
          .map((session) => session.id)
      );
      const sessionsWithFeedback = sessionIdsWithFeedback.size;
      const feedbackEvaluationRate = totalSessions > 0 ? (sessionsWithFeedback / totalSessions) * 100 : 0;

      // Calcul du score global pour faciliter le classement côté client
      const globalScore = (attendanceRate * 0.4) + (avgGlobalRating * 0.3) + (validationProgress * 0.3);

      return {
        formationId: formation.id,
        formationTitle: formation.title || `Formation ${formation.id}`,
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        satisfaction: parseFloat(avgGlobalRating.toFixed(2)),
        feedbackCount,
        feedbackAverages,
        validationProgress: parseFloat(validationProgress.toFixed(2)),
        feedbackEvaluationRate: parseFloat(feedbackEvaluationRate.toFixed(2)),
        comments: formationFeedbacks.map((fb) => fb.comments).filter((c) => c),
        globalScore: parseFloat(globalScore.toFixed(2))
      };
    });

    res.json(statistics);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message, stack: error.stack });
  }
});

function calculateAverageFromFeedbacks(feedbacks, property, feedbackCount) {
  if (feedbackCount === 0) return 0;
  const sum = feedbacks.reduce((total, fb) => total + (fb[property] || 0), 0);
  return (sum / feedbackCount) * 20;
}

// Ajouter un nouvel endpoint pour les statistiques globales
router.get('/admin/global-statistics', authenticateJWT, async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    // Log the start of processing
    console.log('Début du traitement des statistiques globales');

    // Wrap each database operation in try/catch for better error isolation
    let learnersCount, trainersCount, formationsCount;
    try {
      // Compter le nombre total d'apprenants (rôle = 'apprenant')
      learnersCount = await prisma.user.count({
        where: { role: 'apprenant' }
      });
      console.log('Nombre d\'apprenants:', learnersCount);

      // Compter le nombre total de formateurs (rôle = 'formateur')
      trainersCount = await prisma.user.count({
        where: { role: 'formateur' }
      });
      console.log('Nombre de formateurs:', trainersCount);
      
      // Compter le nombre total de formations
      formationsCount = await prisma.formation.count();
      console.log('Nombre de formations:', formationsCount);
    } catch (dbError) {
      console.error('Erreur lors du comptage des utilisateurs/formations:', dbError);
      return res.status(500).json({ 
        message: 'Erreur lors du comptage des utilisateurs/formations', 
        error: dbError.message 
      });
    }

    // Récupérer les formations avec leurs statistiques pour trouver la meilleure
    const formations = await prisma.formation.findMany({
      include: {
        sessions: {
          include: {
            emargements: {
              include: {
                feedbacks: true,
                skillValidations: true
              }
            }
          }
        },
        formateur: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true
          }
        }
      }
    });

    // Calculer les statistiques pour chaque formation
    const formationsWithStats = formations.map(formation => {
      // Calculer le taux de présence
      const totalEmargements = formation.sessions.reduce(
        (sum, session) => sum + session.emargements.length, 0
      );
      const presentEmargements = formation.sessions.reduce(
        (sum, session) => sum + session.emargements.filter(e => e.isPresent).length, 0
      );
      const attendanceRate = totalEmargements > 0 ? (presentEmargements / totalEmargements) * 100 : 0;

      // Calculer la satisfaction moyenne
      const feedbacks = formation.sessions.flatMap(session => 
        session.emargements.flatMap(emargement => emargement.feedbacks || [])
      );
      const feedbackCount = feedbacks.length;
      
      const calculateAvg = (property) => {
        if (feedbackCount === 0) return 0;
        const sum = feedbacks.reduce((total, fb) => total + (fb[property] || 0), 0);
        return sum / feedbackCount;
      };
      
      const avgGlobalRating = calculateAvg('globalRating') * 20; // Sur 100
      
      // Calculer le taux de validation des compétences
      const validations = formation.sessions.flatMap(session => 
        session.emargements.flatMap(emargement => emargement.skillValidations || [])
      );
      const validationCount = validations.length;
      const validationRate = totalEmargements > 0 ? (validationCount / totalEmargements) * 100 : 0;
      
      // Score global
      const globalScore = (attendanceRate * 0.4) + (avgGlobalRating * 0.3) + (validationRate * 0.3);
      
      return {
        id: formation.id,
        title: formation.title,
        formateur: formation.formateur,
        attendanceRate,
        satisfaction: avgGlobalRating,
        validationRate,
        globalScore,
        participantsCount: new Set(formation.sessions.flatMap(s => s.emargements.map(e => e.userId))).size
      };
    });

    // Trouver la meilleure formation
    const bestFormation = formationsWithStats.length > 0 
      ? formationsWithStats.sort((a, b) => b.globalScore - a.globalScore)[0]
      : null;

    // Calculer les statistiques par formateur
    const trainerStats = {};
    formationsWithStats.forEach(formation => {
      const formateurId = formation.formateur.id;
      
      if (!trainerStats[formateurId]) {
        trainerStats[formateurId] = {
          formateur: formation.formateur,
          formations: 0,
          totalParticipants: 0,
          avgAttendance: 0,
          avgSatisfaction: 0,
          avgValidation: 0,
          formationScores: []
        };
      }
      
      trainerStats[formateurId].formations += 1;
      trainerStats[formateurId].totalParticipants += formation.participantsCount;
      trainerStats[formateurId].formationScores.push({
        attendanceRate: formation.attendanceRate,
        satisfaction: formation.satisfaction,
        validationRate: formation.validationRate,
        globalScore: formation.globalScore
      });
    });
    
    // Calculer les moyennes pour chaque formateur
    const trainersWithStats = Object.values(trainerStats).map(trainer => {
      const formationCount = trainer.formations;
      const avgAttendance = trainer.formationScores.reduce((sum, f) => sum + f.attendanceRate, 0) / formationCount;
      const avgSatisfaction = trainer.formationScores.reduce((sum, f) => sum + f.satisfaction, 0) / formationCount;
      const avgValidation = trainer.formationScores.reduce((sum, f) => sum + f.validationRate, 0) / formationCount;
      const globalScore = (avgAttendance * 0.4) + (avgSatisfaction * 0.3) + (avgValidation * 0.3);
      
      return {
        ...trainer,
        avgAttendance,
        avgSatisfaction,
        avgValidation,
        globalScore
      };
    });
    
    // Trouver le meilleur formateur
    const bestTrainer = trainersWithStats.length > 0 
      ? trainersWithStats.sort((a, b) => b.globalScore - a.globalScore)[0]
      : null;

    // Statistiques par mois (pour les tendances)
    const monthlyStats = await getMonthlyStats();

    res.json({
      counts: {
        learners: learnersCount,
        trainers: trainersCount,
        formations: formationsCount
      },
      bestFormation,
      bestTrainer,
      monthlyStats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques globales:', error);
    // Send more detailed error information
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Fonction pour obtenir les statistiques mensuelles
async function getMonthlyStats() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Récupérer toutes les sessions des 6 derniers mois
  const sessions = await prisma.session.findMany({
    where: {
      startTime: {
        gte: sixMonthsAgo
      }
    },
    include: {
      emargements: {
        include: {
          feedbacks: true,
          skillValidations: true
        }
      }
    }
  });
  
  // Organiser les données par mois
  const monthlyData = {};
  
  sessions.forEach(session => {
    const month = new Date(session.startTime).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!monthlyData[month]) {
      monthlyData[month] = {
        totalEmargements: 0,
        presentEmargements: 0,
        feedbacks: [],
        validations: 0
      };
    }
    
    monthlyData[month].totalEmargements += session.emargements.length;
    monthlyData[month].presentEmargements += session.emargements.filter(e => e.isPresent).length;
    monthlyData[month].feedbacks = [
      ...monthlyData[month].feedbacks,
      ...session.emargements.flatMap(e => e.feedbacks || [])
    ];
    monthlyData[month].validations += session.emargements.filter(e => e.skillValidations && e.skillValidations.length > 0).length;
  });
  
  // Calculer les statistiques pour chaque mois
  const result = Object.entries(monthlyData).map(([month, data]) => {
    const attendanceRate = data.totalEmargements > 0 
      ? (data.presentEmargements / data.totalEmargements) * 100 
      : 0;
    
    const avgSatisfaction = data.feedbacks.length > 0
      ? (data.feedbacks.reduce((sum, fb) => sum + (fb.globalRating || 0), 0) / data.feedbacks.length) * 20
      : 0;
    
    const validationRate = data.totalEmargements > 0
      ? (data.validations / data.totalEmargements) * 100
      : 0;
    
    return {
      month,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      satisfaction: parseFloat(avgSatisfaction.toFixed(2)),
      validationRate: parseFloat(validationRate.toFixed(2))
    };
  });
  
  // Trier par date
  return result.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA - dateB;
  });
}

// Improve error handling in the filtered-statistics endpoint
router.get('/admin/filtered-statistics', authenticateJWT, async (req, res) => {
  try {
    console.log('Starting /admin/filtered-statistics endpoint');
    console.log('Query parameters:', req.query);
    
    const user = await getUserFromToken(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const { formateurId, formationId, startDate, endDate } = req.query;
    
    // Construire les conditions de filtrage
    let whereCondition = {};
    
    if (formateurId) {
      whereCondition.formateurId = parseInt(formateurId);
    }
    
    if (formationId) {
      whereCondition.id = parseInt(formationId);
    }
    
    // Simplified date filtering to avoid potential issues
    if (startDate || endDate) {
      whereCondition.sessions = {
        some: {}
      };
      
      if (startDate) {
        try {
          const parsedStartDate = new Date(startDate);
          console.log('Parsed start date:', parsedStartDate);
          whereCondition.sessions.some.startTime = {
            ...(whereCondition.sessions.some.startTime || {}),
            gte: parsedStartDate
          };
        } catch (dateError) {
          console.error('Error parsing start date:', dateError);
          // Continue without this filter if date parsing fails
        }
      }
      
      if (endDate) {
        try {
          const parsedEndDate = new Date(endDate);
          console.log('Parsed end date:', parsedEndDate);
          whereCondition.sessions.some.startTime = {
            ...(whereCondition.sessions.some.startTime || {}),
            lte: parsedEndDate
          };
        } catch (dateError) {
          console.error('Error parsing end date:', dateError);
          // Continue without this filter if date parsing fails
        }
      }
    }
    
    console.log('Where condition:', JSON.stringify(whereCondition, null, 2));
    
    // Récupérer les formations filtrées
    const formations = await prisma.formation.findMany({
      where: whereCondition,
      include: {
        sessions: {
          include: {
            emargements: {
              include: {
                feedbacks: true,
                skillValidations: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        formateur: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`Found ${formations.length} formations`);
    
    // Return empty array if no formations found
    if (formations.length === 0) {
      return res.json([]);
    }
    
    // Process formations with safer error handling
    const statistics = formations.map(formation => {
      try {
        // Safely calculate statistics with default values
        const totalEmargements = formation.sessions.reduce(
          (sum, session) => sum + (session.emargements?.length || 0), 0
        );
        
        const presentEmargements = formation.sessions.reduce(
          (sum, session) => sum + (session.emargements?.filter(e => e?.isPresent)?.length || 0), 0
        );
        
        const attendanceRate = totalEmargements > 0 ? (presentEmargements / totalEmargements) * 100 : 0;

        // Safely get feedbacks
        const feedbacks = formation.sessions.flatMap(session => 
          (session.emargements || []).flatMap(emargement => (emargement.feedbacks || []))
        );
        
        const feedbackCount = feedbacks.length;
        
        // Calculate averages safely
        const calculateAvg = (property) => {
          if (feedbackCount === 0) return 0;
          const sum = feedbacks.reduce((total, fb) => total + (fb?.[property] || 0), 0);
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
        
        // Calculate satisfaction
        const satisfaction = parseFloat(((feedbackAverages.globalRating || 0) * 20).toFixed(2));
        
        // Calculate validation progress
        const validations = formation.sessions.flatMap(session => 
          (session.emargements || []).flatMap(emargement => (emargement.skillValidations || []))
        );
        
        const validationCount = validations.length;
        const validationProgress = totalEmargements > 0 ? (validationCount / totalEmargements) * 100 : 0;
        
        // Get unique participants
        const participants = new Set(
          formation.sessions.flatMap(session => 
            (session.emargements || []).map(emargement => emargement?.userId)
          ).filter(id => id) // Filter out undefined/null IDs
        );
        
        // Get comments safely
        const comments = feedbacks
          .filter(fb => fb?.comments)
          .map(fb => {
            try {
              const emargement = formation.sessions
                .flatMap(s => s.emargements || [])
                .find(e => e?.feedbacks && e.feedbacks.some(f => f?.id === fb?.id));
              
              return {
                comment: fb.comments,
                user: (emargement?.user?.name) || 'Anonyme'
              };
            } catch (commentError) {
              console.error('Error processing comment:', commentError);
              return {
                comment: fb.comments,
                user: 'Anonyme'
              };
            }
          });
        
        return {
          formationId: formation.id,
          formationTitle: formation.title || `Formation ${formation.id}`,
          formateur: formation.formateur,
          attendanceRate: parseFloat(attendanceRate.toFixed(2)),
          satisfaction,
          feedbackCount,
          feedbackAverages,
          validationProgress: parseFloat(validationProgress.toFixed(2)),
          participantCount: participants.size,
          comments: comments.map(c => c.comment), // Simplify to just return the comment text
          sessions: formation.sessions.map(session => ({
            id: session.id,
            date: session.startTime,
            attendanceRate: session.emargements?.length > 0 
              ? ((session.emargements.filter(e => e?.isPresent)?.length || 0) / session.emargements.length) * 100 
              : 0
          }))
        };
      } catch (formationError) {
        console.error(`Error processing formation ${formation.id}:`, formationError);
        // Return a minimal valid object if processing fails
        return {
          formationId: formation.id,
          formationTitle: formation.title || `Formation ${formation.id}`,
          formateur: formation.formateur,
          attendanceRate: 0,
          satisfaction: 0,
          feedbackCount: 0,
          feedbackAverages: {},
          validationProgress: 0,
          participantCount: 0,
          comments: [],
          sessions: []
        };
      }
    });

    console.log('Successfully processed statistics');
    res.json(statistics);
  } catch (error) {
    console.error('Detailed error in /admin/filtered-statistics:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des statistiques filtrées', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// Add these endpoints to your existing statistics router or create a separate router

// Get all trainers (formateurs)
router.get('/admin/trainers', authenticateJWT, async (req, res) => {
  try {
    console.log('Starting /admin/trainers endpoint');
    
    // Verify token and user role
    const user = await getUserFromToken(req);
    console.log('User retrieved:', user.id, user.role);
    
    if (user.role !== 'admin') {
      console.log('Access denied: User is not admin');
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    console.log('Querying trainers from database');
    const trainers = await prisma.user.findMany({
      where: { role: 'formateur' },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true
      }
    });
    
    console.log(`Found ${trainers.length} trainers`);
    res.json(trainers);
  } catch (error) {
    console.error('Detailed error in /admin/trainers:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Send a more detailed error response
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des formateurs',
      error: error.message,
      type: error.name,
      // Only include stack trace in development
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all formations
router.get('/admin/formations', authenticateJWT, async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const formations = await prisma.formation.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        formateurId: true,
        formateur: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(formations);
  } catch (error) {
    console.error('Erreur lors de la récupération des formations:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Add a simple test endpoint
router.get('/admin/test-connection', authenticateJWT, async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }
    
    // Simple database test
    const userCount = await prisma.user.count();
    
    res.json({ 
      message: 'Connexion réussie', 
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur de test de connexion:', error);
    res.status(500).json({ message: 'Erreur de test', error: error.message });
  }
});

// Add a very simple diagnostic endpoint
router.get('/admin/diagnostic', authenticateJWT, async (req, res) => {
  try {
    console.log('Starting diagnostic endpoint');
    
    // Basic authentication check
    const user = await getUserFromToken(req);
    console.log('User authenticated:', user.id, user.role);
    
    // Basic database connectivity check
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database test successful:', dbTest);
    
    res.json({
      status: 'success',
      user: {
        id: user.id,
        role: user.role,
        email: user.email
      },
      database: {
        connected: true,
        testResult: dbTest
      },
      server: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'not set'
      }
    });
  } catch (error) {
    console.error('Diagnostic endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;







