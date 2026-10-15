import {
  type CanonicalField,
  type CanonicalSnapshot,
  changedFields,
  fingerprintSnapshot,
} from "./fingerprint";

export type OwnershipMode = "native" | "external" | "hybrid";

export type InboundDecision =
  | { type: "skip_echo" }
  | { type: "apply" }
  | { type: "conflict"; fields: CanonicalField[] };

export function authoritativeSide(mode: OwnershipMode): "admin" | "provider" {
  if (mode === "external") return "provider";
  if (mode === "native") return "admin";
  throw new Error("Hybrid ownership is reserved and is not enabled");
}

/**
 * Field authority is explicit. External projects accept provider values unless
 * an outbound edit for those fields is still in flight. Native projects keep
 * the admin value and open a conflict instead of last-write-wins.
 */
export function decideInbound(input: {
  ownership: OwnershipMode;
  projection: CanonicalSnapshot;
  incoming: CanonicalSnapshot;
  pendingOutboundFields: CanonicalField[];
  recentOutboundFingerprints: string[];
}): InboundDecision {
  authoritativeSide(input.ownership);
  const incomingFingerprint = fingerprintSnapshot(input.incoming);
  if (input.recentOutboundFingerprints.includes(incomingFingerprint)) {
    return { type: "skip_echo" };
  }
  const drifted = changedFields(input.projection, input.incoming);
  if (drifted.length === 0) return { type: "skip_echo" };
  if (input.ownership === "external") {
    const contested = drifted.filter((field) => input.pendingOutboundFields.includes(field));
    if (contested.length > 0) return { type: "conflict", fields: contested };
    return { type: "apply" };
  }
  return { type: "conflict", fields: drifted };
}
