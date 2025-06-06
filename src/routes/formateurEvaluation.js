const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../authMiddleware");

const prisma = new PrismaClient();

// Fetch all formations and their evaluations for the authenticated formateur
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const formations = await prisma.formation.findMany({
      where: { formateurId: userId },
      include: {
        sessions: true,
        formateurFeedback: {
          where: { userId: userId },
          take: 1,
        },
      },
    });

    const formattedFormations = formations.map((formation) => ({
      id: formation.id,
      title: formation.title,
      sessions: formation.sessions || [],
      evaluation: formation.formateurFeedback[0] || null,
      date: formation.sessions.length > 0 ? formation.sessions[0].startTime : formation.createdAt,
      hasEvaluation: !!formation.formateurFeedback[0],
      evaluationStatus: formation.formateurFeedback[0] ? 'completed' : 'pending',
      lastModified: formation.formateurFeedback[0] ? formation.formateurFeedback[0].updatedAt : null,
    }));

    res.json(formattedFormations);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

// Fetch a specific evaluation for a formation
router.get("/evaluations/:formationId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { formationId } = req.params;

    const feedback = await prisma.formateurFeedback.findFirst({
      where: {
        userId: userId,
        formationId: parseInt(formationId),
      },
      include: {
        formation: {
          include: {
            sessions: true,
          },
        },
      },
    });

    if (feedback) {
      // Add evaluation metadata for better tracking
      const enrichedFeedback = {
        ...feedback,
        isModified: feedback.updatedAt > feedback.createdAt,
        evaluationHistory: {
          created: feedback.createdAt,
          lastModified: feedback.updatedAt,
          modificationCount: feedback.updatedAt > feedback.createdAt ? 1 : 0
        }
      };
      res.json(enrichedFeedback);
    } else {
      res.json({});
    }
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

// Submit or update formateur feedback
router.post("/evaluations/submit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      formationId,
      ratings,
      adapted,
      adaptationDetails,
      organizationRemarks,
      trainingImprovement,
      environmentImprovement,
      technicalImprovement,
    } = req.body;

    // Validation
    if (!formationId) {
      return res.status(400).json({ error: "ID de formation requis" });
    }

    if (!ratings) {
      return res.status(400).json({ error: "Évaluations requises" });
    }

    const formation = await prisma.formation.findUnique({
      where: { id: parseInt(formationId) },
      include: { sessions: true },
    });

    if (!formation) {
      return res.status(404).json({ error: "Formation non trouvée." });
    }

    if (formation.formateurId !== userId) {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à évaluer cette formation." });
    }

    const {
      homogeneity,
      informationLevel,
      groupLevel,
      participantCount,
      participation,
      assimilation,
      environment,
      welcome,
      technicalPlatforms,
    } = ratings;

    // Validate ratings
    const ratingFields = [
      homogeneity,
      informationLevel,
      groupLevel,
      participantCount,
      participation,
      assimilation,
      environment,
      welcome,
      technicalPlatforms,
    ];

    if (ratingFields.some((rating) => rating == null || rating < 2 || rating > 10)) {
      return res.status(400).json({ error: "Toutes les évaluations doivent être entre 2 et 10." });
    }

    if (adapted == null) {
      return res.status(400).json({ error: "Veuillez indiquer si la session a été adaptée." });
    }

    if (adapted && !adaptationDetails?.trim()) {
      return res.status(400).json({ error: "Veuillez préciser comment la session a été adaptée." });
    }

    // Check for existing feedback
    const existingFeedback = await prisma.formateurFeedback.findFirst({
      where: {
        formationId: parseInt(formationId),
        userId: userId,
      },
    });

    let feedback;
    let actionType;

    if (existingFeedback) {
      // Update existing feedback
      feedback = await prisma.formateurFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          homogeneity,
          informationLevel,
          groupLevel,
          participantCount,
          participation,
          assimilation,
          environment,
          welcome,
          technicalPlatforms,
          adapted,
          adaptationDetails: adapted ? adaptationDetails : "",
          organizationRemarks,
          trainingImprovement,
          environmentImprovement,
          technicalImprovement,
          updatedAt: new Date(),
        },
        include: {
          formation: {
            include: { sessions: true },
          },
        },
      });
      actionType = "updated";
    } else {
      // Create new feedback
      feedback = await prisma.formateurFeedback.create({
        data: {
          userId,
          formationId: parseInt(formationId),
          homogeneity,
          informationLevel,
          groupLevel,
          participantCount,
          participation,
          assimilation,
          environment,
          welcome,
          technicalPlatforms,
          adapted,
          adaptationDetails: adapted ? adaptationDetails : "",
          organizationRemarks,
          trainingImprovement,
          environmentImprovement,
          technicalImprovement,
        },
        include: {
          formation: {
            include: { sessions: true },
          },
        },
      });
      actionType = "created";
    }

    // Add metadata to response
    const responseData = {
      ...feedback,
      actionType,
      isModified: actionType === "updated",
      evaluationHistory: {
        created: feedback.createdAt,
        lastModified: feedback.updatedAt,
        hasBeenModified: actionType === "updated"
      }
    };

    res.status(actionType === "updated" ? 200 : 201).json(responseData);
  } catch (error) {
    console.error("Erreur lors de la soumission:", error);
    res.status(500).json({ 
      error: "Erreur serveur", 
      details: error.message,
      action: existingFeedback ? "update" : "create" 
    });
  }
});

module.exports = router;