export function generateUuid(): string {
  const cryptoModule = crypto as Crypto | undefined;

  if (cryptoModule?.randomUUID) {
    return cryptoModule.randomUUID();
  }

  throw new Error("Failed to generate a random UUID.");
}

export function validateUuid(id: string): boolean {
  return !(
    typeof id !== "string" ||
    !/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i.test(
      id,
    )
  );
}
