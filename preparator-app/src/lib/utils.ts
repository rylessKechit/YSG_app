import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formate une durée en minutes vers un format lisible (ex: "1h23" ou "45min")
 */
export function formatWorkTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`;
}

/**
 * Formate une durée en millisecondes vers un format lisible
 */
export function formatDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / (1000 * 60));
  return formatWorkTime(minutes);
}

/**
 * Formate une heure au format HH:mm
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formate une plage horaire (ex: "09:00 - 17:30")
 */
export function formatTimeRange(start: Date | string, end: Date | string): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

/**
 * Calcule la différence en minutes entre deux dates
 */
export function getMinutesDifference(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

/**
 * Vérifie si une heure est dans une plage donnée
 */
export function isTimeInRange(
  time: Date | string, 
  startTime: Date | string, 
  endTime: Date | string
): boolean {
  const timeMs = typeof time === 'string' ? new Date(time).getTime() : time.getTime();
  const startMs = typeof startTime === 'string' ? new Date(startTime).getTime() : startTime.getTime();
  const endMs = typeof endTime === 'string' ? new Date(endTime).getTime() : endTime.getTime();
  
  return timeMs >= startMs && timeMs <= endMs;
}