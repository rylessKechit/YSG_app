// backend/scripts/fix-preparation-data.js
// Script pour corriger les données corrompues dans les préparations

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function fixPreparationData() {
  try {
    console.log('🔧 Correction des données de préparations corrompues...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const db = mongoose.connection.db;
    const preparationsCollection = db.collection('preparations');

    // 1. Trouver toutes les préparations avec des ObjectIds invalides
    const corruptedPreparations = await preparationsCollection.find({
      $or: [
        { vehicle: { $type: "string", $not: { $regex: /^[0-9a-fA-F]{24}$/ } } },
        { user: { $type: "string", $not: { $regex: /^[0-9a-fA-F]{24}$/ } } },
        { agency: { $type: "string", $not: { $regex: /^[0-9a-fA-F]{24}$/ } } }
      ]
    }).toArray();

    console.log(`📋 Trouvé ${corruptedPreparations.length} préparations corrompues`);

    if (corruptedPreparations.length === 0) {
      console.log('✅ Aucune donnée corrompue trouvée');
      return;
    }

    let fixedCount = 0;

    for (const prep of corruptedPreparations) {
      console.log(`🔧 Correction préparation ${prep._id}:`);
      
      const updates = {};
      let needsUpdate = false;

      // Corriger le champ vehicle si c'est une string non-ObjectId
      if (prep.vehicle && typeof prep.vehicle === 'string' && !mongoose.Types.ObjectId.isValid(prep.vehicle)) {
        console.log(`  ❌ vehicle invalide: "${prep.vehicle}" -> suppression`);
        updates.vehicle = null;
        
        // Migrer vers vehicleData si pas déjà fait
        if (!prep.vehicleData && prep.vehicle.length < 15) {
          updates.vehicleData = {
            licensePlate: prep.vehicle.toUpperCase(),
            brand: 'N/A',
            model: 'Véhicule',
            vehicleType: 'particulier'
          };
          console.log(`  ✅ Migré vers vehicleData: ${prep.vehicle}`);
        }
        needsUpdate = true;
      }

      // Corriger le champ user si c'est une string non-ObjectId
      if (prep.user && typeof prep.user === 'string' && !mongoose.Types.ObjectId.isValid(prep.user)) {
        console.log(`  ❌ user invalide: "${prep.user}" -> recherche utilisateur`);
        
        // Essayer de trouver un utilisateur par email ou nom
        const usersCollection = db.collection('users');
        const foundUser = await usersCollection.findOne({
          $or: [
            { email: { $regex: prep.user, $options: 'i' } },
            { firstName: { $regex: prep.user, $options: 'i' } },
            { lastName: { $regex: prep.user, $options: 'i' } }
          ]
        });

        if (foundUser) {
          updates.user = foundUser._id;
          console.log(`  ✅ user corrigé: ${foundUser.email}`);
        } else {
          // Utiliser le premier admin trouvé
          const firstAdmin = await usersCollection.findOne({ role: 'admin' });
          if (firstAdmin) {
            updates.user = firstAdmin._id;
            console.log(`  ⚠️ user assigné à admin: ${firstAdmin.email}`);
          }
        }
        needsUpdate = true;
      }

      // Corriger le champ agency si c'est une string non-ObjectId
      if (prep.agency && typeof prep.agency === 'string' && !mongoose.Types.ObjectId.isValid(prep.agency)) {
        console.log(`  ❌ agency invalide: "${prep.agency}" -> recherche agence`);
        
        // Essayer de trouver une agence par nom ou code
        const agenciesCollection = db.collection('agencies');
        const foundAgency = await agenciesCollection.findOne({
          $or: [
            { name: { $regex: prep.agency, $options: 'i' } },
            { code: { $regex: prep.agency, $options: 'i' } }
          ]
        });

        if (foundAgency) {
          updates.agency = foundAgency._id;
          console.log(`  ✅ agency corrigée: ${foundAgency.name}`);
        } else {
          // Utiliser la première agence trouvée
          const firstAgency = await agenciesCollection.findOne({});
          if (firstAgency) {
            updates.agency = firstAgency._id;
            console.log(`  ⚠️ agency assignée: ${firstAgency.name}`);
          }
        }
        needsUpdate = true;
      }

      // Appliquer les corrections
      if (needsUpdate) {
        await preparationsCollection.updateOne(
          { _id: prep._id },
          { $set: updates }
        );
        fixedCount++;
        console.log(`  ✅ Préparation ${prep._id} corrigée`);
      }
    }

    console.log(`\n🎉 Correction terminée: ${fixedCount} préparations corrigées`);

    // 2. Vérification finale
    console.log('\n🔍 Vérification finale...');
    const remainingCorrupted = await preparationsCollection.find({
      $or: [
        { vehicle: { $type: "string", $not: { $regex: /^[0-9a-fA-F]{24}$/ } } },
        { user: { $type: "string", $not: { $regex: /^[0-9a-fA-F]{24}$/ } } },
        { agency: { $type: "string", $not: { $regex: /^[0-9a-fA-F]{24}$/ } } }
      ]
    }).count();

    if (remainingCorrupted === 0) {
      console.log('✅ Toutes les données sont maintenant valides !');
    } else {
      console.log(`⚠️ Il reste ${remainingCorrupted} préparations à corriger manuellement`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  fixPreparationData().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { fixPreparationData };