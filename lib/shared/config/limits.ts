const DEFAULT_MAX_PAYLOAD_MB = 4;
const MIN_MAX_PAYLOAD_MB = 0.25;
const MAX_MAX_PAYLOAD_MB = 100;
const BASE64_RESPONSE_OVERHEAD_BYTES = 64 * 1024;

export function resolveMaxPayloadMegabytes(value: string | undefined) {
  const configured = Number(value);
  if (!Number.isFinite(configured) || configured < MIN_MAX_PAYLOAD_MB || configured > MAX_MAX_PAYLOAD_MB) {
    return DEFAULT_MAX_PAYLOAD_MB;
  }
  return Math.round(configured * 100) / 100;
}

export const MAX_PAYLOAD_MB = resolveMaxPayloadMegabytes(process.env.NEXT_PUBLIC_PROGY_MAX_PAYLOAD_MB);
export const MAX_PAYLOAD_BYTES = Math.floor(MAX_PAYLOAD_MB * 1024 * 1024);
export const MAX_BASE64_SOURCE_BYTES = Math.max(
  0,
  Math.floor((MAX_PAYLOAD_BYTES - BASE64_RESPONSE_OVERHEAD_BYTES) * 0.75),
);

export function exceedsPayloadLimit(size: number) {
  return !Number.isFinite(size) || size < 0 || size > MAX_PAYLOAD_BYTES;
}

export function exceedsBase64SourceLimit(size: number) {
  return !Number.isFinite(size) || size < 0 || size > MAX_BASE64_SOURCE_BYTES;
}
