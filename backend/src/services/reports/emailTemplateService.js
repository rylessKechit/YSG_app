// ===== SERVICE TEMPLATES EMAIL POUR RAPPORTS - VERSION CORRIGÉE =====
// backend/src/services/reports/emailTemplateService.js

/**
 * Service pour créer les templates HTML des emails de rapports
 */
class EmailTemplateService {

  /**
   * ✅ Template email quotidien amélioré avec préparations
   */
  createDailyEmailTemplate(reportData) {
    // Calcul des alertes
    const hasIssues = reportData.stats.retardsCount > 3 || 
                     reportData.stats.ponctualiteRate < 80 || 
                     reportData.stats.preparationsInProgress > 5;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport Quotidien Complet</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto;">
        
        <!-- En-tête -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Rapport Quotidien Complet</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${reportData.date}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Pointages + Préparations Véhicules</p>
        </div>

        <!-- Statistiques principales -->
        <div style="display: flex; margin: 20px 0;">
          <!-- Colonne Pointages -->
          <div style="flex: 1; background: #f8f9fa; padding: 20px; margin-right: 10px; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; color: #333; text-align: center;">⏰ POINTAGES</h3>
            
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="font-size: 28px; font-weight: bold; color: #667eea;">${reportData.stats.totalEmployes}</div>
              <div style="font-size: 14px; color: #666;">Employés prévus</div>
            </div>
            
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="font-size: 28px; font-weight: bold; color: ${reportData.stats.presenceRate >= 90 ? '#28a745' : reportData.stats.presenceRate >= 75 ? '#ffc107' : '#dc3545'};">${reportData.stats.presentsCount}</div>
              <div style="font-size: 14px; color: #666;">Présents (${reportData.stats.presenceRate}%)</div>
            </div>
            
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: ${reportData.stats.ponctualiteRate >= 85 ? '#28a745' : reportData.stats.ponctualiteRate >= 70 ? '#ffc107' : '#dc3545'};">${reportData.stats.ponctualiteRate}%</div>
              <div style="font-size: 14px; color: #666;">Ponctualité</div>
            </div>
          </div>

          <!-- Colonne Véhicules -->
          <div style="flex: 1; background: #f8f9fa; padding: 20px; margin-left: 10px; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; color: #333; text-align: center;">🚗 VÉHICULES</h3>
            
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="font-size: 28px; font-weight: bold; color: #17a2b8;">${reportData.stats.totalPreparations}</div>
              <div style="font-size: 14px; color: #666;">Total préparations</div>
            </div>
            
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="font-size: 28px; font-weight: bold; color: #28a745;">${reportData.stats.preparationsCompleted}</div>
              <div style="font-size: 14px; color: #666;">Terminées</div>
            </div>
            
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #ffc107;">${reportData.stats.preparationsInProgress}</div>
              <div style="font-size: 14px; color: #666;">En cours</div>
            </div>
          </div>
        </div>

        <!-- Résumé par agence -->
        <div style="background: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">🏢 Activité par Agence</h3>
          
          ${Object.values(reportData.preparationsByAgency).map(agency => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0;">
              <div>
                <strong>${agency.agencyInfo.name}</strong> (${agency.agencyInfo.code})<br>
                <small style="color: #666;">${agency.agencyInfo.client}</small>
              </div>
              <div style="text-align: right;">
                <span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px;">
                  ${agency.totalPreparations} total
                </span>
                <span style="background: #e8f5e8; color: #2e7d32; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                  ${agency.completedPreparations} terminées
                </span>
              </div>
            </div>
          `).join('')}
          
          ${Object.keys(reportData.preparationsByAgency).length === 0 ? 
            '<p style="text-align: center; color: #666; margin: 20px 0;">Aucune préparation véhicule aujourd\'hui</p>' : 
            ''
          }
        </div>

        <!-- Détails performance -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📈 Performance</h3>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Retards détectés:</span>
            <span style="color: ${reportData.stats.retardsCount > 3 ? '#dc3545' : '#28a745'}; font-weight: bold;">
              ${reportData.stats.retardsCount}
            </span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Agences actives:</span>
            <span style="font-weight: bold;">${reportData.stats.preparationsByAgencyCount}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <span>Temps moyen préparation:</span>
            <span style="font-weight: bold;">
              ${reportData.stats.averagePreparationTime ? reportData.stats.averagePreparationTime + ' min' : 'N/A'}
            </span>
          </div>
        </div>

        ${hasIssues ? `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #856404;">⚠️ Points d'attention</h3>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            ${reportData.stats.retardsCount > 3 ? `<li>Nombre élevé de retards (${reportData.stats.retardsCount})</li>` : ''}
            ${reportData.stats.ponctualiteRate < 80 ? `<li>Taux de ponctualité faible (${reportData.stats.ponctualiteRate}%)</li>` : ''}
            ${reportData.stats.preparationsInProgress > 5 ? `<li>Beaucoup de préparations en cours (${reportData.stats.preparationsInProgress})</li>` : ''}
          </ul>
        </div>
        ` : ''}

        <!-- Pied de page -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            Rapport généré automatiquement par le système de gestion des véhicules<br>
            📧 ${reportData.generatedAt.toLocaleString('fr-FR')}<br>
            📎 Fichier Excel joint avec détails complets
          </p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * ✅ Template email hebdomadaire avec nouvelles stats détaillées
   */
  createWeeklyEmailTemplate(reportData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport Hebdomadaire Complet</title>
        <style>
          .stat-card { 
            background: linear-gradient(45deg, #f8f9fa, #e9ecef); 
            border-radius: 12px; 
            padding: 15px; 
            margin: 10px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
          }
          .stat-card:hover { transform: translateY(-2px); }
          .stat-number { 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 5px;
            background: linear-gradient(45deg, #2196F3, #21CBF3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .agency-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin: 8px 0;
            border-left: 4px solid #2196F3;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 8px;
            margin-top: 10px;
          }
          .stat-chip {
            background: #f0f8ff;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            text-align: center;
            border: 1px solid #e3f2fd;
          }
          .vehicle-type {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: bold;
            margin: 2px;
          }
          .particulier { background: #e3f2fd; color: #1976d2; }
          .utilitaire { background: #fff3e0; color: #f57c00; }
        </style>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto;">
        
        <!-- En-tête animé -->
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px; text-align: center; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
          <h1 style="margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">📊 Rapport Hebdomadaire Complet</h1>
          <p style="margin: 15px 0 5px 0; font-size: 20px; opacity: 0.95;">Semaine du ${reportData.startDate} au ${reportData.endDate}</p>
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">🚗 Véhicules • 🏢 Agences • 👨‍🔧 Employés • 📈 Performance</p>
        </div>

        <!-- Statistiques principales avec cartes interactives -->
        <div style="background: #f8f9fa; padding: 30px; border-left: 4px solid #28a745;">
          <h2 style="margin: 0 0 25px 0; color: #333; text-align: center;">📈 Vue d'ensemble de la semaine</h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="stat-card">
              <div class="stat-number">${reportData.stats.totalPreparations}</div>
              <div style="font-size: 14px; color: #666; font-weight: 500;">Total préparations</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" style="background: linear-gradient(45deg, #4CAF50, #8BC34A); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${reportData.stats.completedPreparations}</div>
              <div style="font-size: 14px; color: #666; font-weight: 500;">Terminées</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" style="background: linear-gradient(45deg, #9C27B0, #E91E63); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${reportData.stats.agenciesCount}</div>
              <div style="font-size: 14px; color: #666; font-weight: 500;">Agences actives</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" style="background: linear-gradient(45deg, #FF9800, #FF5722); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${reportData.stats.employeesWithPreparationsCount}</div>
              <div style="font-size: 14px; color: #666; font-weight: 500;">Employés actifs</div>
            </div>
          </div>
        </div>

        <!-- TOP Agences avec statistiques détaillées -->
        <div style="background: #fff; padding: 25px; border: 1px solid #e9ecef; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin: 0 0 20px 0; color: #333; text-align: center; font-size: 18px;">🏆 TOP Agences - Analyse Détaillée</h3>
          
          ${Object.values(reportData.preparationsByAgency)
            .sort((a, b) => b.totalPreparations - a.totalPreparations)
            .slice(0, 5)
            .map((agency, index) => {
              const completionRate = agency.totalPreparations > 0 ? 
                Math.round((agency.completedPreparations / agency.totalPreparations) * 100) : 0;
              
              return `
                <div class="agency-card">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center;">
                      <span style="background: linear-gradient(45deg, #007bff, #0056b3); color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; margin-right: 12px;">
                        ${index + 1}
                      </span>
                      <div>
                        <div style="font-weight: bold; font-size: 16px; color: #333;">${agency.agencyInfo.name}</div>
                        <div style="font-size: 12px; color: #666;">${agency.agencyInfo.client} • ${agency.agencyInfo.code}</div>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 24px; font-weight: bold; color: #28a745;">${agency.totalPreparations}</div>
                      <div style="font-size: 11px; color: #666;">${agency.completedPreparations} terminées</div>
                    </div>
                  </div>
                  
                  <!-- Statistiques étapes -->
                  <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px; color: #495057;">📋 Types de préparations :</div>
                    <div class="stats-grid">
                      <div class="stat-chip">🏠 Int: ${agency.stepStats ? agency.stepStats.interior || 0 : 0}</div>
                      <div class="stat-chip">🚗 Ext: ${agency.stepStats ? agency.stepStats.exterior || 0 : 0}</div>
                      <div class="stat-chip">⛽ Carbu: ${agency.stepStats ? agency.stepStats.fuel || 0 : 0}</div>
                      <div class="stat-chip">✨ Spéc: ${agency.stepStats ? agency.stepStats.special_wash || 0 : 0}</div>
                    </div>
                  </div>
                  
                  <!-- Types de véhicules -->
                  <div style="margin-bottom: 10px;">
                    <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px; color: #495057;">🚗 Types de véhicules :</div>
                    <div>
                      <span class="vehicle-type particulier">🚙 Particuliers: ${agency.vehicleStats ? agency.vehicleStats.particulier || 0 : 0}</span>
                      <span class="vehicle-type utilitaire">🚛 Utilitaires: ${agency.vehicleStats ? agency.vehicleStats.utilitaire || 0 : 0}</span>
                    </div>
                  </div>
                  
                  <!-- Debug info (à supprimer après test) -->
                  <div style="font-size: 10px; color: #999; margin: 5px 0;">
                    Debug: stepStats=${JSON.stringify(agency.stepStats)} | vehicleStats=${JSON.stringify(agency.vehicleStats)}
                  </div>
                  
                  <!-- Barre de progression -->
                  <div style="margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <span style="font-size: 11px; color: #666;">Taux de completion</span>
                      <span style="font-size: 11px; font-weight: bold; color: ${completionRate >= 85 ? '#28a745' : completionRate >= 70 ? '#ffc107' : '#dc3545'};">${completionRate}%</span>
                    </div>
                    <div style="background: #e9ecef; height: 6px; border-radius: 3px; overflow: hidden;">
                      <div style="background: ${completionRate >= 85 ? '#28a745' : completionRate >= 70 ? '#ffc107' : '#dc3545'}; height: 100%; width: ${completionRate}%; transition: width 0.3s ease;"></div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
        </div>

        <!-- TOP Employés avec performances -->
        <div style="background: #fff; padding: 25px; border: 1px solid #e9ecef; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin: 0 0 20px 0; color: #333; text-align: center; font-size: 18px;">🏆 TOP Employés - Performance</h3>
          
          ${Object.values(reportData.preparationsByEmployee)
            .sort((a, b) => b.totalPreparations - a.totalPreparations)
            .slice(0, 5)
            .map((employee, index) => {
              const efficiency = employee.totalPreparations > 0 ? 
                Math.round((employee.completedPreparations / employee.totalPreparations) * 100) : 0;
              
              const medals = ['🥇', '🥈', '🥉'];
              const medal = index < 3 ? medals[index] : `${index + 1}`;
              
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; background: ${index < 3 ? (index === 0 ? '#fff3e0' : index === 1 ? '#f3e5f5' : '#e8f5e8') : 'transparent'}; border-radius: 8px; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center;">
                    <span style="font-size: 24px; margin-right: 12px;">${medal}</span>
                    <div>
                      <div style="font-weight: bold; font-size: 15px;">${employee.userInfo.firstName} ${employee.userInfo.lastName}</div>
                      <div style="font-size: 11px; color: #666;">${employee.agenciesWorked.join(', ')}</div>
                      <div style="margin-top: 6px;">
                        <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-right: 4px;">🏠 ${employee.stepStats ? employee.stepStats.interior : 0}</span>
                        <span style="background: #e8f5e8; color: #2e7d32; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-right: 4px;">🚗 ${employee.stepStats ? employee.stepStats.exterior : 0}</span>
                        <span style="background: #fff3e0; color: #f57c00; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-right: 4px;">⛽ ${employee.stepStats ? employee.stepStats.fuel : 0}</span>
                        <span style="background: #f3e5f5; color: #8e24aa; padding: 2px 6px; border-radius: 8px; font-size: 10px;">✨ ${employee.stepStats ? employee.stepStats.special_wash : 0}</span>
                      </div>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 20px; font-weight: bold; color: #fd7e14;">${employee.totalPreparations}</div>
                    <div style="font-size: 11px; color: #666;">${employee.averageDuration || 'N/A'} min moy.</div>
                    <div style="font-size: 11px; font-weight: bold; color: ${efficiency >= 85 ? '#28a745' : efficiency >= 70 ? '#ffc107' : '#dc3545'};">${efficiency}% efficacité</div>
                  </div>
                </div>
              `;
            }).join('')}
        </div>

        <!-- Analyse globale -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin: 0 0 20px 0; color: #333; text-align: center;">⚡ Analyse Performance Globale</h3>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Taux de completion global</div>
              <div style="font-size: 24px; font-weight: bold; color: ${reportData.stats.totalPreparations > 0 ? 
                Math.round((reportData.stats.completedPreparations / reportData.stats.totalPreparations) * 100) >= 85 ? '#28a745' : '#ffc107' : '#666'};">
                ${reportData.stats.totalPreparations > 0 ? 
                  Math.round((reportData.stats.completedPreparations / reportData.stats.totalPreparations) * 100) : 0}%
              </div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Temps moyen par préparation</div>
              <div style="font-size: 24px; font-weight: bold; color: #1976d2;">${reportData.stats.averagePreparationTime || 'N/A'} min</div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Préparations par employé actif</div>
              <div style="font-size: 24px; font-weight: bold; color: #9c27b0;">
                ${reportData.stats.employeesWithPreparationsCount > 0 ? 
                  Math.round(reportData.stats.totalPreparations / reportData.stats.employeesWithPreparationsCount) : 0}
              </div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Couverture agences</div>
              <div style="font-size: 24px; font-weight: bold; color: #ff5722;">${reportData.stats.agenciesCount} / Total</div>
            </div>
          </div>
        </div>

        <!-- Résumé par types -->
        <div style="background: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📊 Répartition par Types</h3>
          
          <div style="display: flex; justify-content: space-around; margin-bottom: 20px;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">ÉTAPES LES PLUS RÉALISÉES</div>
              ${(() => {
                // Calculer le total de chaque type d'étape
                const stepTotals = { interior: 0, exterior: 0, fuel: 0, special_wash: 0 };
                Object.values(reportData.preparationsByAgency).forEach(agency => {
                  if (agency.stepStats) {
                    stepTotals.interior += agency.stepStats.interior || 0;
                    stepTotals.exterior += agency.stepStats.exterior || 0;
                    stepTotals.fuel += agency.stepStats.fuel || 0;
                    stepTotals.special_wash += agency.stepStats.special_wash || 0;
                  }
                });
                
                const sortedSteps = Object.entries(stepTotals)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 2);
                
                const stepLabels = {
                  interior: '🏠 Intérieur',
                  exterior: '🚗 Extérieur',
                  fuel: '⛽ Carburant',
                  special_wash: '✨ Spécial'
                };
                
                return sortedSteps.map(([step, count]) => 
                  `<div style="font-size: 14px; margin: 4px 0;"><strong>${stepLabels[step]}</strong>: ${count}</div>`
                ).join('');
              })()}
            </div>
            
            <div style="text-align: center; flex: 1; border-left: 1px solid #e9ecef; padding-left: 20px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">TYPES DE VÉHICULES</div>
              ${(() => {
                // Calculer le total de chaque type de véhicule
                const vehicleTotals = { particulier: 0, utilitaire: 0 };
                Object.values(reportData.preparationsByAgency).forEach(agency => {
                  if (agency.vehicleStats) {
                    vehicleTotals.particulier += agency.vehicleStats.particulier || 0;
                    vehicleTotals.utilitaire += agency.vehicleStats.utilitaire || 0;
                  }
                });
                
                return `
                  <div style="font-size: 14px; margin: 4px 0;"><strong>🚙 Particuliers</strong>: ${vehicleTotals.particulier}</div>
                  <div style="font-size: 14px; margin: 4px 0;"><strong>🚛 Utilitaires</strong>: ${vehicleTotals.utilitaire}</div>
                `;
              })()}
            </div>
          </div>
        </div>

        <!-- Points d'attention -->
        ${(() => {
          const lowPerformanceAgencies = Object.values(reportData.preparationsByAgency)
            .filter(agency => {
              const rate = agency.totalPreparations > 0 ? 
                (agency.completedPreparations / agency.totalPreparations) * 100 : 0;
              return rate < 70;
            });
          
          const highVolumeEmployees = Object.values(reportData.preparationsByEmployee)
            .filter(emp => emp.totalPreparations > 10);
          
          const needsAttention = lowPerformanceAgencies.length > 0 || 
                                highVolumeEmployees.length > 3 || 
                                reportData.stats.averagePreparationTime > 35;
          
          if (needsAttention) {
            return `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #856404;">⚠️ Points d'Attention</h3>
                <ul style="margin: 0; padding-left: 20px; color: #856404;">
                  ${lowPerformanceAgencies.length > 0 ? 
                    `<li>Agences avec taux de completion faible : ${lowPerformanceAgencies.map(a => a.agencyInfo.name).join(', ')}</li>` : ''}
                  ${highVolumeEmployees.length > 3 ? 
                    `<li>Charge de travail élevée pour ${highVolumeEmployees.length} employé(s)</li>` : ''}
                  ${reportData.stats.averagePreparationTime > 35 ? 
                    '<li>Temps moyen de préparation élevé (> 35 min)</li>' : ''}
                </ul>
              </div>
            `;
          }
          return '';
        })()}

        <!-- Pied de page amélioré -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #e9ecef;">
          <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 10px;">
            <div style="width: 40px; height: 2px; background: linear-gradient(90deg, #28a745, #20c997); margin: 0 15px;"></div>
            <span style="font-size: 14px; color: #495057; font-weight: 500;">Système de Gestion Véhicules</span>
            <div style="width: 40px; height: 2px; background: linear-gradient(90deg, #20c997, #28a745); margin: 0 15px;"></div>
          </div>
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            📧 Rapport généré automatiquement le ${reportData.generatedAt.toLocaleString('fr-FR')}<br>
            📎 Fichier Excel joint avec analyse complète par agence et employé<br>
            🎯 <strong>Statistiques détaillées :</strong> Types d'étapes • Types de véhicules • Performance individuelle
          </p>
        </div>

      </body>
      </html>
    `;
  }
}

module.exports = new EmailTemplateService();