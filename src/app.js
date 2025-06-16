// Importez le routeur
const statisticsRouter = require('./routes/apprenantstat');

// Enregistrez le routeur avec le bon préfixe
app.use('/api/statistics', statisticsRouter);
