const { PrismaClient } = require('@prisma/client');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function generatePurchasesCsv() {
  try {
    // Créer un dossier pour l'export
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const exportDir = path.join(__dirname, `../exports_${timestamp}`);
    
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    console.log(`Dossier d'export créé: ${exportDir}`);
    
    // Définir le writer CSV
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
    
    // Récupérer les données
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
    
    if (purchases.length === 0) {
      console.log('Aucun achat trouvé dans la base de données.');
      return;
    }
    
    // Formater les données
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
    
    // Écrire le fichier CSV
    await purchaseCsvWriter.writeRecords(purchaseRecords);
    console.log(`Fichier purchases_export.csv créé dans ${exportDir}`);
    
  } catch (error) {
    console.error('Erreur lors de la génération du fichier CSV des achats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
generatePurchasesCsv();