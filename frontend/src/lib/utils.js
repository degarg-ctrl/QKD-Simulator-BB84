import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names with Tailwind CSS conflict resolution.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 * 
 * @param {...any} inputs - Class names, objects, or arrays
 * @returns {string} Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
