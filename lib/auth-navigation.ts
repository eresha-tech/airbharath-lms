/** Only same-origin relative return paths may cross an authentication boundary. */
export function safeCallbackPath(value: string | null | undefined): string | null {
  if (!value || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || /^\/[a-z0-9+.-]+:/i.test(path)) return null;
  try {
    const decoded = decodeURIComponent(path);
    if (decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return null;
    const url = new URL(path, 'https://callback.invalid');
    return url.origin === 'https://callback.invalid' ? url.pathname + url.search + url.hash : null;
  } catch { return null; }
}
