/**
 * Utilitaires pour la gestion cohérente des dates
 * Évite les problèmes de timezone entre UTC et local
 */

/**
 * Créer une clé de date en local timezone (YYYY-MM-DD)
 * Utilise le timezone local, pas UTC
 */
export function createDateKey(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // ✅ CORRECTION : Utiliser local timezone, pas UTC
  return dateObj.getFullYear() + '-' + 
         String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
         String(dateObj.getDate()).padStart(2, '0');
}

/**
 * Créer une date en local timezone depuis une chaîne
 * Évite les décalages UTC
 */
export function createLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Comparer deux dates (juste les jours, pas l'heure)
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  return createDateKey(date1) === createDateKey(date2);
}

/**
 * Obtenir les dates de début/fin de semaine
 */
export function getWeekRange(date: Date): { startDate: string; endDate: string } {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return {
    startDate: createDateKey(startOfWeek),
    endDate: createDateKey(endOfWeek)
  };
}

/**
 * Formater une date pour l'affichage FR
 */
export function formatDateDisplay(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? createLocalDate(date) : date;
  return dateObj.toLocaleDateString('fr-FR', options);
}