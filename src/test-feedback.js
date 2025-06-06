const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFeedbackCreation() {
  try {
    console.log("=== TEST DE CRÉATION DE FEEDBACK ===");
    
    // 1. Trouver un émargement existant
    const emargement = await prisma.emargement.findFirst({
      include: { user: true, session: true }
    });
    
    if (!emargement) {
      console.log("Aucun émargement trouvé dans la base de données.");
      return;
    }
    
    console.log("Émargement trouvé:", {
      id: emargement.id,
      userId: emargement.userId,
      sessionId: emargement.sessionId
    });
    
    // 2. Vérifier si un feedback existe déjà pour cet émargement
    const existingFeedback = await prisma.feedback.findFirst({
      where: { emargementId: emargement.id }
    });
    
    if (existingFeedback) {
      console.log("Un feedback existe déjà pour cet émargement:", existingFeedback);
      
      // 3. Mettre à jour le feedback existant
      const updatedFeedback = await prisma.feedback.update({
        where: { id: existingFeedback.id },
        data: {
          clarity: 8,
          objectives: 8,
          level: 8,
          trainer: 8,
          materials: 8,
          materialOrganization: 8,
          welcomeQuality: 8,
          premisesComfort: 8,
          globalRating: 8,
          comments: "Test de mise à jour via script direct",
          updatedAt: new Date()
        }
      });
      
      console.log("Feedback mis à jour:", updatedFeedback);
    } else {
      // 4. Créer un nouveau feedback
      const newFeedback = await prisma.feedback.create({
        data: {
          userId: emargement.userId,
          emargementId: emargement.id,
          clarity: 8,
          objectives: 8,
          level: 8,
          trainer: 8,
          materials: 8,
          materialOrganization: 8,
          welcomeQuality: 8,
          premisesComfort: 8,
          globalRating: 8,
          comments: "Test de création via script direct"
        }
      });
      
      console.log("Nouveau feedback créé:", newFeedback);
    }
    
    // 5. Vérifier tous les feedbacks
    const allFeedbacks = await prisma.feedback.findMany();
    console.log("Nombre total de feedbacks:", allFeedbacks.length);
    console.log("Liste des feedbacks:", allFeedbacks);
    
  } catch (error) {
    console.error("Erreur lors du test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFeedbackCreation();