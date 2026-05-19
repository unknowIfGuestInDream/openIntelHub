export function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export function firstEnvOrDefault(names: string[], fallback: string): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return fallback;
}
