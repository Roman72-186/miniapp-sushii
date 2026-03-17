// src/utils/phone.js — Нормализация телефонных номеров

/**
 * Нормализует телефон к формату 7XXXXXXXXXX (без плюса)
 */
export function normalizePhone(raw) {
  const nums = raw.replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums;
}
