const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

export function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseUrl(trimmed);
  if (!parsed) {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    videoId = pathParts[0] ?? null;
  } else if (host.endsWith("youtube.com")) {
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.pathname === "/watch" || pathParts[0] === "watch") {
      videoId = parsed.searchParams.get("v");
    } else if (pathParts.length >= 2 && (pathParts[0] === "shorts" || pathParts[0] === "embed")) {
      videoId = pathParts[1];
    }
  }

  if (!videoId || !VIDEO_ID_RE.test(videoId)) {
    return null;
  }
  return videoId;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}
