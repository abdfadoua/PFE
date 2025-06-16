const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const formationRoutes = require('./routes/formationRoutes');
const userRoutes = require('./routes/users');
const historyRoutes = require('./routes/history');
const validationRoutes = require('./routes/validation');
const emargementRoutes = require('./routes/emargement');
const feedbackRoutes = require('./routes/feedbacksapp');
const formateurFeedbackRoutes = require('./routes/formateurEvaluation');
const statistiqueRoutes = require('./routes/statistiqueRoutes');
const adminStatRoute = require('./routes/adminStatRoute');
const learnerStatRoute = require('./routes/apprenantstat');
const { handleGoogleAuth } = require('./controllers/authController');
const analyticsRoutes = require('./routes/analytics');
const axios = require('axios');
const path = require('path');

const app = express();

app.use('/uploads', express.static('uploads'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration CORS améliorée
app.use(cors({
  origin: function(origin, callback) {
    // Autorise les requêtes sans origine (comme les appels API mobiles ou Postman)
    if (!origin) return callback(null, true);
    
    // Liste des origines autorisées
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log("Origine non autorisée:", origin);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['Cross-Origin-Opener-Policy', 'Cross-Origin-Embedder-Policy'],
}));

// Ajouter cette ligne après les autres middlewares
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// Ajouter un middleware pour gérer les erreurs CORS spécifiques aux images
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    return res.status(200).json({});
  }
  next();
});

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body:', req.body);
  }
  next();
});

app.use('/api/auth', authRoutes);
app.post('/google', handleGoogleAuth);
app.use('/api', formationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/emargements', emargementRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/formateur', formateurFeedbackRoutes);
app.use('/api', statistiqueRoutes);
app.use('/api/statistics', adminStatRoute);
app.use('/api/statistics', learnerStatRoute);
app.use('/api/analytics', analyticsRoutes);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur' });
});

// Changer le port par défaut à 5002 ou un autre port disponible
const PORT = process.env.PORT || 5002;

// Add a simple test route to verify the server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// Log all registered routes for debugging
console.log('Registered routes:');
app._router.stack.forEach(middleware => {
  if (middleware.route) {
    // Routes registered directly on the app
    console.log(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    // Router middleware
    middleware.handle.stack.forEach(handler => {
      if (handler.route) {
        const path = handler.route.path;
        const methods = Object.keys(handler.route.methods);
        console.log(`${methods} /api${path}`);
      }
    });
  }
});

// Ajouter cette fonction pour vérifier si l'API Python est disponible
const checkPythonApi = async () => {
  try {
    console.log("Vérification de la disponibilité de l'API Python...");
    const response = await axios.get("http://localhost:5001/api/test", { timeout: 5000 });
    if (response.data && response.data.success) {
      console.log("API Python disponible et fonctionnelle");
      return true;
    } else {
      console.log("API Python disponible mais renvoie une erreur");
      return false;
    }
  } catch (error) {
    console.error("API Python inaccessible:", error.message);
    return false;
  }
};

// UN SEUL app.listen à la fin du fichier
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Vérifier si l'API Python est disponible
  const pythonApiAvailable = await checkPythonApi();
  if (!pythonApiAvailable) {
    console.warn("ATTENTION: L'API Python n'est pas disponible. Les analyses utiliseront des données de secours.");
  }
});


