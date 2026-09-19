export function newId(): string {
  return crypto.randomUUID();
}

export function validIdempotency(key: unknown): string | null {
  if (typeof key !== "string") return null;
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(key)) return null;
  return key;
}
