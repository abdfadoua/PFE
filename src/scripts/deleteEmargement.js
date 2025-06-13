// Script pour supprimer un émargement pour l'apprenant 25
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteEmargementForApprenant25() {
  try {
    // 1. Trouver l'ID de l'apprenant 25
    const apprenant = await prisma.user.findFirst({
      where: {
        email: 'testapprenant25@gmail.com'
      }
    });

    if (!apprenant) {
      console.log('Apprenant 25 non trouvé');
      return;
    }

    console.log(`Apprenant 25 trouvé avec l'ID: ${apprenant.id}`);

    // 2. Trouver les émargements de l'apprenant
    const emargements = await prisma.emargement.findMany({
      where: {
        userId: apprenant.id
      },
      include: {
        session: {
          include: {
            formation: true
          }
        }
      }
    });

    if (emargements.length === 0) {
      console.log('Aucun émargement trouvé pour cet apprenant');
      return;
    }

    console.log(`${emargements.length} émargements trouvés pour l'apprenant 25`);
    
    // Afficher les émargements pour permettre de choisir
    emargements.forEach((emargement, index) => {
      console.log(`[${index}] Émargement ID: ${emargement.id}, Formation: ${emargement.session.formation.title}, Session: ${emargement.session.startTime}`);
    });

    // 3. Supprimer le premier émargement trouvé (vous pouvez modifier cela pour cibler un émargement spécifique)
    const emargementToDelete = emargements[0];
    
    // Vérifier s'il y a des références à cet émargement
    const feedbacks = await prisma.feedback.findMany({
      where: { emargementId: emargementToDelete.id }
    });
    
    const skillValidations = await prisma.skillValidation.findMany({
      where: { emargementId: emargementToDelete.id }
    });
    
    // Supprimer d'abord les références
    if (feedbacks.length > 0) {
      await prisma.feedback.deleteMany({
        where: { emargementId: emargementToDelete.id }
      });
      console.log(`${feedbacks.length} feedbacks liés à l'émargement ont été supprimés`);
    }
    
    if (skillValidations.length > 0) {
      await prisma.skillValidation.deleteMany({
        where: { emargementId: emargementToDelete.id }
      });
      console.log(`${skillValidations.length} validations de compétences liées à l'émargement ont été supprimées`);
    }
    
    // Supprimer l'émargement
    await prisma.emargement.delete({
      where: { id: emargementToDelete.id }
    });
    
    console.log(`Émargement ID: ${emargementToDelete.id} supprimé avec succès`);
    console.log(`L'apprenant 25 peut maintenant signer pour la session: ${emargementToDelete.session.startTime} de la formation: ${emargementToDelete.session.formation.title}`);
    
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'émargement:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteEmargementForApprenant25();