import { describe, expect, it } from "vitest";

import { newPasswordSchema, recoverySchema, signInSchema } from "./auth";

describe("authentication schemas", () => {
  it("accepts valid login credentials", () => {
    expect(signInSchema.safeParse({ email: "student@example.com", password: "secret" }).success).toBe(true);
  });

  it("rejects malformed email and missing password", () => {
    expect(signInSchema.safeParse({ email: "invalid", password: "" }).success).toBe(false);
  });

  it("requires a valid email for password recovery", () => {
    expect(recoverySchema.safeParse({ email: "guardian@example.com" }).success).toBe(true);
    expect(recoverySchema.safeParse({ email: "invalid" }).success).toBe(false);
  });

  it("requires a sufficiently long new password", () => {
    expect(newPasswordSchema.safeParse({ password: "12345678" }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: "short" }).success).toBe(false);
  });
});