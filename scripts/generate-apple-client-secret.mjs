import { createSign } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MAX_TTL_DAYS = 180;

function getEnv(name) {
  const value = process.env[name]?.trim();
  return value || null;
}

function requireEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parseTtlSeconds() {
  const rawValue = getEnv("APPLE_CLIENT_SECRET_TTL_DAYS") ?? String(MAX_TTL_DAYS);
  const days = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(days) || days < 1 || days > MAX_TTL_DAYS) {
    throw new Error(`APPLE_CLIENT_SECRET_TTL_DAYS must be between 1 and ${MAX_TTL_DAYS}`);
  }
  return days * 24 * 60 * 60;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function readDerLength(buffer, offset) {
  const first = buffer[offset];
  if (first < 0x80) {
    return { length: first, offset: offset + 1 };
  }

  const byteCount = first & 0x7f;
  if (byteCount < 1 || byteCount > 4) {
    throw new Error("Unsupported ECDSA signature length");
  }

  let length = 0;
  for (let index = 0; index < byteCount; index += 1) {
    length = (length << 8) | buffer[offset + 1 + index];
  }
  return { length, offset: offset + 1 + byteCount };
}

function readDerInteger(buffer, offset) {
  if (buffer[offset] !== 0x02) {
    throw new Error("Invalid ECDSA signature integer");
  }

  const parsedLength = readDerLength(buffer, offset + 1);
  const start = parsedLength.offset;
  const end = start + parsedLength.length;
  const integer = buffer.subarray(start, end);
  return { integer, offset: end };
}

function normalizeEcInteger(value) {
  let normalized = value;
  while (normalized.length > 0 && normalized[0] === 0) {
    normalized = normalized.subarray(1);
  }

  if (normalized.length > 32) {
    throw new Error("Invalid ECDSA signature integer length");
  }

  if (normalized.length === 32) {
    return normalized;
  }

  return Buffer.concat([Buffer.alloc(32 - normalized.length), normalized]);
}

function derSignatureToJose(signature) {
  if (signature[0] !== 0x30) {
    throw new Error("Invalid ECDSA signature sequence");
  }

  const parsedLength = readDerLength(signature, 1);
  const sequenceEnd = parsedLength.offset + parsedLength.length;
  const r = readDerInteger(signature, parsedLength.offset);
  const s = readDerInteger(signature, r.offset);
  if (s.offset !== sequenceEnd) {
    throw new Error("Invalid ECDSA signature payload");
  }

  return Buffer.concat([normalizeEcInteger(r.integer), normalizeEcInteger(s.integer)]).toString("base64url");
}

function signAppleClientSecret({ teamId, clientId, keyId, privateKey, ttlSeconds }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: "ES256",
    kid: keyId,
  };
  const payload = {
    iss: teamId,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signer = createSign("sha256");
  signer.update(signingInput);
  signer.end();
  const signature = derSignatureToJose(signer.sign(privateKey));
  return {
    token: `${signingInput}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

function run() {
  const teamId = requireEnv("APPLE_TEAM_ID");
  const clientId = requireEnv("APPLE_CLIENT_ID");
  const keyId = requireEnv("APPLE_KEY_ID");
  const privateKeyPath = path.resolve(requireEnv("APPLE_PRIVATE_KEY_PATH"));
  const privateKey = readFileSync(privateKeyPath, "utf8");
  const ttlSeconds = parseTtlSeconds();

  const { token, expiresAt } = signAppleClientSecret({
    teamId,
    clientId,
    keyId,
    privateKey,
    ttlSeconds,
  });

  const outputPath = getEnv("APPLE_CLIENT_SECRET_OUT");
  if (outputPath) {
    const resolvedOutputPath = path.resolve(outputPath);
    writeFileSync(resolvedOutputPath, `${token}\n`, { mode: 0o600 });
    chmodSync(resolvedOutputPath, 0o600);
    console.log(`Apple client secret written to ${resolvedOutputPath}`);
    console.log(`Expires at ${expiresAt}`);
    return;
  }

  if (getEnv("APPLE_CLIENT_SECRET_PRINT") !== "1") {
    throw new Error("APPLE_CLIENT_SECRET_OUT is required unless APPLE_CLIENT_SECRET_PRINT=1 is set");
  }

  console.log(token);
}

run();
