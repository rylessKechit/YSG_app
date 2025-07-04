const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function createTestData() {
  try {
    console.log('🏗️  Création de données de test pour les rapports');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
    
    const User = require('../src/models/User');
    const Agency = require('../src/models/Agency');
    const Timesheet = require('../src/models/Timesheet');
    const Schedule = require('../src/models/Schedule');
    
    // Créer un admin si aucun n'existe
    const adminExists = await User.findOne({ role: 'admin', isActive: true });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        firstName: 'Admin',
        lastName: 'Système',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        agencies: []
      });
      console.log('✅ Administrateur de test créé (admin@test.com / admin123)');
    }
    
    // Créer une agence de test
    let agency = await Agency.findOne({ code: 'TEST' });
    if (!agency) {
      agency = await Agency.create({
        name: 'Agence Test Rapports',
        code: 'TEST',
        client: 'Client Test',
        address: '123 Rue Test',
        city: 'Ville Test',
        postalCode: '12345',
        isActive: true
      });
      console.log('✅ Agence de test créée');
    }
    
    // Créer des utilisateurs de test
    const testUsers = [
      { firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@test.com' },
      { firstName: 'Marie', lastName: 'Martin', email: 'marie.martin@test.com' },
      { firstName: 'Pierre', lastName: 'Durand', email: 'pierre.durand@test.com' },
      { firstName: 'Sophie', lastName: 'Bernard', email: 'sophie.bernard@test.com' },
      { firstName: 'Lucas', lastName: 'Petit', email: 'lucas.petit@test.com' }
    ];
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    const createdUsers = [];
    
    for (const userData of testUsers) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create({
          ...userData,
          password: hashedPassword,
          role: 'preparateur',
          agencies: [agency._id],
          isActive: true
        });
        createdUsers.push(user);
      } else {
        createdUsers.push(user);
      }
    }
    console.log(`✅ ${createdUsers.length} préparateurs de test prêts`);
    
    // Créer des plannings et pointages pour les 7 derniers jours
    const scenarios = [
      { delay: 0, description: 'Ponctuel' },
      { delay: 3, description: 'Léger retard' },
      { delay: 8, description: 'Retard modéré' },
      { delay: 20, description: 'Retard important' },
      { absent: true, description: 'Absent' }
    ];
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);
      
      console.log(`📅 Création données pour ${date.toLocaleDateString('fr-FR')}`);
      
      for (let i = 0; i < createdUsers.length; i++) {
        const user = createdUsers[i];
        const scenario = scenarios[i % scenarios.length];
        
        // Créer le planning
        const schedule = await Schedule.findOneAndUpdate(
          { user: user._id, agency: agency._id, date },
          {
            user: user._id,
            agency: agency._id,
            date,
            startTime: '08:00',
            endTime: '17:00',
            breakStart: '12:00',
            breakEnd: '13:00',
            workingDuration: 480,
            status: 'active'
          },
          { upsert: true, new: true }
        );
        
        // Créer le pointage selon le scénario
        if (!scenario.absent) {
          const startTime = new Date(date);
          startTime.setHours(8, scenario.delay, 0, 0);
          
          const endTime = new Date(date);
          endTime.setHours(17, Math.floor(Math.random() * 10), 0, 0);
          
          const breakStart = new Date(date);
          breakStart.setHours(12, Math.floor(Math.random() * 5), 0, 0);
          
          const breakEnd = new Date(date);
          breakEnd.setHours(13, Math.floor(Math.random() * 5), 0, 0);
          
          const totalWorkedMinutes = Math.floor((endTime - startTime) / (1000 * 60)) - 60;
          
          await Timesheet.findOneAndUpdate(
            { user: user._id, agency: agency._id, date },
            {
              user: user._id,
              agency: agency._id,
              date,
              schedule: schedule._id,
              startTime,
              endTime,
              breakStart,
              breakEnd,
              delays: { 
                startDelay: scenario.delay,
                endDelay: 0,
                breakStartDelay: 0,
                breakEndDelay: 0
              },
              totalWorkedMinutes,
              totalBreakMinutes: 60,
              status: 'complete',
              alertsSent: {
                lateStart: false,
                lateEnd: false,
                longBreak: false,
                missingClockOut: false
              }
            },
            { upsert: true, new: true }
          );
        }
      }
    }
    
    console.log('✅ Données de test créées pour 7 jours');
    
    // Statistiques
    const totalSchedules = await Schedule.countDocuments({ agency: agency._id });
    const totalTimesheets = await Timesheet.countDocuments({ agency: agency._id });
    const lateTimesheets = await Timesheet.countDocuments({ 
      agency: agency._id, 
      'delays.startDelay': { $gt: 5 } 
    });
    
    console.log('\n📊 STATISTIQUES DES DONNÉES CRÉÉES');
    console.log(`   Agence: ${agency.name} (${agency.code})`);
    console.log(`   Préparateurs: ${createdUsers.length}`);
    console.log(`   Plannings: ${totalSchedules}`);
    console.log(`   Pointages: ${totalTimesheets}`);
    console.log(`   Retards (>5min): ${lateTimesheets}`);
    console.log(`   Taux de présence: ${Math.round((totalTimesheets / totalSchedules) * 100)}%`);
    console.log(`   Taux de ponctualité: ${Math.round(((totalTimesheets - lateTimesheets) / totalTimesheets) * 100)}%`);
    
    console.log('\n🎯 PRÊT POUR LES TESTS');
    console.log('   Vous pouvez maintenant tester les rapports avec des données réalistes');
    console.log('   Commandes utiles:');
    console.log('   - npm run reports:test');
    console.log('   - npm run reports:daily');
    console.log('   - npm run reports:weekly');
    
  } catch (error) {
    console.error('❌ Erreur création données test:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  createTestData();
}

// ===== USAGE =====
/*
# Créer des données de test pour les rapports
node scripts/create-test-data.js
*/