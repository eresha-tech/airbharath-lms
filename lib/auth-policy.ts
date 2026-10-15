export function hasConfiguredValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isOtpVerificationSuccessful(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  const response = data as Record<string, unknown>;
  if (String(response.status).toLowerCase() === 'success') return true;
  if (response.verified === true) return true;
  if (response.type === 'success') return true;

  if (typeof response.message === 'string') {
    return new Set(['otp verified', 'verification successful', 'success']).has(
      response.message.toLowerCase(),
    );
  }

  return false;
}

export function newUserValues(phone: string) {
  return {
    phone,
    fullName: '',
    role: 'student' as const,
  };
}

export function sessionRoleFromPersistedRole(role: unknown): 'admin' | 'student' {
  return role === 'admin' ? 'admin' : 'student';
}
