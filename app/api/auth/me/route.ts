import { NextResponse } from "next/server";
import { getSupabaseUser } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSupabaseUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ user });
}
