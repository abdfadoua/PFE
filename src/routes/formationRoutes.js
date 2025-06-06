const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { authenticateJWT } = require('../authMiddleware');
const sendEmail = require('../utils/emailService');

const prisma = new PrismaClient();

// Debug: Log available Prisma models
console.log('Prisma models available:', Object.keys(prisma));

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

// Route to get my formations
router.get('/my-formations', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;

    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: {
        formation: {
          include: {
            formateur: true,
            sessions: {
              include: {
                emargements: {
                  select: {
                    userId: true,
                    signature: true,
                    isPresent: true,
                    validatedBy: true,
                    validationDate: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = purchases.map((purchase) => {
      const formation = purchase.formation;
      const sessions = formation.sessions.map((session) => {
        const userEmargement = session.emargements.find((e) => e.userId === userId);
        const isEmargedByUser = !!userEmargement?.signature;
        const isValidatedByFormateur = session.emargements.every(
          (e) => e.validatedBy !== null && e.isPresent !== null
        );
        console.log(`Session ${session.id}: isEmargedByUser=${isEmargedByUser}, isValidatedByFormateur=${isValidatedByFormateur}`);
        return {
          ...session,
          isEmargedByUser,
          isValidatedByFormateur,
        };
      });

      const allSessionsEmargedByUser = sessions.every((s) => s.isEmargedByUser);
      const allSessionsValidatedByFormateur = sessions.every((s) => s.isValidatedByFormateur);
      console.log(`Formation ${formation.id}: allSessionsEmargedByUser=${allSessionsEmargedByUser}, allSessionsValidatedByFormateur=${allSessionsValidatedByFormateur}`);

      return {
        formation: {
          ...formation,
          formateur: formation.formateur,
          sessions,
          allSessionsEmargedByUser,
          allSessionsValidatedByFormateur,
        },
        user: req.user,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération des formations :', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// Route to sign a session
router.post('/sessions/:sessionId/emargement', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    const { signature } = req.body;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      include: { formation: true },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée.' });
    }

    const emargement = await prisma.emargement.upsert({
      where: {
        userId_sessionId: {
          userId,
          sessionId: parseInt(sessionId),
        },
      },
      update: {
        signature,
        emargementDate: new Date(),
      },
      create: {
        user: { connect: { id: userId } },
        session: { connect: { id: parseInt(sessionId) } },
        isPresent: null, // Initial state "pending"
        signature,
        emargementDate: new Date(),
      },
    });

    res.status(201).json(emargement);
  } catch (error) {
    console.error('Erreur lors de l\'émargement :', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// Route for certificate information
router.get('/formations/:id/certificate-info', authenticateJWT, async (req, res) => {
  try {
    const formationId = parseInt(req.params.id);
    const userId = req.user.userId;

    const purchase = await prisma.purchase.findFirst({
      where: { userId, formationId },
    });

    if (!purchase) {
      return res.status(403).json({ message: "Vous n'êtes pas inscrit à cette formation" });
    }

    const formationBasic = await prisma.formation.findUnique({
      where: { id: formationId },
      select: { id: true, formateurId: true },
    });

    if (!formationBasic) {
      return res.status(404).json({ message: 'Formation non trouvée' });
    }

    const formation = await prisma.formation.findUnique({
      where: { id: formationId },
      include: {
        formateur: { select: { id: true, name: true } },
        sessions: {
          include: {
            emargements: {
              where: { userId: formationBasic.formateurId },
              select: { signature: true },
            },
          },
        },
      },
    });

    const formateurSignature = formation.sessions
      .flatMap((session) => session.emargements)
      .find((e) => e.signature)?.signature || null;

    res.json({
      formateur: {
        ...formation.formateur,
        signature: formateurSignature,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des infos du certificat :', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// Route for trainer's formations
router.get('/formations/formateur', authenticateJWT, async (req, res) => {
  try {
    const formations = await prisma.formation.findMany({
      where: { formateurId: req.user.userId },
      include: {
        sessions: true,
        purchases: {
          include: {
            user: true,
          },
        },
      },
    });

    res.json(formations);
  } catch (error) {
    console.error('Erreur lors de la récupération des formations :', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// Route for trainer's dashboard data
router.get('/formateur', authenticateJWT, async (req, res) => {
  try {
    console.log("Début de la récupération des formations pour formateur ID:", req.user.userId);
    const formations = await prisma.formation.findMany({
      where: { formateurId: req.user.userId },
      include: {
        sessions: { 
          orderBy: { startTime: 'asc' },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            formationId: true,
          },
        },
        purchases: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                feedbacks: {
                  include: {
                    emargement: {
                      include: {
                        session: {
                          select: {
                            id: true,
                            formationId: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
    console.log(`Formations trouvées : ${formations.length}`);
    console.log("Formations brutes:", JSON.stringify(formations, null, 2));

    const formationsAvecScores = await Promise.all(formations.map(async (formation) => {
      console.log(`Traitement de la formation ID: ${formation.id}`);
      const participants = await prisma.purchase.findMany({
        where: { formationId: formation.id },
        include: { 
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      console.log(`Participants trouvés pour formation ${formation.id}: ${participants.length}`);

      // Calculer nbEvaluation : nombre d'apprenants uniques avec feedbacks
      const uniqueFeedbackUsers = new Set();
      formation.purchases.forEach(purchase => {
        const feedbacks = purchase.user.feedbacks.filter(
          feedback => feedback.emargement?.session?.formationId === formation.id
        );
        if (feedbacks.length > 0) {
          uniqueFeedbackUsers.add(purchase.user.id);
        }
      });
      const nbEvaluation = uniqueFeedbackUsers.size;
      console.log(`NB Evaluations pour formation ${formation.id}: ${nbEvaluation}`);

      // Log des feedbacks inclus dans la réponse
      formation.purchases.forEach(purchase => {
        console.log(`Feedbacks pour utilisateur ${purchase.user.id} (Formation ${formation.id}):`, 
          JSON.stringify(purchase.user.feedbacks, null, 2));
      });

      let scoreFormation = 0;
      try {
        const scoresParticipants = await Promise.all(participants.map(async (participant) => {
          try {
            // Récupération des SkillValidations
            const skillValidations = await prisma.skillValidation.findMany({
              where: { 
                userId: participant.userId,
                emargement: { session: { formationId: formation.id } },
              },
            });
            console.log(`SkillValidations trouvées pour participant ${participant.userId}: ${skillValidations.length}`);

            let totalDiff = 0, count = 0;
            skillValidations.forEach(v => {
              try {
                const originDiff = (v.skillsAfterTraining?.originAfter || 0) - (v.skillsBeforeTraining?.originBefore || 0);
                const culturalDiff = (v.skillsAfterTraining?.culturalAfter || 0) - (v.skillsBeforeTraining?.culturalBefore || 0);
                const diff = (originDiff + culturalDiff) / 2;
                totalDiff += diff;
                count++;
              } catch (error) {
                console.error(`Erreur dans le calcul de diff pour validation ${v.id}:`, error.message);
              }
            });
            const avgDiff = count ? totalDiff / count : 0;
            const skillScore = (avgDiff / 10) * 10;

            // Récupération des Feedbacks
            const feedbacks = await prisma.feedback.findMany({
              where: { 
                userId: participant.userId,
                emargement: { session: { formationId: formation.id } },
              },
            });
            console.log(`Feedbacks trouvés pour participant ${participant.userId}: ${feedbacks.length}`);

            let pedaTotal = 0, pedaCount = 0;
            let envTotal = 0, envCount = 0;

            feedbacks.forEach(f => {
              // Calcul du score pédagogique (5 critères)
              if (f.clarity && f.objectives && f.level && f.trainer && f.materials) {
                pedaTotal += (f.clarity + f.objectives + f.level + f.trainer + f.materials) / 5;
                pedaCount++;
              }
              
              // Calcul du score environnement (3 nouveaux critères)
              if (f.materialOrganization && f.welcomeQuality && f.premisesComfort) {
                envTotal += (f.materialOrganization + f.welcomeQuality + f.premisesComfort) / 3;
                envCount++;
              }
            });

            const avgPeda = pedaCount ? pedaTotal / pedaCount : 0;
            const avgEnv = envCount ? envTotal / envCount : 0;

            // Satisfaction via globalRating
            let globalTotal = 0, globalCount = 0;
            feedbacks.forEach(f => {
              if (f.globalRating !== null) {
                globalTotal += f.globalRating;
                globalCount++;
              }
            });
            const avgGlobal = globalCount ? globalTotal / globalCount : 0;

            // Calcul final avec les nouveaux poids
            // 40% pédagogie + 20% environnement + 30% compétences + 10% satisfaction globale
            const score = (skillScore * 0.3) + (avgPeda * 0.4) + (avgEnv * 0.2) + (avgGlobal * 0.1);
            console.log(`Score calculé pour participant ${participant.userId}: ${score.toFixed(2)}`);
            return score;
          } catch (error) {
            console.error(`Erreur pour participant ${participant.userId}:`, error.message);
            return 0; // Retourner 0 en cas d'erreur
          }
        }));

        scoreFormation = scoresParticipants.length 
          ? scoresParticipants.reduce((a, b) => a + b, 0) / scoresParticipants.length 
          : 0;
        console.log(`Score moyen pour formation ${formation.id}: ${scoreFormation.toFixed(2)}`);
      } catch (error) {
        console.error(`Erreur lors du calcul du score pour formation ${formation.id}:`, error.message);
        scoreFormation = 0; // Retourner 0 en cas d'erreur
      }

      return {
        id: formation.id,
        title: formation.title,
        date: formation.date,
        formateurId: formation.formateurId,
        sessions: formation.sessions,
        purchases: formation.purchases,
        evaluationScore: scoreFormation.toFixed(2),
        nbEvaluation: nbEvaluation,
      };
    }));

    console.log("Formations avec scores et nbEvaluation:", JSON.stringify(formationsAvecScores, null, 2));
    res.json(formationsAvecScores);
  } catch (error) {
    console.error("Erreur dans la route /formateur:", error.message, error.stack);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Route for formation participants
router.get('/formations/:id/participants', authenticateJWT, async (req, res) => {
  try {
    const { id: formationId } = req.params;

    const formation = await prisma.formation.findFirst({
      where: {
        id: parseInt(formationId),
        formateurId: req.user.userId,
      },
    });

    if (!formation) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à voir cette formation" });
    }

    const participants = await prisma.purchase.findMany({
      where: { formationId: parseInt(formationId) },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, profileImage: true },
        },
      },
    });

    const participantsWithEmargements = await Promise.all(
      participants.map(async (purchase) => {
        const emargements = await prisma.emargement.findMany({
          where: { userId: purchase.userId, session: { formationId: parseInt(formationId) } },
        });
        return {
          id: purchase.userId,
          name: purchase.user.name,
          email: purchase.user.email,
          phone: purchase.user.phone,
          emargements,
        };
      })
    );

    const formateurEmargements = await prisma.emargement.findMany({
      where: {
        userId: req.user.userId,
        session: { formationId: parseInt(formationId) },
      },
    });

    if (formateurEmargements.length > 0) {
      const formateur = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, name: true, email: true, phone: true, profileImage: true },
      });

      if (formateur) {
        participantsWithEmargements.push({
          id: formateur.id,
          name: formateur.name,
          email: formateur.email,
          phone: formateur.phone,
          profileImage: formateur.profileImage,
          emargements: formateurEmargements,
        });
      }
    }

    res.json(participantsWithEmargements);
  } catch (error) {
    console.error('Erreur lors de la récupération des participants :', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// Route to validate participant presence
router.post('/sessions/:sessionId/validate', authenticateJWT, async (req, res) => {
  try {
    const { participantId, isPresent } = req.body;
    const sessionId = parseInt(req.params.sessionId);

    console.log(`Validation de présence: sessionId=${sessionId}, participantId=${participantId}, isPresent=${isPresent}, validateur=${req.user.userId}`);

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        formation: { formateurId: req.user.userId },
      },
    });

    if (!session) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const purchase = await prisma.purchase.findFirst({
      where: {
        userId: participantId,
        formationId: session.formationId,
      },
    });

    if (!purchase) {
      return res.status(400).json({ message: 'Participant non inscrit' });
    }

    // Vérifier si l'émargement existe déjà
    const existingEmargement = await prisma.emargement.findUnique({
      where: {
        userId_sessionId: {
          userId: participantId,
          sessionId,
        },
      },
    });

    let emargement;
    
    if (existingEmargement) {
      // Mettre à jour l'émargement existant
      emargement = await prisma.emargement.update({
        where: {
          id: existingEmargement.id,
        },
        data: {
          isPresent,
          validatedBy: req.user.userId,
          validationDate: new Date(),
        },
      });
    } else {
      // Créer un nouvel émargement
      emargement = await prisma.emargement.create({
        data: {
          user: { connect: { id: participantId } },
          session: { connect: { id: sessionId } },
          isPresent,
          validator: { connect: { id: req.user.userId } }, // Utiliser validator pour la relation
          validationDate: new Date(),
        },
      });
    }

    console.log('Émargement créé/mis à jour avec succès:', emargement);
    res.json(emargement);
  } catch (error) {
    console.error('Erreur lors de la validation de la présence :', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// Route to request adding a participant to a formation
router.post('/formations/:formationId/request-participant', authenticateJWT, async (req, res) => {
  try {
    const { formationId } = req.params;
    const { email, phone } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }

    console.log(`Demande d'ajout de participant par l'utilisateur: ${req.user.userId}, rôle: ${req.user.role}`);

    // Vérifier si l'utilisateur est formateur
    if (req.user.role !== 'formateur') {
      return res.status(403).json({ message: 'Accès refusé. Seuls les formateurs peuvent ajouter des participants.' });
    }

    const formation = await prisma.formation.findUnique({
      where: { id: parseInt(formationId) },
      include: { formateur: true }
    });

    if (!formation) {
      return res.status(404).json({ message: 'Formation non trouvée' });
    }

    // Créer la demande de participant avec seulement les champs existants dans le modèle
    const participantRequest = await prisma.participantRequest.create({
      data: {
        email,
        phone: phone || null,
        status: 'PENDING',
        formation: { connect: { id: parseInt(formationId) } },
        requestedBy: { connect: { id: req.user.userId } },
      },
    });

    // Vérifier et corriger le rôle admin avant de chercher les admins
    const adminEmail = 'fadoua.abdelhak@polytechnicien.tn';
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (adminUser && adminUser.role !== 'admin') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'admin', isVerified: true }
      });
      console.log(`Rôle mis à jour pour ${adminEmail}: nouveau rôle = admin`);
    } else if (!adminUser) {
      // Créer l'utilisateur admin s'il n'existe pas
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Admin',
          password: hashedPassword,
          role: 'admin',
          isVerified: true,
        },
      });
      console.log(`Utilisateur admin ${adminEmail} créé avec succès`);
    }

    // Trouver tous les administrateurs
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
    });

    console.log(`Nombre d'administrateurs trouvés: ${admins.length}`);
    admins.forEach(admin => {
      console.log(`Admin trouvé: ID=${admin.id}, Email=${admin.email}, Rôle=${admin.role}`);
    });

    // Créer une notification pour chaque admin
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          message: `Nouvelle demande d'ajout de participant (${email}) pour la formation "${formation.title}" par ${req.user.name}.`,
          recipientId: admin.id,
          requestId: participantRequest.id,
          read: false
        },
      });
      console.log(`Notification créée pour l'admin ${admin.id} (${admin.email})`);
    }

    res.status(201).json({ message: 'Demande créée avec succès.', participantRequest });
  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// Route to approve or reject a participant request (admin only)
router.post('/participant-requests/:requestId/respond', verifyAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, rejectionReason } = req.body;
    const userId = req.user.userId;

    const request = await prisma.participantRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: { formation: true, requestedBy: true },
    });

    if (!request) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    const updatedRequest = await prisma.participantRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        updatedAt: new Date(),
      },
      include: { formation: true, requestedBy: true },
    });

    await prisma.history.create({
      data: {
        action: status === 'APPROVED' ? 'APPROVE_REQUEST' : 'REJECT_REQUEST',
        actor: { connect: { id: userId } },
        actorType: req.user.role.toUpperCase(),
        request: { connect: { id: parseInt(requestId) } },
        details: {
          formationTitle: request.formation.title,
          requestId: parseInt(requestId),
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        },
      },
    });

    const emailContent = {
      approved: {
        subject: `Inscription à ${updatedRequest.formation.title} approuvée`,
        text: `Votre demande pour la formation "${updatedRequest.formation.title}" a été approuvée. Veuillez créer un compte sur notre plateforme pour accéder à la formation : http://localhost:3000/signup`,
        html: `<h1>Inscription confirmée !</h1>
               <p>Votre participation à la formation <strong>${updatedRequest.formation.title}</strong> est validée.</p>
               <p>Veuillez <a href="http://localhost:3000/signup">créer un compte</a> sur notre plateforme pour accéder à la formation.</p>`,
      },
      rejected: {
        subject: `Inscription à ${updatedRequest.formation.title} refusée`,
        text: `Votre demande pour la formation "${updatedRequest.formation.title}" a été refusée. Motif : ${rejectionReason || 'Non spécifié'}`,
        html: `<h1>Demande refusée</h1>
               <p>Votre inscription à la formation <strong>${updatedRequest.formation.title}</strong> a été refusée.</p>
               <p>Motif : ${rejectionReason || 'Non spécifié'}</p>`,
      },
    };

    await sendEmail(
      request.email,
      emailContent[status.toLowerCase()].subject,
      emailContent[status.toLowerCase()].text,
      emailContent[status.toLowerCase()].html
    );

    await prisma.notification.create({
      data: {
        message: `Demande ${status} pour "${updatedRequest.formation.title}"`,
        recipientId: updatedRequest.requestedById,
        requestId: updatedRequest.id,
      },
    });

    res.json(updatedRequest);
  } catch (error) {
    console.error('Erreur traitement demande:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// Route to get user notifications
router.get('/notifications', authenticateJWT, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user.userId },
      include: {
        request: {
          include: {
            formation: { select: { title: true } },
            requestedBy: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      notifications.map((n) => ({
        ...n,
        message: n.message.replace('undefined', n.request?.requestedBy?.name || 'Inconnu'),
      }))
    );
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// Route to mark a notification as read
router.post('/notifications/:id/read', authenticateJWT, async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { read: true },
    });

    if (notification.recipientId !== req.user.userId) {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erreur mise à jour notification:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

module.exports = router;













