import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

let sdk: NodeSDK | undefined;

export function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_HOST) return;
  if (sdk) return;

  sdk = new NodeSDK({
    spanProcessors: [new LangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_HOST,
      timeout: 5,
    })],
  });
  sdk.start();
}
