import { NextResponse } from "next/server";
import { publicIntegrationStatus } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(publicIntegrationStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
