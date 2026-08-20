import React from 'react';

/**
 * Bloquear caracteres especiais em inputs numéricos inteiros
 * Bloqueia: e, E, +, -, ., ,
 */
export const handleIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
    e.preventDefault();
  }
};

/**
 * Bloquear caracteres especiais em inputs decimais (permite vírgula)
 * Bloqueia: e, E, +, -, .
 */
export const handleDecimalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.'].includes(e.key)) {
    e.preventDefault();
  }
};

/**
 * Sanitizar input para apenas números inteiros
 */
export const sanitizeInteger = (value: string): string => {
  return value.replace(/[^0-9]/g, '');
};

/**
 * Sanitizar input para números decimais com vírgula
 * Permite apenas um vírgula
 */
export const sanitizeDecimal = (value: string): string => {
  const sanitized = value.replace(/[^0-9,]/g, '');
  // Allow only one comma
  const parts = sanitized.split(',');
  return parts.length > 2 
    ? parts[0] + ',' + parts.slice(1).join('')
    : sanitized;
};

export const parseLocaleNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
};

export const parseLocaleInteger = (value: string): number | null => {
  const number = parseLocaleNumber(value);
  return number === null ? null : Math.round(number);
};
