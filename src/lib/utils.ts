import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Primeiro nome para saudações ("Ana Souza" → "Ana"). */
export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

/** Iniciais do primeiro e do último nome ("Ana Souza" → "AS"). */
export function getFirstAndLastLetter(name: string) {
  const words = name
    .trim()
    .split(' ')
    .filter((word) => word.length > 0);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0][0].toUpperCase();
  return `${words[0][0].toUpperCase()}${words[
    words.length - 1
  ][0].toUpperCase()}`;
}

/**
 * Máscara de telefone brasileiro enquanto digita: "(48) 99999-0000" ou
 * "(48) 3333-0000". Mantém "+" inicial para números internacionais e, nesse
 * caso, não formata. O resultado continua dentro do formato aceito pela API.
 */
export function formatPhone(value: string) {
  if (value.trim().startsWith('+')) return value.replace(/[^\d+ ()-]/g, '');
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (digits.length <= 2) return digits.length ? `(${ddd}` : '';
  const split = rest.length > 8 ? 5 : 4;
  const first = rest.slice(0, split);
  const last = rest.slice(split);
  return `(${ddd}) ${first}${last ? `-${last}` : ''}`;
}

/** Primeiro e último nome ("Ana Clara Souza" → "Ana Souza"); nomes curtos ficam inteiros. */
export function getFirstAndLastWord(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length <= 2) return name.trim();
  return `${words[0]} ${words[words.length - 1]}`;
}
