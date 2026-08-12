import { releaseEnvironmentStatus } from "../../../lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = releaseEnvironmentStatus();
  return Response.json(
    {
      status: status.ready ? "ok" : "degraded",
      checks: {
        core: status.coreReady,
        voice: status.voiceReady,
        messaging: status.messagingReady,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: status.ready ? 200 : 503,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
