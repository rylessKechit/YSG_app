import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Fonction utilitaire pour combiner les classes CSS avec Tailwind
 * Utilise clsx pour la logique conditionnelle et twMerge pour éviter les conflits
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formater une date en français
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

/**
 * Formater un temps de travail en heures/minutes
 */
export function formatWorkTime(minutes: number): string {
  if (minutes <= 0) return '0h00'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  return `${hours}h${mins.toString().padStart(2, '0')}`
}

/**
 * Formater une heure (HH:mm)
 */
export function formatTime(minutes: number): string {
  if (!minutes || minutes === 0) return '0min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${mins}min`;
}

/**
 * Formater une plaque d'immatriculation
 */
export function formatLicensePlate(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, '')
}

/**
 * Calculer le pourcentage d'une valeur
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Débounce une fonction
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Vérifier si l'appareil est mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

/**
 * Vérifier si l'app est en mode PWA
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

/**
 * Gérer les erreurs de façon centralisée
 */
export function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'Une erreur inattendue s\'est produite'
}

/**
 * Générer un ID unique simple
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Vérifier si une chaîne est un email valide
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Compresser une image File
 */
export function compressImage(file: File, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      // Calcul de la taille avec max 1920px de largeur
      const maxWidth = 1920
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      
      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Convertir en blob puis en File
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        } else {
          resolve(file) // Fallback vers le fichier original
        }
      }, 'image/jpeg', quality)
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Storage local sécurisé
 */
export const storage = {
  get: (key: string) => {
    if (typeof window === 'undefined') return null
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  
  set: (key: string, value: any) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Erreur sauvegarde localStorage:', error)
    }
  },
  
  remove: (key: string) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Erreur suppression localStorage:', error)
    }
  }
}