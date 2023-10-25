import cryptoNative from "node:crypto";

export function generateUuid(): string {
  const generator = cryptoNative.randomUUID ?? (() => crypto.randomUUID());

  if (!generator) {
    throw new Error('The "crypto" module is not supported.');
  }

  return generator();
}

export function validateUuid(id: string): void {
  if (
    typeof id !== "string" ||
    !/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i.test(
      id,
    )
  ) {
    throw new Error(`The entity id '${id}' is invalid.`);
  }
}
