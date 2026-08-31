import crypto from 'crypto';

export function extractVideoUrl(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.startsWith('<')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  return trimmed;
}

export function getGumletSignedUrl(inputUrl: string) {
  const GUMLET_TOKEN = process.env.GUMLET_TOKEN;
  const videoUrl = extractVideoUrl(inputUrl);
  
  if (!videoUrl) return "";
  if (!GUMLET_TOKEN) return videoUrl;

  try {
    const url = new URL(videoUrl);
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiry
    const path = url.pathname;
    
    const strToSign = `${GUMLET_TOKEN}${path}${expires}`;
    const hash = crypto.createHash('md5').update(strToSign).digest('hex');

    url.searchParams.set('expires', expires.toString());
    url.searchParams.set('token', hash);

    return url.toString();
  } catch {
    return videoUrl;
  }
}
