const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateJWT } = require('../authMiddleware');
const { getUserFromToken } = require('../utils/jwt');

router.get('/learner/statistics', authenticateJWT, async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (user.role !== 'apprenant') {
      return res.status(403).json({ message: 'Accès réservé aux apprenants' });
    }

    // Compter les formations
    const formationCount = await prisma.formation.count({
      where: {
        sessions: {
          some: {
            emargements: {
              some: {
                userId: user.id
              }
            }
          }
        }
      }
    });
    
    // Compter les certificats
    const certificateCount = await prisma.formation.count({
      where: {
        sessions: {
          every: {
            emargements: {
              some: {
                userId: user.id,
                isPresent: true
              }
            }
          }
        }
      }
    });

    // Récupérer les formations de l'utilisateur
    const userFormations = await prisma.formation.findMany({
      where: {
        sessions: {
          some: {
            emargements: {
              some: {
                userId: user.id
              }
            }
          }
        }
      },
      include: {
        sections: true,
        sessions: {
          include: {
            emargements: {
              where: {
                userId: user.id
              },
              include: {
                skillValidations: {
                  where: {
                    userId: user.id
                  }
                }
              }
            }
          }
        }
      }
    });

    // Traiter les statistiques pour chaque formation
    const statistics = await Promise.all(userFormations.map(async (formation) => {
      try {
        // Récupérer tous les émargements de l'utilisateur pour cette formation
        const emargements = formation.sessions.flatMap(session => session.emargements);
        
        // Récupérer toutes les validations de compétences pour cette formation
        const validations = emargements
          .flatMap(emargement => emargement.skillValidations || [])
          .filter(validation => validation !== null && validation !== undefined);
        
        // Récupérer les feedbacks pour cette formation
        const feedbacks = await prisma.feedback.findMany({
          where: {
            userId: user.id,
            emargement: {
              session: {
                formationId: formation.id
              }
            }
          }
        });

        // Calculer le taux de présence
        const totalEmargements = emargements.length;
        const presentEmargements = emargements.filter(e => e.isPresent).length;
        const attendanceRate = totalEmargements > 0 ? (presentEmargements / totalEmargements) * 100 : 0;

        // Calculer les moyennes de feedback
        const feedbackCount = feedbacks.length;
        const avgGlobalRating = feedbackCount > 0
          ? (feedbacks.reduce((sum, fb) => sum + (fb.globalRating || 0), 0) / feedbackCount) * 20
          : 0;

        const feedbackAverages = {
          clarity: calculateAverageFromFeedbacks(feedbacks, 'clarity', feedbackCount),
          objectives: calculateAverageFromFeedbacks(feedbacks, 'objectives', feedbackCount),
          trainer: calculateAverageFromFeedbacks(feedbacks, 'trainer', feedbackCount),
          materials: calculateAverageFromFeedbacks(feedbacks, 'materials', feedbackCount),
          materialOrganization: calculateAverageFromFeedbacks(feedbacks, 'materialOrganization', feedbackCount),
          welcomeQuality: calculateAverageFromFeedbacks(feedbacks, 'welcomeQuality', feedbackCount),
          premisesComfort: calculateAverageFromFeedbacks(feedbacks, 'premisesComfort', feedbackCount),
          globalRating: avgGlobalRating,
        };

        // Assurons-nous que le calcul du score est identique à celui de la validation d'acquis
        const sectionScores = formation.sections.map(section => {
          // Récupérer toutes les validations pour cette section
          const sectionValidations = validations.filter(v => 
            v && v.skillsBeforeTraining && v.skillsAfterTraining && 
            v.skillsBeforeTraining[section.id] !== undefined && 
            v.skillsAfterTraining[section.id] !== undefined
          );
          
          // Calculer les moyennes avant/après
          const validationCount = sectionValidations.length;
          const beforeSum = sectionValidations.reduce((sum, v) => sum + (v.skillsBeforeTraining[section.id] || 0), 0);
          const afterSum = sectionValidations.reduce((sum, v) => sum + (v.skillsAfterTraining[section.id] || 0), 0);
          
          const beforeAvg = validationCount > 0 ? beforeSum / validationCount : 0;
          const afterAvg = validationCount > 0 ? afterSum / validationCount : 0;
          
          // Calculer l'amélioration et le pourcentage comme dans la validation d'acquis
          const improvement = afterAvg - beforeAvg;
          const maxPossibleImprovement = 10 - beforeAvg; // 10 est le score maximum
          const progressPercentage = maxPossibleImprovement > 0 
            ? Math.round((improvement / maxPossibleImprovement) * 100) 
            : 100;
          
          return {
            sectionId: section.id,
            sectionTitle: section.title,
            before: parseFloat(beforeAvg.toFixed(1)),
            after: parseFloat(afterAvg.toFixed(1)),
            improvement: parseFloat(improvement.toFixed(1)),
            progressPercentage: Math.min(progressPercentage, 100)
          };
        });

        // Calculer les moyennes globales des compétences
        const totalBefore = sectionScores.reduce((sum, section) => sum + section.before, 0);
        const totalAfter = sectionScores.reduce((sum, section) => sum + section.after, 0);
        const sectionCount = sectionScores.length || 1; // Éviter la division par zéro
        
        const skillsBefore = parseFloat((totalBefore / sectionCount).toFixed(1));
        const skillsAfter = parseFloat((totalAfter / sectionCount).toFixed(1));
        
        // Calculer le score global de compétence (sur 100)
        const skillsImprovement = skillsAfter - skillsBefore;
        const maxPossibleImprovement = 10 - skillsBefore;
        const skillsScore = maxPossibleImprovement > 0 
          ? Math.round((skillsImprovement / maxPossibleImprovement) * 100) 
          : 100;

        // Calculer la date d'achat (première session)
        const purchaseDate = formation.sessions.length > 0 
          ? new Date(Math.min(...formation.sessions.map(s => new Date(s.startTime || s.date).getTime())))
          : new Date();

        return {
          formationId: formation.id,
          formationTitle: formation.title || `Formation ${formation.id}`,
          attendanceRate: parseFloat(attendanceRate.toFixed(2)),
          feedbackAverages,
          skillsBefore: parseFloat((skillsBefore * 10).toFixed(1)), // Sur 100
          skillsAfter: parseFloat((skillsAfter * 10).toFixed(1)),   // Sur 100
          skillsScore,                                              // Score de progression sur 100
          sectionScores,                                            // Détails par section
          purchaseDate,
          price: formation.price || 0,
          comments: feedbacks.map((fb) => fb.comments).filter((c) => c),
        };
      } catch (error) {
        console.error(`Erreur lors du traitement de la formation ${formation.id}:`, error);
        // Retourner un objet par défaut en cas d'erreur
        return {
          formationId: formation.id,
          formationTitle: formation.title || `Formation ${formation.id}`,
          attendanceRate: 0,
          feedbackAverages: {},
          skillsBefore: 0,
          skillsAfter: 0,
          skillsScore: 0,
          sectionScores: [],
          purchaseDate: new Date(),
          price: formation.price || 0,
          comments: []
        };
      }
    }));

    console.log('Statistiques calculées pour', statistics.length, 'formations');
    return res.json({
      counts: {
        formations: formationCount,
        certificates: certificateCount
      },
      formations: statistics
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques apprenant:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message, stack: error.stack });
  }
});

function calculateAverageFromFeedbacks(feedbacks, property, feedbackCount) {
  if (feedbackCount === 0) return 0;
  const sum = feedbacks.reduce((total, fb) => total + (fb[property] || 0), 0);
  return (sum / feedbackCount) * 20;
}

// Route pour compter le nombre de formations
router.get('/learner/formations/count', authenticateJWT, async (req, res) => {
  try {
    console.log('Requête reçue pour compter les formations de l\'utilisateur:', req.user.userId);
    const userId = req.user.userId;
    
    // Compter les formations où l'utilisateur a au moins un émargement
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

// Route pour compter le nombre de certificats
router.get('/learner/certificates/count', authenticateJWT, async (req, res) => {
  try {
    console.log('Requête reçue pour compter les certificats de l\'utilisateur:', req.user.userId);
    const userId = req.user.userId;
    
    // Compter les formations où l'utilisateur a assisté à toutes les sessions
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

module.exports = router;




















