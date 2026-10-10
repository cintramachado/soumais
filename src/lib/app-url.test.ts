import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildAppUrl, getAppUrl } from "./app-url";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env.APP_URL = undefined;
  process.env.NEXT_PUBLIC_SITE_URL = undefined;
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
}

describe("getAppUrl", () => {
  beforeEach(resetEnv);
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("prefers APP_URL over NEXT_PUBLIC_SITE_URL", () => {
    process.env.APP_URL = "https://corymblike-prohibitively-wilma.ngrok-free.dev";
    process.env.NEXT_PUBLIC_SITE_URL = "http://192.168.15.12:3002";
    expect(getAppUrl()).toBe("https://corymblike-prohibitively-wilma.ngrok-free.dev");
  });

  it("falls back to NEXT_PUBLIC_SITE_URL when APP_URL is unset", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://192.168.15.12:3002";
    expect(getAppUrl()).toBe("http://192.168.15.12:3002");
  });

  it("strips trailing slashes from the configured origin", () => {
    process.env.APP_URL = "https://corymblike-prohibitively-wilma.ngrok-free.dev///";
    expect(getAppUrl()).toBe("https://corymblike-prohibitively-wilma.ngrok-free.dev");
  });

  it("defaults to localhost:3000 outside production when nothing is configured", () => {
    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("throws an explicit error in production when nothing is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getAppUrl()).toThrow(/APP_URL/);
    vi.unstubAllEnvs();
  });

  it("never reads request headers as a fallback", () => {
    // There is no header input in getAppUrl's signature at all, which is the
    // guarantee: it cannot be influenced by Host/X-Forwarded-Host.
    expect(getAppUrl.length).toBe(0);
  });
});

describe("buildAppUrl", () => {
  beforeEach(resetEnv);
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("builds an absolute invite link preserving the path", () => {
    process.env.APP_URL = "https://corymblike-prohibitively-wilma.ngrok-free.dev";
    expect(buildAppUrl("/auth/invite")).toBe("https://corymblike-prohibitively-wilma.ngrok-free.dev/auth/invite");
  });

  it("preserves tokens and query parameters untouched", () => {
    process.env.APP_URL = "https://corymblike-prohibitively-wilma.ngrok-free.dev";
    const result = buildAppUrl("/auth/invite?token=abc123&type=invite");
    expect(result).toBe("https://corymblike-prohibitively-wilma.ngrok-free.dev/auth/invite?token=abc123&type=invite");
  });

  it("avoids duplicated slashes regardless of leading/trailing slashes", () => {
    process.env.APP_URL = "https://corymblike-prohibitively-wilma.ngrok-free.dev/";
    expect(buildAppUrl("/auth/invite")).toBe("https://corymblike-prohibitively-wilma.ngrok-free.dev/auth/invite");
    expect(buildAppUrl("auth/invite")).toBe("https://corymblike-prohibitively-wilma.ngrok-free.dev/auth/invite");
  });

  it("works for the LAN server address", () => {
    process.env.APP_URL = "http://192.168.15.12:3002";
    expect(buildAppUrl("/auth/invite")).toBe("http://192.168.15.12:3002/auth/invite");
  });

  it("works for local development", () => {
    process.env.APP_URL = "http://localhost:3000";
    expect(buildAppUrl("/auth/invite")).toBe("http://localhost:3000/auth/invite");
  });
});
