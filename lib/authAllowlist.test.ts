import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  allowedEmailDomains,
  emailDomain,
  isSignupDisabled,
  validateSignupEmail,
} from "./authAllowlist";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL };
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("emailDomain", () => {
  it("extrait le domaine", () => {
    expect(emailDomain("jean@idena.fr")).toBe("idena.fr");
  });
});

describe("allowedEmailDomains", () => {
  it("utilise idena.fr par défaut", () => {
    delete process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS;
    expect(allowedEmailDomains()).toEqual(["idena.fr"]);
  });

  it("parse une liste custom", () => {
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS = "IDENA.fr, Autre.com";
    expect(allowedEmailDomains()).toEqual(["idena.fr", "autre.com"]);
  });
});

describe("validateSignupEmail", () => {
  it("refuse un domaine externe", () => {
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS = "idena.fr";
    expect(validateSignupEmail("hack@gmail.com")).toMatch(/réservée/);
  });

  it("accepte un domaine autorisé", () => {
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS = "idena.fr";
    expect(validateSignupEmail("a@idena.fr")).toBeNull();
  });

  it("bloque si signup désactivé", () => {
    process.env.NEXT_PUBLIC_DISABLE_SIGNUP = "1";
    expect(validateSignupEmail("a@idena.fr")).toMatch(/désactivées/);
  });
});

describe("isSignupDisabled", () => {
  it("détecte true", () => {
    process.env.NEXT_PUBLIC_DISABLE_SIGNUP = "true";
    expect(isSignupDisabled()).toBe(true);
  });
});
