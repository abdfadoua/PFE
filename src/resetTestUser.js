const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetTestUserData() {
  try {
    console.log('Début du diagnostic et de la réinitialisation des données de test...');

    // 1. Trouver les utilisateurs de test
    const testApprenant = await prisma.user.findUnique({
      where: { email: 'testapprenant25@gmail.com' },
      select: { id: true, name: true }
    });

    if (!testApprenant) {
      console.error('Utilisateur testapprenant25@gmail.com non trouvé');
      return;
    }
    console.log(`Utilisateur Test Apprenant trouvé: ${testApprenant.name} (ID: ${testApprenant.id})`);

    const testFormateur = await prisma.user.findUnique({
      where: { email: 'formateurtest7@gmail.com' },
      select: { id: true, name: true }
    });

    if (!testFormateur) {
      console.error('Utilisateur formateurtest7@gmail.com non trouvé');
      return;
    }
    console.log(`Utilisateur Test Formateur trouvé: ${testFormateur.name} (ID: ${testFormateur.id})`);

    // 2. Vérifier toutes les formations auxquelles l'apprenant est inscrit
    const purchases = await prisma.purchase.findMany({
      where: { userId: testApprenant.id },
      include: { 
        formation: {
          include: {
            formateur: true,
            sessions: true
          }
        }
      }
    });

    console.log(`L'apprenant test est inscrit à ${purchases.length} formations.`);
    
    if (purchases.length === 0) {
      console.log("L'apprenant n'est inscrit à aucune formation. Création d'une inscription...");
      
      // Trouver les formations du formateur test
      const formations = await prisma.formation.findMany({
        where: { formateurId: testFormateur.id },
        include: { sessions: true }
      });
      
      if (formations.length === 0) {
        console.log("Aucune formation trouvée pour le formateur test. Création d'une nouvelle formation...");
        
        // Créer une nouvelle formation avec des sessions
        const newFormation = await prisma.formation.create({
          data: {
            title: 'Formation Test pour Signature et Validation',
            description: 'Formation créée pour tester les fonctionnalités de signature et validation',
            date: new Date(),
            formateurId: testFormateur.id,
            sections: {
              create: [
                { title: 'Introduction' },
                { title: 'Partie principale' },
                { title: 'Conclusion' }
              ]
            },
            sessions: {
              create: [
                {
                  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // hier
                  endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000) // 3h plus tard
                },
                {
                  startTime: new Date(Date.now()), // aujourd'hui
                  endTime: new Date(Date.now() + 3 * 60 * 60 * 1000) // 3h plus tard
                },
                {
                  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // demain
                  endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000) // 3h plus tard
                }
              ]
            }
          },
          include: {
            sessions: true
          }
        });
        
        console.log(`Nouvelle formation créée: ${newFormation.title} (ID: ${newFormation.id})`);
        console.log(`${newFormation.sessions.length} sessions créées pour cette formation`);
        
        // Inscrire l'apprenant à cette nouvelle formation
        const newPurchase = await prisma.purchase.create({
          data: {
            userId: testApprenant.id,
            formationId: newFormation.id,
            purchaseDate: new Date()
          }
        });
        console.log(`L'apprenant test a été inscrit à la nouvelle formation`);
        
        // Ajouter cette formation à la liste des formations
        formations.push(newFormation);
      } else {
        console.log(`${formations.length} formations trouvées pour le formateur test`);
        
        // Inscrire l'apprenant à la première formation du formateur
        const newPurchase = await prisma.purchase.create({
          data: {
            userId: testApprenant.id,
            formationId: formations[0].id,
            purchaseDate: new Date()
          }
        });
        console.log(`L'apprenant test a été inscrit à la formation "${formations[0].title}" (ID: ${formations[0].id})`);
      }
      
      // Mettre à jour la liste des achats
      const updatedPurchases = await prisma.purchase.findMany({
        where: { userId: testApprenant.id },
        include: { 
          formation: {
            include: {
              formateur: true,
              sessions: true
            }
          }
        }
      });
      
      console.log(`Après mise à jour, l'apprenant test est inscrit à ${updatedPurchases.length} formations.`);
      
      // Utiliser la liste mise à jour pour la suite
      purchases.push(...updatedPurchases);
    }
    
    // 3. Pour chaque formation, vérifier et créer les émargements si nécessaire
    for (const purchase of purchases) {
      const formation = purchase.formation;
      console.log(`\nFormation: ${formation.title} (ID: ${formation.id})`);
      console.log(`Formateur: ${formation.formateur.name} (ID: ${formation.formateur.id})`);
      console.log(`Nombre de sessions: ${formation.sessions.length}`);
      
      if (formation.sessions.length === 0) {
        console.log("Cette formation n'a pas de sessions. Création de sessions...");
        
        // Créer des sessions pour cette formation
        const sessions = await prisma.session.createMany({
          data: [
            {
              formationId: formation.id,
              startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // hier
              endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000) // 3h plus tard
            },
            {
              formationId: formation.id,
              startTime: new Date(Date.now()), // aujourd'hui
              endTime: new Date(Date.now() + 3 * 60 * 60 * 1000) // 3h plus tard
            },
            {
              formationId: formation.id,
              startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // demain
              endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000) // 3h plus tard
            }
          ]
        });
        
        console.log(`${sessions.count} sessions créées pour cette formation`);
        
        // Récupérer les sessions créées
        formation.sessions = await prisma.session.findMany({
          where: { formationId: formation.id }
        });
        
        console.log(`Après mise à jour, la formation a ${formation.sessions.length} sessions`);
      }
      
      // 4. Vérifier les émargements existants pour cette formation
      const existingEmargements = await prisma.emargement.findMany({
        where: {
          userId: testApprenant.id,
          session: {
            formationId: formation.id
          }
        },
        include: {
          session: true,
          skillValidations: true,
          feedbacks: true
        }
      });
      
      console.log(`${existingEmargements.length} émargements existants pour cette formation`);
      
      // 5. Supprimer tous les émargements, feedbacks et validations existants
      if (existingEmargements.length > 0) {
        const emargementIds = existingEmargements.map(e => e.id);
        
        // Supprimer d'abord les feedbacks liés aux émargements
        const deletedFeedbacks = await prisma.feedback.deleteMany({
          where: {
            emargementId: { in: emargementIds }
          }
        });
        console.log(`${deletedFeedbacks.count} feedbacks supprimés`);
        
        // Supprimer les validations de compétences
        const deletedSkillValidations = await prisma.skillValidation.deleteMany({
          where: {
            emargementId: { in: emargementIds }
          }
        });
        console.log(`${deletedSkillValidations.count} validations de compétences supprimées`);
        
        // Supprimer les émargements
        const deletedEmargements = await prisma.emargement.deleteMany({
          where: {
            id: { in: emargementIds }
          }
        });
        console.log(`${deletedEmargements.count} émargements supprimés`);
      }
      
      // 6. Créer de nouveaux émargements pour chaque session
      console.log("Création de nouveaux émargements pour chaque session...");
      
      for (const session of formation.sessions) {
        // Vérifier si un émargement existe déjà pour cette session
        const existingEmargement = await prisma.emargement.findUnique({
          where: {
            userId_sessionId: {
              userId: testApprenant.id,
              sessionId: session.id
            }
          }
        });
        
        if (!existingEmargement) {
          // Créer un nouvel émargement
          const newEmargement = await prisma.emargement.create({
            data: {
              userId: testApprenant.id,
              sessionId: session.id,
              isPresent: null,
              signature: null,
              emargementDate: null,
              validatedBy: null,
              validationDate: null
            }
          });
          
          console.log(`Nouvel émargement créé pour la session ${session.id}`);
        } else {
          console.log(`Un émargement existe déjà pour la session ${session.id}`);
        }
      }
    }

    console.log('\nRéinitialisation terminée avec succès!');
    console.log('\nVous pouvez maintenant tester:');
    console.log('1. La signature des émargements avec testapprenant25@gmail.com');
    console.log('2. La validation des émargements avec formateurtest7@gmail.com');
    console.log('\nIdentifiants de connexion:');
    console.log('- Apprenant: testapprenant25@gmail.com / password123');
    console.log('- Formateur: formateurtest7@gmail.com / password123');

  } catch (error) {
    console.error('Erreur lors de la réinitialisation des données de test:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
resetTestUserData();


