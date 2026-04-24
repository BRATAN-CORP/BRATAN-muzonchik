import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function clampInt(n: number, min: number, max: number): number {
  n = Math.floor(n)
  if (isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}
