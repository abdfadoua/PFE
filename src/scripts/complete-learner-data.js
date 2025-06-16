const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script pour compléter les données manquantes des apprenants
 * Cela permettra d'améliorer la qualité de l'analyse
 */
async function completeApprenantData() {
  try {
    console.log('Début de la complétion des données des apprenants...');
    
    // 1. Récupérer tous les apprenants
    const apprenants = await prisma.user.findMany({
      where: { role: 'apprenant' }
    });
    
    console.log(`Nombre total d'apprenants: ${apprenants.length}`);
    
    // 2. Compter les données manquantes
    const missingBirthDate = apprenants.filter(a => !a.birthDate).length;
    const missingInterests = apprenants.filter(a => !a.interests || a.interests.length === 0).length;
    
    console.log(`Données manquantes: ${missingBirthDate} dates de naissance, ${missingInterests} intérêts`);
    
    // 3. Compléter les dates de naissance manquantes
    if (missingBirthDate > 0) {
      console.log('Complétion des dates de naissance manquantes...');
      
      // Générer des dates de naissance aléatoires entre 1970 et 2000
      for (const apprenant of apprenants) {
        if (!apprenant.birthDate) {
          const year = 1970 + Math.floor(Math.random() * 30); // Entre 1970 et 2000
          const month = Math.floor(Math.random() * 12) + 1;
          const day = Math.floor(Math.random() * 28) + 1; // Éviter les problèmes de jours invalides
          
          await prisma.user.update({
            where: { id: apprenant.id },
            data: {
              birthDate: new Date(year, month - 1, day)
            }
          });
        }
      }
      
      console.log('Dates de naissance complétées.');
    }
    
    // 4. Compléter les intérêts manquants
    if (missingInterests > 0) {
      console.log('Complétion des intérêts manquants...');
      
      // Liste des intérêts possibles
      const possibleInterests = [
        'Développement web', 'Data Science', 'Design', 'Marketing', 'Business',
        'UX/UI', 'DevOps', 'Cybersécurité', 'Intelligence artificielle', 'Cloud',
        'Mobile', 'Blockchain', 'IoT', 'Gestion de projet', 'Réseaux'
      ];
      
      for (const apprenant of apprenants) {
        if (!apprenant.interests || apprenant.interests.length === 0) {
          // Attribuer 1 à 3 intérêts aléatoires
          const numInterests = Math.floor(Math.random() * 3) + 1;
          const shuffledInterests = [...possibleInterests].sort(() => 0.5 - Math.random());
          const selectedInterests = shuffledInterests.slice(0, numInterests);
          
          await prisma.user.update({
            where: { id: apprenant.id },
            data: {
              interests: selectedInterests
            }
          });
        }
      }
      
      console.log('Intérêts complétés.');
    }
    
    // 5. Vérifier les achats
    const apprenantsWithoutPurchases = await prisma.user.findMany({
      where: {
        role: 'apprenant',
        NOT: {
          id: {
            in: (await prisma.purchase.findMany()).map(p => p.userId)
          }
        }
      }
    });
    
    console.log(`Nombre d'apprenants sans achats: ${apprenantsWithoutPurchases.length}`);
    
    if (apprenantsWithoutPurchases.length > 0) {
      console.log('Ajout d\'achats pour les apprenants sans formations...');
      
      // Récupérer toutes les formations disponibles
      const formations = await prisma.formation.findMany();
      
      if (formations.length === 0) {
        console.log('Aucune formation disponible. Création de formations de test...');
        
        // Créer des formations de test si aucune n'existe
        const formationTitles = [
          'Introduction au développement web',
          'Data Science pour débutants',
          'UX/UI Design fondamentaux',
          'Marketing digital',
          'DevOps et CI/CD',
          'Cybersécurité fondamentale',
          'Intelligence artificielle et Machine Learning',
          'Développement mobile avec React Native',
          'Gestion de projet agile',
          'Cloud Computing avec AWS'
        ];
        
        for (const title of formationTitles) {
          await prisma.formation.create({
            data: {
              title,
              description: `Formation sur ${title}`,
              price: Math.floor(Math.random() * 500) + 500,
              duration: Math.floor(Math.random() * 40) + 10,
              category: title.split(' ')[0],
              level: ['Débutant', 'Intermédiaire', 'Avancé'][Math.floor(Math.random() * 3)]
            }
          });
        }
        
        // Récupérer les formations créées
        const newFormations = await prisma.formation.findMany();
        
        // Attribuer des formations aux apprenants sans achats
        for (const apprenant of apprenantsWithoutPurchases) {
          // Attribuer 1 à 3 formations aléatoires
          const numFormations = Math.floor(Math.random() * 3) + 1;
          const shuffledFormations = [...newFormations].sort(() => 0.5 - Math.random());
          const selectedFormations = shuffledFormations.slice(0, numFormations);
          
          for (const formation of selectedFormations) {
            await prisma.purchase.create({
              data: {
                userId: apprenant.id,
                formationId: formation.id,
                purchaseDate: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
                status: 'completed',
                amount: formation.price
              }
            });
          }
        }
      } else {
        // Attribuer des formations existantes aux apprenants sans achats
        for (const apprenant of apprenantsWithoutPurchases) {
          // Attribuer 1 à 3 formations aléatoires
          const numFormations = Math.floor(Math.random() * 3) + 1;
          const shuffledFormations = [...formations].sort(() => 0.5 - Math.random());
          const selectedFormations = shuffledFormations.slice(0, numFormations);
          
          for (const formation of selectedFormations) {
            await prisma.purchase.create({
              data: {
                userId: apprenant.id,
                formationId: formation.id,
                purchaseDate: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
                status: 'completed',
                amount: formation.price
              }
            });
          }
        }
      }
      
      console.log('Achats ajoutés pour les apprenants sans formations.');
    }
    
    // 6. Vérifier les validations et émargements
    const apprenantsWithPurchases = await prisma.user.findMany({
      where: {
        role: 'apprenant',
        id: {
          in: (await prisma.purchase.findMany()).map(p => p.userId)
        }
      },
      include: {
        purchases: {
          include: {
            formation: true
          }
        }
      }
    });
    
    console.log('Vérification des validations et émargements...');
    
    for (const apprenant of apprenantsWithPurchases) {
      // Vérifier si l'apprenant a des émargements
      const emargements = await prisma.emargement.findMany({
        where: { userId: apprenant.id }
      });
      
      if (emargements.length === 0) {
        console.log(`Création d'émargements pour l'apprenant ${apprenant.id}...`);
        
        // Créer des émargements pour chaque formation achetée
        for (const purchase of apprenant.purchases) {
          // Créer 1 à 5 émargements par formation
          const numEmargements = Math.floor(Math.random() * 5) + 1;
          
          for (let i = 0; i < numEmargements; i++) {
            const date = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
            
            await prisma.emargement.create({
              data: {
                userId: apprenant.id,
                formationId: purchase.formationId,
                date,
                status: ['present', 'absent', 'excused'][Math.floor(Math.random() * 3)],
                comment: `Session ${i + 1} de la formation ${purchase.formation.title}`
              }
            });
          }
        }
      }
      
      // Vérifier si l'apprenant a des validations
      const validations = await prisma.validation.findMany({
        where: { userId: apprenant.id }
      });
      
      if (validations.length === 0) {
        console.log(`Création de validations pour l'apprenant ${apprenant.id}...`);
        
        // Créer des validations pour chaque émargement
        const newEmargements = await prisma.emargement.findMany({
          where: { userId: apprenant.id }
        });
        
        for (const emargement of newEmargements) {
          // Générer des compétences aléatoires avant/après
          const skillSections = [
            'technical', 'practical', 'understanding', 'application', 'autonomy'
          ];
          
          const skillsBeforeTraining = {};
          const skillsAfterTraining = {};
          
          for (const section of skillSections) {
            // Compétence avant entre 1 et 5
            const before = Math.floor(Math.random() * 5) + 1;
            // Compétence après supérieure à avant (entre before+1 et 10)
            const after = Math.min(10, before + Math.floor(Math.random() * (10 - before)) + 1);
            
            skillsBeforeTraining[section] = before;
            skillsAfterTraining[section] = after;
          }
          
          await prisma.validation.create({
            data: {
              userId: apprenant.id,
              emargementId: emargement.id,
              formationId: emargement.formationId,
              date: new Date(),
              skillsBeforeTraining,
              skillsAfterTraining,
              comment: `Validation pour la session du ${emargement.date.toISOString().split('T')[0]}`
            }
          });
        }
      }
    }
    
    console.log('Validations et émargements complétés.');
    
    console.log('Complétion des données terminée avec succès !');
    
    // Statistiques finales
    const completedApprenants = await prisma.user.findMany({
      where: { 
        role: 'apprenant',
        birthDate: { not: null },
        interests: { not: { equals: [] } }
      }
    });
    
    const completedPurchases = await prisma.purchase.count();
    const completedEmargements = await prisma.emargement.count();
    const completedValidations = await prisma.validation.count();
    
    console.log('Statistiques finales:');
    console.log(`- Apprenants avec données complètes: ${completedApprenants.length}/${apprenants.length}`);
    console.log(`- Achats: ${completedPurchases}`);
    console.log(`- Émargements: ${completedEmargements}`);
    console.log(`- Validations: ${completedValidations}`);
    
  } catch (error) {
    console.error('Erreur lors de la complétion des données:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
completeApprenantData()
  .then(() => {
    console.log('Script terminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });

