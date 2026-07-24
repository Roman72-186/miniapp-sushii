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

/**
 * Форматирует произвольные цифры телефона в маску +7 (XXX) XXX-XX-XX
 * по мере ввода (прогрессивно — работает и для неполного номера).
 */
export function formatPhoneDisplay(digitsRaw) {
  const d = String(digitsRaw || '').replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  const n = d.startsWith('8') ? '7' + d.slice(1) : d;
  if (n.length <= 1) return `+${n}`;
  if (n.length <= 4) return `+${n.slice(0, 1)} (${n.slice(1)}`;
  if (n.length <= 7) return `+${n.slice(0, 1)} (${n.slice(1, 4)}) ${n.slice(4)}`;
  if (n.length <= 9) return `+${n.slice(0, 1)} (${n.slice(1, 4)}) ${n.slice(4, 7)}-${n.slice(7)}`;
  return `+${n.slice(0, 1)} (${n.slice(1, 4)}) ${n.slice(4, 7)}-${n.slice(7, 9)}-${n.slice(9, 11)}`;
}
