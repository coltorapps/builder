export function generateUuid(): string {
  const cryptoLike: unknown = globalThis?.crypto;

  if (
    typeof cryptoLike === "object" &&
    cryptoLike !== null &&
    "randomUUID" in cryptoLike &&
    typeof cryptoLike.randomUUID === "function"
  ) {
    const result = cryptoLike.randomUUID();

    if (typeof result === "string") {
      return result;
    }
  }

  throw new Error(
    "This environment does not support generating UUIDs with the Crypto module. Consider providing your own entity ID generation logic on the builder, or polyfilling the Crypto module.",
  );
}

export function validateUuid(id: string): boolean {
  return !(
    typeof id !== "string" ||
    !/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i.test(
      id,
    )
  );
}
