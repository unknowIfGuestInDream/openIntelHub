export function withEnv(
  env: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
): void | Promise<void> {
  const orig: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    orig[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  const restore = () => {
    for (const k of Object.keys(orig)) {
      if (orig[k] === undefined) delete process.env[k];
      else process.env[k] = orig[k];
    }
  };
  let result: void | Promise<void>;
  try {
    result = fn();
  } catch (err) {
    restore();
    throw err;
  }
  if (result instanceof Promise) {
    return result.finally(restore);
  }
  restore();
}
