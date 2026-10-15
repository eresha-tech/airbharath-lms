// Shared mobile syntax only; OTP/provider/session policy remains server-owned.
export function normalizedIndianMobile(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[+\d\s()-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  else if (digits.length === 11 && digits.startsWith('0')) digits = '91' + digits.slice(1);
  return /^91[6-9]\d{9}$/.test(digits) ? digits : null;
}
