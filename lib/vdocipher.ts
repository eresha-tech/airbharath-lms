export function extractVdoCipherVideoId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // If it's a 32-character hex/alphanumeric ID (VdoCipher default ID format)
  if (/^[a-f0-9]{32}$/i.test(trimmed)) {
    return trimmed;
  }

  // If it's an iframe embed code
  if (trimmed.startsWith("<")) {
    const idMatch = trimmed.match(/id=([a-f0-9]{32})/i);
    if (idMatch && idMatch[1]) return idMatch[1];
    
    const altMatch = trimmed.match(/video_id=([a-f0-9]{32})/i);
    if (altMatch && altMatch[1]) return altMatch[1];
  }

  // If it's a URL
  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get("id") || url.searchParams.get("video_id") || url.searchParams.get("videoId");
    if (id && /^[a-f0-9]{32}$/i.test(id)) return id;

    const parts = url.pathname.split("/");
    for (const part of parts) {
      if (/^[a-f0-9]{32}$/i.test(part)) return part;
    }
  } catch {
    // Ignore URL parse error
  }

  return trimmed;
}

export async function getVdoCipherOtp(videoId: string, userEmail: string) {
  const API_SECRET = process.env.VDOCIPHER_API_SECRET;
  if (!API_SECRET) {
    console.error("VDOCIPHER_API_SECRET is not configured in .env file.");
    return null;
  }

  const cleanVideoId = extractVdoCipherVideoId(videoId);
  if (!cleanVideoId) {
    console.error("Invalid VdoCipher videoId provided.");
    return null;
  }

  try {
    const response = await fetch(`https://dev.vdocipher.com/api/videos/${cleanVideoId}/otp`, {
      method: "POST",
      headers: {
        "Authorization": `Apisecret ${API_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ttl: 300,
        annotate: JSON.stringify([
          {
            type: "rtext",
            text: userEmail,
            alpha: "0.20",
            color: "0xFFFFFF",
            size: "14",
            interval: "5000",
          },
        ]),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("VdoCipher OTP endpoint responded with error:", errorText);
      return null;
    }

    const data = await response.json();
    return {
      otp: data.otp as string,
      playbackInfo: data.playbackInfo as string,
    };
  } catch (error) {
    console.error("Error requesting VdoCipher OTP:", error);
    return null;
  }
}
