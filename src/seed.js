
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createObjectCsvWriter } = require('csv-writer');
const prisma = new PrismaClient();

// Tunisian-specific data
const tunisianData = {
  maleNames: [
    'Ahmed', 'Mohamed', 'Ali', 'Mehdi', 'Youssef', 'Karim', 'Sami', 'Fares', 'Rami', 'Nader',
    'Walid', 'Hichem', 'Sofiane', 'Marwan', 'Bilel', 'Wassim', 'Aymen', 'Hatem', 'Makram', 'Zied',
    'Chedly', 'Tarek', 'Slim', 'Moez', 'Adel', 'Jamel', 'Khaled', 'Maher', 'Nabil', 'Omar',
    'Samir', 'Taoufik', 'Wael', 'Yassine', 'Zouheir', 'Farouk', 'Ghazi', 'Imed', 'Kais', 'Lassad',
    'Moncef', 'Noureddine', 'Ridha', 'Salah', 'Amine', 'Bassem', 'Dali', 'Emad', 'Fethi', 'Hedi'
  ],
  femaleNames: [
    'Fatma', 'Amel', 'Salma', 'Ines', 'Mariam', 'Nesrine', 'Sonia', 'Dorra', 'Emna', 'Hajer',
    'Khadija', 'Lamia', 'Manel', 'Nour', 'Olfa', 'Rim', 'Sabrine', 'Takwa', 'Wafa', 'Yosra',
    'Zeineb', 'Amira', 'Bochra', 'Chiraz', 'Dalila', 'Farah', 'Ghada', 'Hiba', 'Ikram', 'Jihene',
    'Karima', 'Latifa', 'Maroua', 'Najoua', 'Rania', 'Samia', 'Thouraya', 'Wided', 'Yasmine', 'Zohra',
    'Ahlem', 'Besma', 'Cyrine', 'Dorsaf', 'Fadia', 'Hana', 'Intissar', 'Kenza', 'Lobna', 'Myriam'
  ],
  lastNames: [
    'Ben Ahmed', 'Trabelsi', 'Bouzid', 'Gharbi', 'Khedher', 'Mestiri', 'Nasri', 'Ouali', 'Rekik', 'Sellami',
    'Ben Ali', 'Chaabane', 'Dridi', 'Ferjani', 'Ghanmi', 'Hadj', 'Jebali', 'Karray', 'Laabidi', 'Mabrouk',
    'Ben Salah', 'Chaieb', 'Derbali', 'Ferchichi', 'Ghorbel', 'Hamdi', 'Jelassi', 'Khlif', 'Louati', 'Mahjoub',
    'Ben Youssef', 'Chebbi', 'Dhouib', 'Fkih', 'Guesmi', 'Hassen', 'Jemli', 'Kchir', 'Maaloul', 'Miled',
    'Benhassan', 'Chedly', 'Essid', 'Fourati', 'Guizani', 'Hleli', 'Jouini', 'Labidi', 'Mansouri', 'Mrad',
    'Bouaziz', 'Chihaoui', 'Ezzine', 'Gabsi', 'Hachicha', 'Hmida', 'Kammoun', 'Landolsi', 'Marzouki', 'Nabli',
    'Bouhamed', 'Dali', 'Fatnassi', 'Gasmi', 'Hajji', 'Horchani', 'Karoui', 'Layouni', 'Meddeb', 'Neffati',
    'Bouslama', 'Daoud', 'Feriani', 'Ghali', 'Hamza', 'Jazi', 'Ktari', 'Limam', 'Mejri', 'Omrani'
  ],
  cities: [
    'Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès', 'Ariana', 'Gafsa', 'Kasserine', 'Monastir',
    'Ben Arous', 'Médenine', 'Nabeul', 'Tataouine', 'Mahdia', 'Sidi Bouzid', 'Jendouba', 'Tozeur',
    'Kébili', 'Siliana', 'Manouba', 'Zaghouan', 'Béja', 'Le Kef'
  ],
  interests: [
    'Informatique', 'Technologie', 'Gestion de projet', 'Marketing digital', 'Finance', 'Ressources humaines',
    'Innovation', 'Entrepreneuriat', 'Intelligence artificielle', 'Cybersécurité', 'Cloud computing',
    'Développement web', 'Analyse de données', 'Management', 'Formation professionnelle', 'Certification',
    'Agile', 'DevOps', 'ITIL', 'Lean management', 'Digital transformation', 'Business intelligence',
    'E-commerce', 'Blockchain', 'IoT', 'Machine learning', 'Leadership', 'Communication', 'Qualité',
    'Audit', 'Conseil', 'Coaching', 'Mentoring', 'Veille technologique', 'Stratégie d\'entreprise'
  ],
  domains: ['gmail.com', 'yahoo.fr', 'hotmail.com', 'outlook.com', 'live.com', 'laposte.net', 'topnet.tn', 'orange.tn']
};

// Fonction pour générer un nom complet tunisien
function generateTunisianName() {
  const isMale = Math.random() > 0.5;
  const firstName = isMale 
    ? tunisianData.maleNames[Math.floor(Math.random() * tunisianData.maleNames.length)]
    : tunisianData.femaleNames[Math.floor(Math.random() * tunisianData.femaleNames.length)];
  const lastName = tunisianData.lastNames[Math.floor(Math.random() * tunisianData.lastNames.length)];
  return `${firstName} ${lastName}`;
}

// Fonction pour générer un email tunisien
function generateTunisianEmail(name) {
  const cleanName = name.toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
  const domain = tunisianData.domains[Math.floor(Math.random() * tunisianData.domains.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  return `${cleanName}${number}@${domain}`;
}

// Fonction pour générer un numéro de téléphone tunisien
function generateTunisianPhone() {
  const prefixes = ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `+216${prefix}${number}`;
}

// Fonction pour générer un âge réaliste
function generateAge(role) {
  return role === 'formateur' 
    ? Math.floor(Math.random() * (65 - 30 + 1)) + 30 // 30-65 ans pour formateurs
    : Math.floor(Math.random() * (40 - 18 + 1)) + 18; // 18-40 ans pour apprenants
}

// Fonction pour générer une date de naissance à partir de l'âge
function generateBirthDate(age) {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1; // Éviter les problèmes avec février
  return new Date(birthYear, birthMonth, birthDay);
}

// Fonction pour générer des centres d'intérêt
function generateInterests() {
  const numInterests = Math.floor(Math.random() * 5) + 2; // Entre 2 et 6 intérêts
  const selectedInterests = [];
  const availableInterests = [...tunisianData.interests];
  
  for (let i = 0; i < numInterests; i++) {
    const index = Math.floor(Math.random() * availableInterests.length);
    selectedInterests.push(availableInterests.splice(index, 1)[0]);
  }
  
  return selectedInterests;
}

async function seed() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);

    // Nettoyer la base de données
    await prisma.skillValidation.deleteMany({});
    await prisma.feedback.deleteMany({});
    await prisma.formateurFeedback.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.history.deleteMany({});
    await prisma.participantRequest.deleteMany({});
    await prisma.emargement.deleteMany({});
    await prisma.purchase.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.section.deleteMany({});
    await prisma.formation.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Base de données nettoyée.');

    // Créer les utilisateurs de test et admin avec upsert
    await prisma.user.upsert({
      where: { email: 'testapprenant25@gmail.com' },
      update: {
        name: 'Test Apprenant',
        password: hashedPassword,
        role: 'apprenant',
        phone: '+21698123456',
        country: 'Tunisie',
        city: 'Tunis',
        birthDate: generateBirthDate(25),
        interests: ['Développement web', 'Cloud computing'],
        isVerified: true,
      },
      create: {
        email: 'testapprenant25@gmail.com',
        name: 'Test Apprenant',
        password: hashedPassword,
        role: 'apprenant',
        phone: '+21698123456',
        country: 'Tunisie',
        city: 'Tunis',
        birthDate: generateBirthDate(25),
        interests: ['Développement web', 'Cloud computing'],
        isVerified: true,
      },
    });
    console.log('Test Apprenant créé ou mis à jour - Email: testapprenant25@gmail.com');

    await prisma.user.upsert({
      where: { email: 'formateurtest7@gmail.com' },
      update: {
        name: 'Test Formateur',
        password: hashedPassword,
        role: 'formateur',
        phone: '+21697123456',
        country: 'Tunisie',
        city: 'Sfax',
        birthDate: generateBirthDate(35),
        interests: ['Gestion de projet', 'DevOps'],
        isVerified: true,
      },
      create: {
        email: 'formateurtest7@gmail.com',
        name: 'Test Formateur',
        password: hashedPassword,
        role: 'formateur',
        phone: '+21697123456',
        country: 'Tunisie',
        city: 'Sfax',
        birthDate: generateBirthDate(35),
        interests: ['Gestion de projet', 'DevOps'],
        isVerified: true,
      },
    });
    console.log('Test Formateur créé ou mis à jour - Email: formateurtest7@gmail.com');

    // Créer des formations spécifiques pour formateurtest7 et testapprenant25
    await createFormationsForTestFormateur();

    await prisma.user.upsert({
      where: { email: 'fadoua.abdelhak@polytechnicien.tn' },
      update: {
        name: 'Fadoua Abdelhak',
        password: hashedAdminPassword,
        role: 'admin',
        phone: '+21696123456',
        country: 'Tunisie',
        city: 'Tunis',
        birthDate: generateBirthDate(40),
        interests: ['IT Governance', 'Formation professionnelle'],
        isVerified: true,
      },
      create: {
        email: 'fadoua.abdelhak@polytechnicien.tn',
        name: 'Fadoua Abdelhak',
        password: hashedAdminPassword,
        role: 'admin',
        phone: '+21696123456',
        country: 'Tunisie',
        city: 'Tunis',
        birthDate: generateBirthDate(40),
        interests: ['IT Governance', 'Formation professionnelle'],
        isVerified: true,
      },
    });
    console.log('Admin créé ou mis à jour - Email: fadoua.abdelhak@polytechnicien.tn');

    // Ajouter l'appel à la fonction pour créer des formations spécifiques pour formateurtest7
    await createFormationsForTestFormateur();
    
    // Créer des formateurs tunisiens (150 formateurs)
    const formateurs = [];
    for (let i = 0; i < 150; i++) {
      const name = generateTunisianName();
      const email = generateTunisianEmail(name);
      const phone = generateTunisianPhone();
      const city = tunisianData.cities[Math.floor(Math.random() * tunisianData.cities.length)];
      const age = generateAge('formateur');
      
      formateurs.push({
        email,
        name,
        password: hashedPassword,
        role: 'formateur',
        phone,
        country: 'Tunisie',
        city,
        birthDate: generateBirthDate(age),
        interests: generateInterests(),
        isVerified: true,
      });
    }
    await prisma.user.createMany({ data: formateurs, skipDuplicates: true });
    console.log('150 formateurs tunisiens créés.');

    // Créer des apprenants tunisiens (1000 apprenants)
    const apprenants = [];
    for (let i = 0; i < 1000; i++) {
      const name = generateTunisianName();
      const email = generateTunisianEmail(name);
      const phone = generateTunisianPhone();
      const city = tunisianData.cities[Math.floor(Math.random() * tunisianData.cities.length)];
      const age = generateAge('apprenant');
      
      apprenants.push({
        email,
        name,
        password: hashedPassword,
        role: 'apprenant',
        phone,
        country: 'Tunisie',
        city,
        birthDate: generateBirthDate(age),
        interests: generateInterests(),
        isVerified: true,
      });
    }
    await prisma.user.createMany({ data: apprenants, skipDuplicates: true });
    console.log('1000 apprenants tunisiens créés.');

    // Définir les formations avec sections réalistes
    const formationsList = [
      {
        title: 'ITIL 4 Foundation - Gestion des Services IT',
        sections: [
          'Introduction à ITIL 4 et la gestion des services',
          'Concepts clés du système de valeur des services',
          'Principes directeurs ITIL',
          'Vue d\'ensemble des pratiques ITIL'
        ]
      },
      {
        title: 'ITIL 4 Specialist: Créer, Livrer et Soutenir (CDS)',
        sections: [
          'Système de valeur des services en pratique',
          'Processus de livraison et de support des services',
          'Cartographie des flux de valeur',
          'Gestion des services professionnels et techniques'
        ]
      },
      {
        title: 'ITIL 4 Specialist: Diriger, Planifier et Améliorer (DPI)',
        sections: [
          'Principes de leadership et de gestion',
          'Méthodes d\'amélioration continue',
          'Mesure et reporting',
          'Gestion organisationnelle du changement'
        ]
      },
      {
        title: 'ITIL 4 Strategist: Direct, Plan and Improve',
        sections: [
          'Direction stratégique et planification',
          'Méthodes d\'amélioration',
          'Gestion des risques et conformité',
          'Mesure de la performance et KPIs'
        ]
      },
      {
        title: 'DevOps Foundation',
        sections: [
          'Principes DevOps',
          'Pratiques d\'intégration et de livraison continues',
          'Culture et organisation DevOps',
          'Automatisation et outils DevOps'
        ]
      },
      {
        title: 'AWS Certified Solutions Architect - Associate',
        sections: [
          'Conception d\'architectures résilientes',
          'Services de calcul et de stockage AWS',
          'Sécurité et conformité',
          'Optimisation des coûts et performances'
        ]
      },
      {
        title: 'Microsoft Azure Administrator',
        sections: [
          'Gestion des identités et de la gouvernance',
          'Implémentation et gestion du stockage',
          'Déploiement et gestion des ressources de calcul',
          'Configuration et gestion des réseaux virtuels'
        ]
      },
      {
        title: 'Google Cloud Professional Cloud Architect',
        sections: [
          'Conception et planification d\'une solution cloud',
          'Gestion et provisionnement de l\'infrastructure',
          'Conception pour la sécurité et la conformité',
          'Analyse et optimisation des opérations techniques'
        ]
      },
      {
        title: 'Scrum Master Certified',
        sections: [
          'Principes et pratiques Agile',
          'Rôle du Scrum Master',
          'Planification et estimation Scrum',
          'Mise en œuvre et coaching Scrum'
        ]
      },
      {
        title: 'Project Management Professional (PMP)',
        sections: [
          'Initiation et planification de projet',
          'Exécution et contrôle de projet',
          'Gestion des parties prenantes',
          'Clôture et évaluation de projet'
        ]
      },
      {
        title: 'Certified Information Systems Security Professional (CISSP)',
        sections: [
          'Sécurité et gestion des risques',
          'Sécurité des actifs',
          'Architecture et ingénierie de sécurité',
          'Tests de sécurité et opérations'
        ]
      },
      {
        title: 'Data Science avec Python',
        sections: [
          'Fondamentaux de Python pour l\'analyse de données',
          'Manipulation de données avec Pandas',
          'Visualisation de données avec Matplotlib et Seaborn',
          'Machine Learning avec Scikit-learn'
        ]
      },
      {
        title: 'Blockchain pour les entreprises',
        sections: [
          'Fondamentaux de la blockchain',
          'Smart contracts et applications décentralisées',
          'Cas d\'usage business',
          'Implémentation et gouvernance'
        ]
      },
      {
        title: 'Intelligence Artificielle pour managers',
        sections: [
          'Comprendre l\'IA et ses applications',
          'Stratégies d\'adoption de l\'IA',
          'Éthique et gouvernance de l\'IA',
          'Gestion de projets d\'IA'
        ]
      },
      {
        title: 'Cybersécurité opérationnelle',
        sections: [
          'Détection et réponse aux incidents',
          'Analyse forensique',
          'Sécurité des réseaux avancée',
          'Threat hunting et intelligence'
        ]
      }
    ];

    // Récupérer tous les formateurs
    const allFormateurs = await prisma.user.findMany({
      where: { role: 'formateur' },
      select: { id: true }
    });
    
    // Récupérer tous les apprenants
    const allApprenants = await prisma.user.findMany({
      where: { role: 'apprenant' },
      select: { id: true }
    });

    // Créer les formations avec leurs sections
    const formations = [];
    for (const formationData of formationsList) {
      // Choisir un formateur aléatoire
      const formateur = allFormateurs[Math.floor(Math.random() * allFormateurs.length)];
      
      // Générer une date dans les 6 derniers mois
      const today = new Date();
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      const randomDate = new Date(sixMonthsAgo.getTime() + Math.random() * (today.getTime() - sixMonthsAgo.getTime()));
      
      // Créer la formation
      const formation = await prisma.formation.create({
        data: {
          title: formationData.title,
          description: `Formation professionnelle sur ${formationData.title}`,
          date: randomDate,
          formateurId: formateur.id,
        }
      });
      
      // Créer les sections pour cette formation
      for (const sectionTitle of formationData.sections) {
        await prisma.section.create({
          data: {
            title: sectionTitle,
            formationId: formation.id
          }
        });
      }
      
      // Créer 3 à 5 sessions pour cette formation
      const numSessions = Math.floor(Math.random() * 3) + 3; // 3 à 5 sessions
      const sessions = [];
      
      for (let i = 0; i < numSessions; i++) {
        // Générer des dates de session après la date de formation
        const sessionDate = new Date(randomDate);
        sessionDate.setDate(sessionDate.getDate() + i * 2); // Sessions tous les 2 jours
        
        const startTime = new Date(sessionDate);
        startTime.setHours(9, 0, 0); // 9h00
        
        const endTime = new Date(sessionDate);
        endTime.setHours(17, 0, 0); // 17h00
        
        const session = await prisma.session.create({
          data: {
            startTime,
            endTime,
            formationId: formation.id
          }
        });
        
        sessions.push(session);
      }
      
      // Sélectionner 15 à 30 apprenants aléatoires pour cette formation
      const numParticipants = Math.floor(Math.random() * 16) + 15; // 15 à 30 participants
      const participants = [];
      const shuffledApprenants = [...allApprenants].sort(() => 0.5 - Math.random());
      const selectedApprenants = shuffledApprenants.slice(0, numParticipants);
      
      // Créer des achats pour ces apprenants
      for (const apprenant of selectedApprenants) {
        await prisma.purchase.create({
          data: {
            userId: apprenant.id,
            formationId: formation.id,
            purchaseDate: new Date(randomDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000) // 1-30 jours avant la formation
          }
        });
        
        participants.push(apprenant);
      }
      
      // Créer des émargements pour chaque session et participant
      for (const session of sessions) {
        for (const participant of participants) {
          // 90% de chance d'être présent
          const isPresent = Math.random() < 0.9;
          
          // Créer l'émargement
          const emargement = await prisma.emargement.create({
            data: {
              userId: participant.id,
              sessionId: session.id,
              isPresent,
              signature: isPresent ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAE...' : null,
              emargementDate: isPresent ? new Date(session.startTime.getTime() + Math.random() * 60 * 60 * 1000) : null, // Dans l'heure qui suit le début
              validatedBy: isPresent ? formateur.id : null,
              validationDate: isPresent ? new Date(session.endTime.getTime() + Math.random() * 60 * 60 * 1000) : null // Dans l'heure qui suit la fin
            }
          });
          
          // Si présent, créer un feedback (70% de chance)
          if (isPresent && Math.random() < 0.7) {
            // Générer des notes aléatoires entre 3 et 5 (plutôt positives)
            const generateRating = () => Math.floor(Math.random() * 3) + 3; // 3-5
            
            await prisma.feedback.create({
              data: {
                userId: participant.id,
                emargementId: emargement.id,
                clarity: generateRating(),
                objectives: generateRating(),
                level: generateRating(),
                trainer: generateRating(),
                materials: generateRating(),
                comments: Math.random() < 0.5 ? 'Formation très intéressante et enrichissante.' : 'Contenu bien structuré, formateur compétent.',
                globalRating: generateRating(),
                materialOrganization: generateRating(),
                premisesComfort: generateRating(),
                welcomeQuality: generateRating(),
                deepenOtherField: Math.random() < 0.3 ? 'Intelligence artificielle' : null,
                deepenSameField: Math.random() < 0.3 ? 'Aspects avancés' : null
              }
            });
          }
          
          // Si présent, créer une validation des acquis (80% de chance)
          if (isPresent && Math.random() < 0.8) {
            // Générer des compétences avant/après (progression positive)
            const skillsBefore = {};
            const skillsAfter = {};
            
            formationData.sections.forEach((section, index) => {
              // Compétences avant entre 1-7 (sur 10)
              const beforeLevel = Math.floor(Math.random() * 7) + 1;
              // Compétences après entre beforeLevel+1 et 10
              const afterLevel = Math.min(beforeLevel + 1 + Math.floor(Math.random() * (10 - beforeLevel)), 10);
              
              skillsBefore[`section${index}`] = beforeLevel;
              skillsAfter[`section${index}`] = afterLevel;
            });
            
            await prisma.skillValidation.create({
              data: {
                userId: participant.id,
                emargementId: emargement.id,
                skillsBeforeTraining: skillsBefore,
                skillsAfterTraining: skillsAfter,
                submittedAt: new Date(session.endTime.getTime() + Math.random() * 24 * 60 * 60 * 1000) // Dans les 24h après la fin
              }
            });
          }
        }
      }
      
      // Créer un feedback formateur (80% de chance)
      if (Math.random() < 0.8) {
        // Générer des notes aléatoires entre 3 et 5 (plutôt positives)
        const generateRating = () => Math.floor(Math.random() * 3) + 3; // 3-5
        
        await prisma.formateurFeedback.create({
          data: {
            userId: formateur.id,
            formationId: formation.id,
            homogeneity: generateRating(),
            informationLevel: generateRating(),
            groupLevel: generateRating(),
            participantCount: numParticipants,
            participation: generateRating(),
            assimilation: generateRating(),
            environment: generateRating(),
            welcome: generateRating(),
            technicalPlatforms: generateRating(),
            adapted: Math.random() < 0.8, // 80% de chance d'être adapté
            adaptationDetails: Math.random() < 0.3 ? 'Ajustement du rythme pour mieux correspondre au niveau du groupe' : null,
            organizationRemarks: Math.random() < 0.3 ? 'Organisation efficace, bonne logistique' : null,
            trainingImprovement: Math.random() < 0.3 ? 'Ajouter plus d\'exercices pratiques' : null,
            environmentImprovement: Math.random() < 0.3 ? 'Améliorer la connexion internet' : null,
            technicalImprovement: Math.random() < 0.3 ? 'Mettre à jour les postes de travail' : null
          }
        });
      }
      
      formations.push({
        id: formation.id,
        title: formation.title,
        formateurId: formateur.id,
        participantCount: participants.length,
        sessionCount: sessions.length
      });
    }
    
    console.log(`${formations.length} formations créées avec leurs sessions, émargements, feedbacks et validations.`);

    // Associer des achats à tous les apprenants qui n'en ont pas encore
    console.log('Association des achats à tous les apprenants...');
    const newPurchasesCount = await associatePurchasesToAllApprenants();
    console.log(`${newPurchasesCount} nouveaux achats créés pour les apprenants.`);

    // Créer un dossier pour les exports avec un timestamp pour éviter les conflits
    const fs = require('fs');
    const path = require('path');

    // Créer un dossier d'export avec un timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const exportDir = path.join(__dirname, `../exports_${timestamp}`);

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Modifier tous les chemins d'export CSV pour utiliser le nouveau dossier
    // Utilisateurs
    const userCsvWriter = createObjectCsvWriter({
      path: path.join(exportDir, 'users_export.csv'),
      header: [
        {id: 'id', title: 'ID'},
        {id: 'name', title: 'Nom'},
        {id: 'email', title: 'Email'},
        {id: 'role', title: 'Rôle'},
        {id: 'phone', title: 'Téléphone'},
        {id: 'country', title: 'Pays'},
        {id: 'city', title: 'Ville'},
        {id: 'birthDate', title: 'Date de naissance'},
        {id: 'interests', title: 'Centres d\'intérêt'}
      ]
    });

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        country: true,
        city: true,
        birthDate: true,
        interests: true
      }
    });

    await userCsvWriter.writeRecords(users.map(user => ({
      ...user,
      birthDate: user.birthDate ? user.birthDate.toISOString().split('T')[0] : null,
      interests: user.interests.join(', ')
    })));
    console.log('Fichier users_export.csv créé.');

    // Formations
    const formationCsvWriter = createObjectCsvWriter({
      path: path.join(exportDir, 'formations_export.csv'),
      header: [
        {id: 'id', title: 'ID'},
        {id: 'title', title: 'Titre'},
        {id: 'formateurId', title: 'ID Formateur'},
        {id: 'formateurName', title: 'Nom Formateur'},
        {id: 'date', title: 'Date'},
        {id: 'participantCount', title: 'Nombre de participants'},
        {id: 'sessionCount', title: 'Nombre de sessions'}
      ]
    });

    const formationsWithFormateurs = await prisma.formation.findMany({
      include: {
        formateur: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            purchases: true,
            sessions: true
          }
        }
      }
    });

    await formationCsvWriter.writeRecords(formationsWithFormateurs.map(formation => ({
      id: formation.id,
      title: formation.title,
      formateurId: formation.formateurId,
      formateurName: formation.formateur.name,
      date: formation.date.toISOString().split('T')[0],
      participantCount: formation._count.purchases,
      sessionCount: formation._count.sessions
    })));
    console.log('Fichier formations_export.csv créé.');

    // Émargements
    const emargementCsvWriter = createObjectCsvWriter({
      path: path.join(exportDir, 'emargements_export.csv'),
      header: [
        {id: 'id', title: 'ID'},
        {id: 'userId', title: 'ID Utilisateur'},
        {id: 'userName', title: 'Nom Utilisateur'},
        {id: 'sessionId', title: 'ID Session'},
        {id: 'formationTitle', title: 'Formation'},
        {id: 'sessionDate', title: 'Date Session'},
        {id: 'isPresent', title: 'Présent'},
        {id: 'validated', title: 'Validé'},
        {id: 'hasFeedback', title: 'Feedback'},
        {id: 'hasSkillValidation', title: 'Validation Acquis'}
      ]
    });

    const emargements = await prisma.emargement.findMany({
      include: {
        user: {
          select: {
            name: true
          }
        },
        session: {
          include: {
            formation: {
              select: {
                title: true
              }
            }
          }
        },
        feedbacks: {
          select: {
            id: true
          }
        },
        skillValidations: {
          select: {
            id: true
          }
        }
      }
    });

    await emargementCsvWriter.writeRecords(emargements.map(emargement => ({
      id: emargement.id,
      userId: emargement.userId,
      userName: emargement.user.name,
      sessionId: emargement.sessionId,
      formationTitle: emargement.session.formation.title,
      sessionDate: emargement.session.startTime.toISOString().split('T')[0],
      isPresent: emargement.isPresent ? 'Oui' : 'Non',
      validated: emargement.validatedBy ? 'Oui' : 'Non',
      hasFeedback: emargement.feedbacks ? 'Oui' : 'Non',
      hasSkillValidation: emargement.skillValidations ? 'Oui' : 'Non'
    })));
    console.log('Fichier emargements_export.csv créé.');

    // Feedbacks
    const feedbackCsvWriter = createObjectCsvWriter({
      path: path.join(exportDir, 'feedbacks_export.csv'),
      header: [
        {id: 'id', title: 'ID'},
        {id: 'userId', title: 'ID Utilisateur'},
        {id: 'userName', title: 'Nom Utilisateur'},
        {id: 'formationTitle', title: 'Formation'},
        {id: 'clarity', title: 'Clarté'},
        {id: 'objectives', title: 'Objectifs'},
        {id: 'level', title: 'Niveau'},
        {id: 'trainer', title: 'Formateur'},
        {id: 'materials', title: 'Matériels'},
        {id: 'globalRating', title: 'Note Globale'},
        {id: 'comments', title: 'Commentaires'}
      ]
    });

    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: {
          select: {
            name: true
          }
        },
        emargement: {
          include: {
            session: {
              include: {
                formation: {
                  select: {
                    title: true
                  }
                }
              }
            }
          }
        }
      }
    });

    await feedbackCsvWriter.writeRecords(feedbacks.map(feedback => ({
      id: feedback.id,
      userId: feedback.userId,
      userName: feedback.user.name,
      formationTitle: feedback.emargement.session.formation.title,
      clarity: feedback.clarity,
      objectives: feedback.objectives,
      level: feedback.level,
      trainer: feedback.trainer,
      materials: feedback.materials,
      globalRating: feedback.globalRating,
      comments: feedback.comments
    })));
    console.log('Fichier feedbacks_export.csv créé.');

    // Validations des acquis
    const skillValidationCsvWriter = createObjectCsvWriter({
      path: path.join(exportDir, 'skill_validations_export.csv'),
      header: [
        {id: 'id', title: 'ID'},
        {id: 'userId', title: 'ID Utilisateur'},
        {id: 'userName', title: 'Nom Utilisateur'},
        {id: 'formationTitle', title: 'Formation'},
        {id: 'skillsBefore', title: 'Compétences Avant (moyenne)'},
        {id: 'skillsAfter', title: 'Compétences Après (moyenne)'},
        {id: 'progression', title: 'Progression (%)'}
      ]
    });

    const skillValidations = await prisma.skillValidation.findMany({
      include: {
        user: {
          select: {
            name: true
          }
        },
        emargement: {
          include: {
            session: {
              include: {
                formation: {
                  select: {
                    title: true
                  }
                }
              }
            }
          }
        }
      }
    });

    await skillValidationCsvWriter.writeRecords(skillValidations.map(skillValidation => ({
      id: skillValidation.id,
      userId: skillValidation.userId,
      userName: skillValidation.user.name,
      formationTitle: skillValidation.emargement.session.formation.title,
      skillsBefore: Object.values(skillValidation.skillsBeforeTraining).reduce((sum, value) => sum + value, 0) / Object.keys(skillValidation.skillsBeforeTraining).length,
      skillsAfter: Object.values(skillValidation.skillsAfterTraining).reduce((sum, value) => sum + value, 0) / Object.keys(skillValidation.skillsAfterTraining).length,
      progression: ((Object.values(skillValidation.skillsAfterTraining).reduce((sum, value) => sum + value, 0) / Object.keys(skillValidation.skillsAfterTraining).length) - 
                    (Object.values(skillValidation.skillsBeforeTraining).reduce((sum, value) => sum + value, 0) / Object.keys(skillValidation.skillsBeforeTraining).length)) * 100
    })));
    console.log('Fichier skill_validations_export.csv créé.');

    // Achats (purchases)
    const purchaseCsvWriter = createObjectCsvWriter({
      path: path.join(exportDir, 'purchases_export.csv'),
      header: [
        {id: 'id', title: 'ID'},
        {id: 'userId', title: 'ID Utilisateur'},
        {id: 'userName', title: 'Nom Utilisateur'},
        {id: 'userEmail', title: 'Email Utilisateur'},
        {id: 'formationId', title: 'ID Formation'},
        {id: 'formationTitle', title: 'Titre Formation'},
        {id: 'formationDate', title: 'Date Formation'},
        {id: 'purchaseDate', title: 'Date Achat'}
      ]
    });

    try {
      const purchases = await prisma.purchase.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          formation: {
            select: {
              title: true,
              date: true
            }
          }
        }
      });

      console.log(`Nombre d'achats trouvés: ${purchases.length}`);

      if (purchases.length > 0) {
        const purchaseRecords = purchases.map(purchase => ({
          id: purchase.id,
          userId: purchase.userId,
          userName: purchase.user.name,
          userEmail: purchase.user.email,
          formationId: purchase.formationId,
          formationTitle: purchase.formation.title,
          formationDate: purchase.formation.date.toISOString().split('T')[0],
          purchaseDate: purchase.purchaseDate ? purchase.purchaseDate.toISOString().split('T')[0] : 'N/A'
        }));

        await purchaseCsvWriter.writeRecords(purchaseRecords);
        console.log('Fichier purchases_export.csv créé.');
      } else {
        console.log('Aucun achat trouvé dans la base de données.');
      }
    } catch (error) {
      console.error('Erreur lors de la création du fichier purchases_export.csv:', error);
    }

    // Ajouter une validation spécifique pour testapprenant25
    await addValidationForTestApprenant();
  } catch (error) {
    console.error('Erreur lors de la création des données de test :', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function addValidationForTestApprenant() {
  try {
    // Trouver l'utilisateur testapprenant25
    const testUser = await prisma.user.findUnique({
      where: { email: 'testapprenant25@gmail.com' }
    });
    
    if (!testUser) {
      console.log('Utilisateur testapprenant25 non trouvé');
      return;
    }
    
    // Trouver les émargements de cet utilisateur
    const emargements = await prisma.emargement.findMany({
      where: { userId: testUser.id },
      include: {
        session: {
          include: {
            formation: {
              include: { sections: true }
            }
          }
        }
      }
    });
    
    // S'assurer que chaque émargement a une validation
    for (const emargement of emargements) {
      // Vérifier si l'émargement est présent
      if (emargement.isPresent) {
        const sections = emargement.session.formation.sections;
        
        // Créer des objets pour les compétences avant/après
        const skillsBeforeTraining = {};
        const skillsAfterTraining = {};
        
        // Remplir avec des valeurs spécifiques pour testapprenant25
        sections.forEach(section => {
          const before = 4; // Niveau initial fixe à 4/10
          const after = 8;  // Niveau après formation fixe à 8/10
          skillsBeforeTraining[section.id] = before;
          skillsAfterTraining[section.id] = after;
        });
        
        // Créer ou mettre à jour la validation
        await prisma.skillValidation.upsert({
          where: {
            emargementId_userId: {
              emargementId: emargement.id,
              userId: testUser.id
            }
          },
          update: {
            skillsBeforeTraining,
            skillsAfterTraining
          },
          create: {
            emargementId: emargement.id,
            userId: testUser.id,
            skillsBeforeTraining,
            skillsAfterTraining,
            submittedAt: new Date()
          }
        });
        
        console.log(`Validation créée pour l'émargement ${emargement.id} de testapprenant25`);
      }
    }
    
    console.log('Validations ajoutées avec succès pour testapprenant25');
  } catch (error) {
    console.error('Erreur lors de l\'ajout des validations pour testapprenant25:', error);
  }
}

// Ajouter cette fonction pour créer des formations spécifiques pour formateurtest7
async function createFormationsForTestFormateur() {
  try {
    // Récupérer le formateur test
    const testFormateur = await prisma.user.findUnique({
      where: { email: 'formateurtest7@gmail.com' }
    });
    
    if (!testFormateur) {
      console.log('Formateur test non trouvé');
      return;
    }
    
    // Récupérer l'apprenant test
    const testApprenant = await prisma.user.findUnique({
      where: { email: 'testapprenant25@gmail.com' }
    });
    
    if (!testApprenant) {
      console.log('Apprenant test non trouvé');
      return;
    }
    
    // Récupérer quelques apprenants aléatoires
    const randomApprenants = await prisma.user.findMany({
      where: { 
        role: 'apprenant',
        NOT: { email: 'testapprenant25@gmail.com' }
      },
      take: 20,
      orderBy: { id: 'asc' }
    });
    
    // Créer 2 formations spécifiques pour le formateur test
    const formationsList = [
      {
        title: 'Formation Test - Développement Web Avancé',
        description: 'Formation spéciale pour tester les fonctionnalités de la plateforme',
        sections: [
          'Introduction au développement web moderne',
          'Frameworks JavaScript avancés',
          'Architecture microservices',
          'Déploiement continu'
        ]
      },
      {
        title: 'Formation Test - Cybersécurité Fondamentale',
        description: 'Formation de test sur les bases de la cybersécurité',
        sections: [
          'Principes de base de la sécurité informatique',
          'Cryptographie appliquée',
          'Sécurité des réseaux',
          'Gestion des incidents'
        ]
      }
    ];
    
    // Créer les formations
    for (const formationData of formationsList) {
      // Générer une date dans les 3 derniers mois
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      const randomDate = new Date(threeMonthsAgo.getTime() + Math.random() * (today.getTime() - threeMonthsAgo.getTime()));
      
      // Créer la formation
      const formation = await prisma.formation.create({
        data: {
          title: formationData.title,
          description: formationData.description,
          date: randomDate,
          formateurId: testFormateur.id,
        }
      });
      
      console.log(`Formation créée pour formateurtest7: ${formation.title}`);
      
      // Créer les sections pour cette formation
      const createdSections = [];
      for (const sectionTitle of formationData.sections) {
        const section = await prisma.section.create({
          data: {
            title: sectionTitle,
            formationId: formation.id
          }
        });
        createdSections.push(section);
      }
      
      // Créer 3 sessions pour cette formation
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        // Générer des dates de session après la date de formation
        const sessionDate = new Date(randomDate);
        sessionDate.setDate(sessionDate.getDate() + i * 3); // Sessions tous les 3 jours
        
        const startTime = new Date(sessionDate);
        startTime.setHours(9, 0, 0); // 9h00
        
        const endTime = new Date(sessionDate);
        endTime.setHours(17, 0, 0); // 17h00
        
        const session = await prisma.session.create({
          data: {
            startTime,
            endTime,
            formationId: formation.id
          }
        });
        
        sessions.push(session);
      }
      
      // Ajouter l'apprenant test et les apprenants aléatoires à cette formation
      const participants = [testApprenant, ...randomApprenants];
      
      // Créer des achats pour ces apprenants
      for (const apprenant of participants) {
        await prisma.purchase.create({
          data: {
            userId: apprenant.id,
            formationId: formation.id,
            purchaseDate: new Date(randomDate.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000) // 1-15 jours avant la formation
          }
        });
      }
      
      // Créer des émargements pour chaque session et participant
      for (const session of sessions) {
        for (const participant of participants) {
          // Pour testapprenant25, toujours présent
          const isPresent = participant.email === 'testapprenant25@gmail.com' ? true : Math.random() < 0.9;
          
          // Créer l'émargement
          const emargement = await prisma.emargement.create({
            data: {
              userId: participant.id,
              sessionId: session.id,
              isPresent,
              signature: isPresent ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAE...' : null,
              emargementDate: isPresent ? new Date(session.startTime.getTime() + Math.random() * 60 * 60 * 1000) : null, // Dans l'heure qui suit le début
              validatedBy: isPresent ? testFormateur.id : null,
              validationDate: isPresent ? new Date(session.endTime.getTime() + Math.random() * 60 * 60 * 1000) : null // Dans l'heure qui suit la fin
            }
          });
          
          // Si présent, créer un feedback (90% de chance)
          if (isPresent && (participant.email === 'testapprenant25@gmail.com' || Math.random() < 0.9)) {
            // Fonction pour générer une note aléatoire entre 3 et 5 (plutôt positive)
            const generateRating = () => Math.floor(Math.random() * 3) + 3; // 3-5
            
            await prisma.feedback.create({
              data: {
                userId: participant.id,
                emargementId: emargement.id,
                clarity: generateRating(),
                objectives: generateRating(),
                level: generateRating(),
                trainer: generateRating(),
                materials: generateRating(),
                comments: participant.email === 'testapprenant25@gmail.com' 
                  ? 'Formation très intéressante et bien structurée. Le formateur était très compétent.'
                  : Math.random() < 0.5 ? 'Formation très intéressante et enrichissante.' : 'Contenu bien structuré, formateur compétent.',
                globalRating: generateRating(),
                materialOrganization: generateRating(),
                premisesComfort: generateRating(),
                welcomeQuality: generateRating(),
                deepenOtherField: Math.random() < 0.3 ? 'Intelligence artificielle' : null,
                deepenSameField: Math.random() < 0.3 ? 'Aspects avancés' : null
              }
            });
          }
          
          // Si présent, créer une validation des acquis (pour testapprenant25 toujours, pour les autres 80% de chance)
          if (isPresent && (participant.email === 'testapprenant25@gmail.com' || Math.random() < 0.8)) {
            // Générer des compétences avant/après (progression positive)
            const skillsBefore = {};
            const skillsAfter = {};
            
            createdSections.forEach(section => {
              // Pour testapprenant25, valeurs fixes
              if (participant.email === 'testapprenant25@gmail.com') {
                skillsBefore[section.id] = 4; // Niveau initial fixe à 4/10
                skillsAfter[section.id] = 8;  // Niveau après formation fixe à 8/10
              } else {
                // Pour les autres, valeurs aléatoires
                const beforeLevel = Math.floor(Math.random() * 7) + 1; // 1-7
                const afterLevel = Math.min(beforeLevel + 1 + Math.floor(Math.random() * (10 - beforeLevel)), 10); // beforeLevel+1 à 10
                
                skillsBefore[section.id] = beforeLevel;
                skillsAfter[section.id] = afterLevel;
              }
            });
            
            await prisma.skillValidation.create({
              data: {
                userId: participant.id,
                emargementId: emargement.id,
                skillsBeforeTraining: skillsBefore,
                skillsAfterTraining: skillsAfter,
                submittedAt: new Date(session.endTime.getTime() + Math.random() * 24 * 60 * 60 * 1000) // Dans les 24h après la fin
              }
            });
          }
        }
      }
      
      // Créer un feedback formateur
      await prisma.formateurFeedback.create({
        data: {
          userId: testFormateur.id,
          formationId: formation.id,
          homogeneity: 4,
          informationLevel: 4,
          groupLevel: 4,
          participantCount: participants.length,
          participation: 4,
          assimilation: 4,
          environment: 4,
          welcome: 4,
          technicalPlatforms: 4,
          adapted: true,
          adaptationDetails: 'Ajustement du rythme pour mieux correspondre au niveau du groupe',
          organizationRemarks: 'Organisation efficace, bonne logistique',
          trainingImprovement: 'Ajouter plus d\'exercices pratiques',
          environmentImprovement: 'Améliorer la connexion internet',
          technicalImprovement: 'Mettre à jour les postes de travail'
        }
      });
      
      console.log(`Formation ${formation.title} complétée avec sessions, émargements, feedbacks et validations.`);
    }
    
    console.log('Formations spécifiques pour formateurtest7 créées avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création des formations pour formateurtest7:', error);
  }
}

// Fonction pour associer des achats à tous les apprenants
async function associatePurchasesToAllApprenants() {
  try {
    console.log('Début de l\'association des achats à tous les apprenants...');
    
    // Récupérer tous les apprenants
    const apprenants = await prisma.user.findMany({
      where: { role: 'apprenant' }
    });
    console.log(`Nombre d'apprenants trouvés: ${apprenants.length}`);
    
    // Récupérer toutes les formations
    const formations = await prisma.formation.findMany();
    console.log(`Nombre de formations trouvées: ${formations.length}`);
    
    // Compteur pour suivre le nombre d'achats créés
    let purchasesCreated = 0;
    
    // Pour chaque apprenant, vérifier s'il a déjà des achats
    for (const apprenant of apprenants) {
      const existingPurchases = await prisma.purchase.count({
        where: { userId: apprenant.id }
      });
      
      // Si l'apprenant n'a pas d'achats, lui en attribuer 1 à 3 aléatoirement
      if (existingPurchases === 0) {
        // Déterminer combien de formations attribuer (entre 1 et 3)
        const numFormations = Math.floor(Math.random() * 3) + 1;
        
        // Mélanger les formations et en prendre quelques-unes
        const shuffledFormations = [...formations].sort(() => 0.5 - Math.random());
        const selectedFormations = shuffledFormations.slice(0, numFormations);
        
        // Créer des achats pour ces formations
        for (const formation of selectedFormations) {
          // Générer une date d'achat (entre 1 et 30 jours avant la date de la formation)
          const purchaseDate = new Date(formation.date.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
          
          await prisma.purchase.create({
            data: {
              userId: apprenant.id,
              formationId: formation.id,
              purchaseDate: purchaseDate
            }
          });
          
          purchasesCreated++;
          console.log(`Achat créé pour l'apprenant ${apprenant.id} (${apprenant.name}) - Formation: ${formation.title}`);
        }
      } else {
        console.log(`L'apprenant ${apprenant.id} (${apprenant.name}) a déjà ${existingPurchases} achats.`);
      }
    }
    
    // Alternative si la commande SQL directe ne fonctionne pas
    const { createObjectCsvWriter } = require('csv-writer');
    const path = require('path');

    const purchases = await prisma.purchase.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        formation: {
          select: {
            title: true,
            date: true
          }
        }
      }
    });
    
    if (purchases.length > 0) {
      const purchaseCsvWriter = createObjectCsvWriter({
        path: path.join(__dirname, 'purchases_export.csv'),
        header: [
          {id: 'id', title: 'ID'},
          {id: 'userId', title: 'ID Utilisateur'},
          {id: 'userName', title: 'Nom Utilisateur'},
          {id: 'userEmail', title: 'Email Utilisateur'},
          {id: 'formationId', title: 'ID Formation'},
          {id: 'formationTitle', title: 'Titre Formation'},
          {id: 'formationDate', title: 'Date Formation'},
          {id: 'purchaseDate', title: 'Date Achat'}
        ]
      });
      
      const purchaseRecords = purchases.map(purchase => ({
        id: purchase.id,
        userId: purchase.userId,
        userName: purchase.user.name,
        userEmail: purchase.user.email,
        formationId: purchase.formationId,
        formationTitle: purchase.formation.title,
        formationDate: purchase.formation.date.toISOString().split('T')[0],
        purchaseDate: purchase.purchaseDate ? purchase.purchaseDate.toISOString().split('T')[0] : 'N/A'
      }));
      
      await purchaseCsvWriter.writeRecords(purchaseRecords);
      console.log('Fichier purchases_export.csv créé dans le dossier src');
    }
    
    console.log(`Association des achats terminée avec succès. ${purchasesCreated} nouveaux achats créés.`);
    return purchasesCreated;
  } catch (error) {
    console.error('Erreur lors de l\'association des achats aux apprenants:', error);
    throw error;
  }
}


seed();





