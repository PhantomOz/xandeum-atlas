const USER_HEADER_CANDIDATES = ["x-alert-user", "x-tenant-id", "x-user-id"] as const;
const USER_QUERY_KEYS = ["user", "tenant", "token"] as const;
const USER_PATTERN = /^[a-zA-Z0-9._:-]{3,64}$/;

export function resolveUserId(request: Request): string | null {
  for (const header of USER_HEADER_CANDIDATES) {
    const value = request.headers.get(header);
    const normalized = normalizeUserId(value);
    if (normalized) {
      return normalized;
    }
  }

  try {
    const url = new URL(request.url);
    for (const key of USER_QUERY_KEYS) {
      const normalized = normalizeUserId(url.searchParams.get(key));
      if (normalized) {
        return normalized;
      }
    }
  } catch {
    // Swallow URL parsing issues since we only use it as a fallback.
  }

  return null;
}

function normalizeUserId(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || !USER_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}
