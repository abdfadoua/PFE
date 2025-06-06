const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../authMiddleware");

const prisma = new PrismaClient();

router.get("/user", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const feedbacks = await prisma.feedback.findMany({
      where: { userId: userId },
      include: {
        emargement: {
          include: { 
            session: { 
              include: { formation: true } 
            } 
          },
        },
      },
    });

    res.json(feedbacks || []);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { emargementId, ratings, globalRating, comments, deepenSameField, deepenOtherField } = req.body;

    // Validation des données
    if (!emargementId) {
      return res.status(400).json({ error: "ID d'émargement requis" });
    }

    if (!ratings) {
      return res.status(400).json({ error: "Évaluations requises" });
    }

    // Vérifier si l'émargement existe et appartient à l'utilisateur
    const emargement = await prisma.emargement.findUnique({
      where: { id: parseInt(emargementId) },
      include: { session: true },
    });

    if (!emargement) {
      return res.status(404).json({ error: "Émargement non trouvé." });
    }

    if (emargement.userId !== userId) {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à évaluer cet émargement." });
    }

    // Vérifier si la période de modification est encore valide (30 jours après la fin de la session)
    const sessionEndDate = new Date(emargement.session.endTime);
    const thirtyDaysLater = new Date(sessionEndDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Commenté pour permettre les tests sans restriction de 30 jours
    // if (now > thirtyDaysLater) {
    //   return res.status(403).json({ error: "La période de modification du feedback (30 jours) est expirée." });
    // }

    // Vérifier si un feedback existe déjà
    const existingFeedback = await prisma.feedback.findFirst({
      where: {
        emargementId: parseInt(emargementId),
        userId: userId,
      },
    });

    // Extraire les évaluations individuelles
    const { 
      clarity, 
      objectives, 
      level, 
      trainer, 
      materials,
      materialOrganization = 5,
      welcomeQuality = 5,
      premisesComfort = 5
    } = ratings;

    // Vérifier que toutes les évaluations principales sont fournies et valides
    if (
      clarity == null || objectives == null || 
      level == null || trainer == null || materials == null ||
      clarity < 2 || clarity > 10 || 
      objectives < 2 || objectives > 10 ||
      level < 2 || level > 10 ||
      trainer < 2 || trainer > 10 ||
      materials < 2 || materials > 10
    ) {
      return res.status(400).json({ error: "Toutes les évaluations doivent être entre 2 et 10." });
    }

    // Validation de globalRating (optionnel, entre 0 et 10)
    if (globalRating !== undefined && (globalRating < 0 || globalRating > 10)) {
      return res.status(400).json({ error: "L'évaluation globale doit être entre 0 et 10." });
    }

    let feedback;
    if (existingFeedback) {
      // Mettre à jour le feedback existant
      feedback = await prisma.feedback.update({
        where: { id: existingFeedback.id },
        data: {
          clarity,
          objectives,
          level,
          trainer,
          materials,
          materialOrganization,
          welcomeQuality,
          premisesComfort,
          globalRating: globalRating || null,
          comments,
          deepenSameField,
          deepenOtherField,
          updatedAt: new Date(),
        },
        include: {
          emargement: {
            include: { 
              session: { 
                include: { formation: true } 
              } 
            },
          },
        },
      });
    } else {
      // Créer un nouveau feedback
      feedback = await prisma.feedback.create({
        data: {
          userId,
          emargementId: parseInt(emargementId),
          clarity,
          objectives,
          level,
          trainer,
          materials,
          materialOrganization,
          welcomeQuality,
          premisesComfort,
          globalRating: globalRating || null,
          comments,
          deepenSameField,
          deepenOtherField,
        },
        include: {
          emargement: {
            include: { 
              session: { 
                include: { formation: true } 
              } 
            },
          },
        },
      });
    }

    res.status(existingFeedback ? 200 : 201).json(feedback);
  } catch (error) {
    res.status(500).json({ 
      error: "Erreur serveur", 
      details: error.message,
      stack: error.stack 
    });
  }
});

router.post("/submit-test", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { emargementId, ratings, globalRating, comments } = req.body;

    // Validation des données
    if (!emargementId) {
      return res.status(400).json({ error: "ID d'émargement requis" });
    }

    if (!ratings) {
      return res.status(400).json({ error: "Évaluations requises" });
    }

    // Vérifier si l'émargement existe et appartient à l'utilisateur
    const emargement = await prisma.emargement.findUnique({
      where: { id: parseInt(emargementId) },
      include: { session: true },
    });

    if (!emargement) {
      return res.status(404).json({ error: "Émargement non trouvé." });
    }

    if (emargement.userId !== userId) {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à évaluer cet émargement." });
    }

    // Extraire les évaluations individuelles
    const { clarity, objectives, level, trainer, materials } = ratings;

    // Vérifier que toutes les évaluations sont fournies et valides
    if (
      clarity == null || objectives == null || 
      level == null || trainer == null || materials == null ||
      clarity < 2 || clarity > 10 || 
      objectives < 2 || objectives > 10 ||
      level < 2 || level > 10 ||
      trainer < 2 || trainer > 10 ||
      materials < 2 || materials > 10
    ) {
      return res.status(400).json({ error: "Toutes les évaluations doivent être entre 2 et 10." });
    }

    // Validation de globalRating (optionnel, entre 0 et 10)
    if (globalRating !== undefined && (globalRating < 0 || globalRating > 10)) {
      return res.status(400).json({ error: "L'évaluation globale doit être entre 0 et 10." });
    }

    // Utiliser directement une requête SQL pour contourner les contraintes du modèle Prisma
    const result = await prisma.$executeRaw`
      INSERT INTO feedbacks (
        "userId", "emargementId", clarity, objectives, level, trainer, materials, 
        "materialOrganization", "welcomeQuality", "premisesComfort",
        "globalRating", comments, "createdAt", "updatedAt"
      ) 
      VALUES (
        ${userId}, ${parseInt(emargementId)}, ${clarity}, ${objectives}, ${level}, ${trainer}, ${materials},
        5, 5, 5,
        ${globalRating || null}, ${comments || ''}, NOW(), NOW()
      )
      ON CONFLICT ("emargementId") 
      DO UPDATE SET
        clarity = ${clarity},
        objectives = ${objectives},
        level = ${level},
        trainer = ${trainer},
        materials = ${materials},
        "materialOrganization" = 5,
        "welcomeQuality" = 5,
        "premisesComfort" = 5,
        "globalRating" = ${globalRating || null},
        comments = ${comments || ''},
        "updatedAt" = NOW()
      RETURNING *;
    `;
    
    // Récupérer le feedback créé ou mis à jour
    const feedback = await prisma.feedback.findFirst({
      where: {
        emargementId: parseInt(emargementId),
        userId: userId,
      },
      include: {
        emargement: {
          include: { 
            session: { 
              include: { formation: true } 
            } 
          },
        },
      },
    });

    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({ 
      error: "Erreur serveur", 
      details: error.message,
      stack: error.stack 
    });
  }
});

module.exports = router;