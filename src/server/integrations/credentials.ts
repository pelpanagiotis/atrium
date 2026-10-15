import { decryptSecret, encryptSecret } from "../crypto/secrets";
import type { StoredCredential } from "./types";

export function sealCredential(credential: StoredCredential): string {
  return encryptSecret(JSON.stringify(credential));
}

export function openCredential(ciphertext: string | null): StoredCredential | null {
  if (!ciphertext) return null;
  const parsed = JSON.parse(decryptSecret(ciphertext)) as StoredCredential;
  if (!parsed.accessToken) throw new Error("Stored credential is incomplete");
  return parsed;
}

export function integrationView<T extends { credential_ciphertext?: string | null }>(
  row: T,
): Omit<T, "credential_ciphertext"> & { hasCredential: boolean } {
  const { credential_ciphertext, ...rest } = row;
  return { ...rest, hasCredential: Boolean(credential_ciphertext) };
}
