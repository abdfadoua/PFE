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
const adminStatRoute = require('./routes/adminStatRoute'); // Assurez-vous que ce fichier exporte un router
const learnerStatRoute = require('./routes/apprenantstat'); // Assurez-vous que ce fichier exporte un router
const { handleGoogleAuth } = require('./controllers/authController');

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
app.use('/api/statistics', adminStatRoute); // Assurez-vous que adminStatRoute est un router Express
app.use('/api/statistics', learnerStatRoute); // Assurez-vous que learnerStatRoute est un router Express

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

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

