import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthCallbackUrl,
  buildEmailConfirmationRedirectUrl,
  buildNativeAuthCallbackUrl,
  buildPasswordResetRedirectUrl,
  isNativeAuthCallbackUrl,
  normalizeAuthNextPath,
} from "../lib/auth-redirect.ts";

test("keeps safe internal OAuth redirect paths", () => {
  assert.equal(normalizeAuthNextPath("/fridge?tab=cold#top"), "/fridge?tab=cold#top");
});

test("rejects protocol-relative OAuth redirect paths", () => {
  assert.equal(normalizeAuthNextPath("//evil.example/phish"), "/mypage");
});

test("rejects missing or external OAuth redirect paths", () => {
  assert.equal(normalizeAuthNextPath(null), "/mypage");
  assert.equal(normalizeAuthNextPath("https://evil.example/phish"), "/mypage");
});

test("builds OAuth callback URLs with normalized app-local next paths", () => {
  assert.equal(
    buildAuthCallbackUrl("https://jipbab-note-app.vercel.app", "/fridge?add=1"),
    "https://jipbab-note-app.vercel.app/auth/callback?next=%2Ffridge%3Fadd%3D1",
  );

  assert.equal(
    buildAuthCallbackUrl("https://jipbab-note-app.vercel.app", "https://evil.example/phish"),
    "https://jipbab-note-app.vercel.app/auth/callback?next=%2Fmypage",
  );
});

test("builds native OAuth callback URLs with normalized app-local next paths", () => {
  assert.equal(
    buildNativeAuthCallbackUrl("/fridge?add=1"),
    "com.jipbab.note://auth/callback?next=%2Ffridge%3Fadd%3D1",
  );

  assert.equal(
    buildNativeAuthCallbackUrl("https://evil.example/phish"),
    "com.jipbab.note://auth/callback?next=%2Fmypage",
  );
});

test("recognizes only the app native OAuth callback URL", () => {
  assert.equal(isNativeAuthCallbackUrl("com.jipbab.note://auth/callback?code=abc"), true);
  assert.equal(isNativeAuthCallbackUrl("com.jipbab.note://auth/wrong?code=abc"), false);
  assert.equal(isNativeAuthCallbackUrl("https://jipbab-note-app.vercel.app/auth/callback?code=abc"), false);
  assert.equal(isNativeAuthCallbackUrl("not a url"), false);
});

test("builds email confirmation redirects to login instead of the PKCE callback", () => {
  assert.equal(
    buildEmailConfirmationRedirectUrl("https://jipbab-note-app.vercel.app"),
    "https://jipbab-note-app.vercel.app/login?verified=email",
  );
});

test("builds password reset redirects to the reset-password flow", () => {
  assert.equal(
    buildPasswordResetRedirectUrl("https://jipbab-note-app.vercel.app"),
    "https://jipbab-note-app.vercel.app/reset-password",
  );
});
