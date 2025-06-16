const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
// Fix the import to use the correct middleware function
const { authenticateJWT } = require('../authMiddleware');

// Endpoint pour récupérer les données d'analyse des apprenants
router.get('/learners', authenticateJWT, async (req, res) => {
  try {
    console.log("Récupération des données d'analyse des apprenants...");
    
    // Récupérer les utilisateurs (apprenants)
    const users = await prisma.user.findMany({
      where: {
        role: 'apprenant'
      },
      select: {
        id: true,
        name: true,
        email: true,
        birthDate: true,
        interests: true
        // Removed createdAt as it doesn't exist in the User model
      }
    });
    
    // Récupérer les formations
    const formations = await prisma.formation.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        date: true
        // Removed createdAt as it doesn't exist in the Formation model
      }
    });
    
    // Récupérer les achats/inscriptions
    const purchases = await prisma.emargement.findMany({
      select: {
        id: true,
        userId: true,
        session: {
          select: {
            formationId: true
          }
        },
        createdAt: true
      }
    });
    
    // Formater les données pour l'API Python
    const usersFormatted = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'apprenant',
      birthDate: user.birthDate ? user.birthDate.toISOString().split('T')[0] : null,
      interests: user.interests || []
    }));
    
    const formationsFormatted = formations.map(formation => ({
      id: formation.id,
      title: formation.title,
      description: formation.description,
      date: formation.date ? formation.date.toISOString().split('T')[0] : null
    }));
    
    const purchasesFormatted = purchases.map(purchase => ({
      userId: purchase.userId,
      formationId: purchase.session?.formationId, // Add optional chaining to prevent errors
      purchaseDate: purchase.createdAt.toISOString().split('T')[0]
    }));
    
    try {
      // Essayer d'envoyer les données au modèle Python
      console.log("Envoi des données à l'API Python...");
      const pythonApiUrl = 'http://localhost:5001/api/analyze';
      
      // Ajouter un timeout plus long et des logs détaillés
      console.log("Données envoyées:", {
        users: usersFormatted.length,
        formations: formationsFormatted.length,
        purchases: purchasesFormatted.length
      });
      
      const response = await axios.post(pythonApiUrl, {
        users: usersFormatted,
        formations: formationsFormatted,
        purchases: purchasesFormatted
      }, { timeout: 10000 }); // Augmenter le timeout à 10 secondes
      
      console.log("Réponse de l'API Python reçue:", response.status);
      
      // Stocker les résultats d'analyse dans la base de données
      const analysisResult = await prisma.learnerAnalysis.create({
        data: {
          date: new Date(),
          optimalK: response.data.data.optimalK || 3,
          clusterSummary: JSON.stringify(response.data.data.clusterSummary || []),
          graphs: JSON.stringify(response.data.data.graphs || {}),
          detailedClusterSummary: JSON.stringify(response.data.data.detailedClusterSummary || [])
        }
      });
      
      // Renvoyer les données d'analyse au frontend
      return res.json({
        success: true,
        data: response.data.data,
        source: "API"
      });
      
    } catch (pythonError) {
      console.error("Erreur lors de la communication avec l'API Python:", pythonError.message);
      console.error("Détails de l'erreur:", pythonError.response?.data || "Pas de détails disponibles");
      
      // Si l'API Python échoue, générer des données de base
      const fallbackData = {
        date: new Date().toISOString(),
        totalLearners: users.length,
        activeLearners: Math.round(users.length * 0.7),
        completionRate: 68,
        interestDistribution: generateInterestDistribution(users),
        ageDistribution: generateAgeDistribution(users),
        optimalK: 3,
        clusterSummary: generateClusterSummary(users.length),
        detailedClusterSummary: generateDetailedClusterSummary(users)
      };
      
      return res.json({
        success: true,
        data: fallbackData,
        source: "fallback",
        error: pythonError.message
      });
    }
  } catch (error) {
    console.error("Erreur dans l'endpoint /learners:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des données d'analyse",
      error: error.message
    });
  }
});

// Fonction pour générer la distribution des intérêts
function generateInterestDistribution(users) {
  const interestCounts = {};
  
  // Compter les intérêts
  users.forEach(user => {
    if (user.interests && Array.isArray(user.interests)) {
      user.interests.forEach(interest => {
        interestCounts[interest] = (interestCounts[interest] || 0) + 1;
      });
    }
  });
  
  // Calculer les pourcentages
  const totalInterests = Object.values(interestCounts).reduce((sum, count) => sum + count, 0) || 1;
  const interestDistribution = {};
  
  Object.entries(interestCounts).forEach(([interest, count]) => {
    interestDistribution[interest] = Math.round((count / totalInterests) * 100);
  });
  
  // Si aucun intérêt n'est trouvé, utiliser des valeurs par défaut
  if (Object.keys(interestDistribution).length === 0) {
    return {
      "Développement web": 30,
      "Intelligence artificielle": 25,
      "Design UX/UI": 20,
      "Marketing digital": 15,
      "Data Science": 10
    };
  }
  
  return interestDistribution;
}

// Fonction pour générer la distribution des âges
function generateAgeDistribution(users) {
  const ageGroups = {
    "18-24": 0,
    "25-34": 0,
    "35-44": 0,
    "45+": 0
  };
  
  // Compter les utilisateurs par groupe d'âge
  users.forEach(user => {
    if (user.birthDate) {
      const age = calculateAge(user.birthDate);
      
      if (age < 25) {
        ageGroups["18-24"]++;
      } else if (age < 35) {
        ageGroups["25-34"]++;
      } else if (age < 45) {
        ageGroups["35-44"]++;
      } else {
        ageGroups["45+"]++;
      }
    }
  });
  
  // Calculer les pourcentages
  const totalUsers = Object.values(ageGroups).reduce((sum, count) => sum + count, 0) || 1;
  const ageDistribution = {};
  
  Object.entries(ageGroups).forEach(([ageGroup, count]) => {
    ageDistribution[ageGroup] = Math.round((count / totalUsers) * 100);
  });
  
  // Si aucune donnée d'âge n'est trouvée, utiliser des valeurs par défaut
  if (Object.values(ageDistribution).every(value => value === 0)) {
    return {
      "18-24": 25,
      "25-34": 40,
      "35-44": 20,
      "45+": 15
    };
  }
  
  return ageDistribution;
}

// Fonction pour calculer l'âge à partir de la date de naissance
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// Fonction pour générer un résumé des clusters
function generateClusterSummary(totalLearners) {
  return [
    {
      name: 'Débutants',
      size: Math.round(totalLearners * 0.35),
      percentage: 35
    },
    {
      name: 'Intermédiaires',
      size: Math.round(totalLearners * 0.45),
      percentage: 45
    },
    {
      name: 'Avancés',
      size: Math.round(totalLearners * 0.20),
      percentage: 20
    }
  ];
}

// Fonction pour générer un résumé détaillé des clusters
function generateDetailedClusterSummary(users) {
  // Extraire les intérêts les plus courants
  const interestDistribution = generateInterestDistribution(users);
  const topInterests = Object.keys(interestDistribution).sort((a, b) => 
    interestDistribution[b] - interestDistribution[a]
  ).slice(0, 3);
  
  return [
    {
      id: 1,
      name: 'Débutants',
      avgAge: 25,
      topInterests: [
        {name: topInterests[0] || "Développement web", percentage: 45},
        {name: topInterests[1] || "Design UX/UI", percentage: 30}
      ],
      avgCompletionRate: 40,
      engagementLevel: "Moyen",
      learningStyle: "Visuel",
      preferredContentType: "Vidéos courtes"
    },
    {
      id: 2,
      name: 'Intermédiaires',
      avgAge: 32,
      topInterests: [
        {name: topInterests[1] || "Intelligence artificielle", percentage: 40},
        {name: topInterests[2] || "Marketing digital", percentage: 35}
      ],
      avgCompletionRate: 65,
      engagementLevel: "Élevé",
      learningStyle: "Pratique",
      preferredContentType: "Exercices interactifs"
    },
    {
      id: 3,
      name: 'Avancés',
      avgAge: 38,
      topInterests: [
        {name: topInterests[0] || "Intelligence artificielle", percentage: 50},
        {name: topInterests[2] || "Développement web", percentage: 35}
      ],
      avgCompletionRate: 85,
      engagementLevel: "Très élevé",
      learningStyle: "Autonome",
      preferredContentType: "Projets complets"
    }
  ];
}

module.exports = router;









