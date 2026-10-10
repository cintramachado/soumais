/**
 * Resolves the public base URL of the application (the address real users hit,
 * e.g. the ngrok tunnel or a future custom domain).
 *
 * Resolution order:
 * 1. `APP_URL` — preferred, server-only configuration.
 * 2. `NEXT_PUBLIC_SITE_URL` — kept for backward compatibility with existing
 *    deploy configs (compose files, CI) that already require this variable.
 * 3. `http://localhost:3000` — convenience default for local development only.
 *
 * Intentionally does NOT fall back to the `Host`/`X-Forwarded-Host` request
 * headers: those are controlled by whoever sends the HTTP request and must
 * never be trusted to build links that are emailed to users.
 *
 * In production, missing configuration throws instead of silently emitting a
 * broken/local link.
 */
export function getAppUrl(): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) return configured.replace(/\/+$/, '');

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'APP_URL (or NEXT_PUBLIC_SITE_URL) must be configured to generate public links in production.',
    );
  }

  return 'http://localhost:3000';
}

/**
 * Builds an absolute URL under the public application origin, preserving the
 * given path, query string and any other parts untouched.
 *
 * Uses the native `URL` API so the result never contains duplicated slashes
 * or other malformed segments, regardless of how `path` is formatted.
 */
export function buildAppUrl(path: string): string {
  return new URL(path, `${getAppUrl()}/`).toString();
}
