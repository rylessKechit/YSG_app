import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatters = {
  // Dates
  date: (date: string | Date, pattern = 'dd/MM/yyyy') => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, pattern, { locale: fr });
  },

  dateTime: (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: fr });
  },

  timeAgo: (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { locale: fr, addSuffix: true });
  },

  // Nombres
  number: (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat('fr-FR', options).format(value);
  },

  percentage: (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
  },

  duration: (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
  },

  // Texte
  truncate: (text: string, length = 50) => {
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
  },

  initials: (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  },

  fullName: (firstName: string, lastName: string) => {
    return `${firstName} ${lastName}`;
  },

  // Statuts
  userStatus: (isActive: boolean) => {
    return isActive ? 'Actif' : 'Inactif';
  },

  role: (role: string) => {
    return role === 'admin' ? 'Administrateur' : 'Préparateur';
  },
};