export const POSTGREST_TRANSIENT_JWT_CODE = "PGRST303";
export const POSTGREST_RETRY_DELAYS_MS = [400, 1_000] as const;

type PostgrestAttempt<T> = {
  value: T;
  status: number;
  code: string | null;
};

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function retryTransientPostgrestJwt<T>(
  request: () => Promise<PostgrestAttempt<T>>,
  delays: readonly number[] = POSTGREST_RETRY_DELAYS_MS,
) {
  let attempt = await request();

  for (const delay of delays) {
    if (attempt.status !== 401 || attempt.code !== POSTGREST_TRANSIENT_JWT_CODE) return attempt.value;
    await wait(delay);
    attempt = await request();
  }

  return attempt.value;
}
