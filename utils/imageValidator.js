// ==========================================
// Trusted Image Provider Whitelist & Validator
// ==========================================
export const DEFAULT_TRUSTED_IMAGE_HOSTS = [
  "images.unsplash.com",
  "res.cloudinary.com",
  "images.pexels.com",
  "i.imgur.com",
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
];

export function getTrustedImageHosts() {
  if (process.env.ALLOWED_IMAGE_HOSTS) {
    const custom = process.env.ALLOWED_IMAGE_HOSTS.split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (custom.length > 0) return custom;
  }
  return DEFAULT_TRUSTED_IMAGE_HOSTS;
}

export function validateImageUrl(url) {
  if (!url || typeof url !== "string" || !url.trim()) {
    return {
      isValid: false,
      error: "Thumbnail image URL is required.",
    };
  }

  const trimmed = url.trim();

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      error: "Malformed image URL. Please provide a valid, well-formed URL.",
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      isValid: false,
      error: "Insecure image URL: Only HTTPS image URLs are permitted.",
    };
  }

  const trustedHosts = getTrustedImageHosts();
  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = trustedHosts.some(
    (allowed) =>
      hostname === allowed.toLowerCase() ||
      hostname.endsWith(`.${allowed.toLowerCase()}`)
  );

  if (!isAllowed) {
    return {
      isValid: false,
      error: `Unsupported image provider '${hostname}'. Only trusted image providers (${trustedHosts.join(
        ", "
      )}) are permitted.`,
    };
  }

  return { isValid: true, sanitizedUrl: parsed.toString() };
}

