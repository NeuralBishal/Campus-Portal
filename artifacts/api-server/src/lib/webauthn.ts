import type { Request } from "express";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";

type ChallengeContext = {
  challenge: string;
  email: string;
  payload?: Record<string, unknown>;
  expiresAt: number;
};

const challenges = new Map<string, ChallengeContext>();
const fingerprintFailures = new Map<string, number>();

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_FINGERPRINT_FAILURES = 5;

function purge(): void {
  const now = Date.now();
  for (const [k, v] of challenges) if (v.expiresAt < now) challenges.delete(k);
}

export function rpInfo(req: Request): { rpID: string; origin: string; rpName: string } {
  const host = (req.get("x-forwarded-host") || req.get("host") || "localhost").split(",")[0]!.trim();
  const rpID = host.split(":")[0]!;
  const proto = (req.get("x-forwarded-proto") || "https").split(",")[0]!.trim();
  return { rpID, origin: `${proto}://${host}`, rpName: "Campus Portal" };
}

export function storeChallenge(challenge: string, email: string, payload?: Record<string, unknown>): string {
  purge();
  challenges.set(challenge, { challenge, email, payload, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  return challenge;
}

export function consumeChallenge(challenge: string): ChallengeContext | null {
  purge();
  const c = challenges.get(challenge);
  if (!c) return null;
  challenges.delete(challenge);
  return c;
}

export async function buildRegistrationOptions(
  req: Request,
  opts: { userID: string; userName: string; userDisplayName: string; email: string },
): Promise<Awaited<ReturnType<typeof generateRegistrationOptions>>> {
  const { rpID, rpName } = rpInfo(req);
  const userIdBuffer = new TextEncoder().encode(opts.userID);
  const config: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userID: userIdBuffer,
    userName: opts.userName,
    userDisplayName: opts.userDisplayName,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  };
  const options = await generateRegistrationOptions(config);
  storeChallenge(options.challenge, opts.email, { kind: "register", userID: opts.userID });
  return options;
}

export async function verifyRegistration(
  req: Request,
  attestation: any,
  expectedChallenge: string,
): Promise<VerifiedRegistrationResponse> {
  const { rpID, origin } = rpInfo(req);
  return verifyRegistrationResponse({
    response: attestation,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
}

export async function buildAuthenticationOptions(
  req: Request,
  opts: { email: string; allowCredentials: { id: string; transports?: string[] }[] },
): Promise<Awaited<ReturnType<typeof generateAuthenticationOptions>>> {
  const { rpID } = rpInfo(req);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: opts.allowCredentials.map((c) => ({
      id: c.id,
      transports: c.transports as any,
    })),
  });
  storeChallenge(options.challenge, opts.email, { kind: "auth" });
  return options;
}

export async function verifyAuthentication(
  req: Request,
  assertion: any,
  expectedChallenge: string,
  credential: { id: string; publicKey: string; counter: number },
): Promise<VerifiedAuthenticationResponse> {
  const { rpID, origin } = rpInfo(req);
  return verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey, "base64"),
      counter: credential.counter,
    },
  });
}

export function recordFingerprintFailure(email: string): number {
  const next = (fingerprintFailures.get(email) ?? 0) + 1;
  fingerprintFailures.set(email, next);
  return next;
}

export function getFingerprintFailures(email: string): number {
  return fingerprintFailures.get(email) ?? 0;
}

export function clearFingerprintFailures(email: string): void {
  fingerprintFailures.delete(email);
}

export function isFallbackUnlocked(email: string): boolean {
  return getFingerprintFailures(email) >= MAX_FINGERPRINT_FAILURES;
}

export const FINGERPRINT_LOCKOUT_THRESHOLD = MAX_FINGERPRINT_FAILURES;
