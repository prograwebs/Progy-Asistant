import { NextResponse } from "next/server";
import { integrationConfig, progyAuthCallbackUrl } from "../../../../lib/integrations";

export async function GET() {
  const { supabaseUrl } = integrationConfig();
  if (!supabaseUrl) {
    return NextResponse.redirect(new URL("/acceso?mode=login&error=Supabase%20todav%C3%ADa%20no%20est%C3%A1%20configurado.", progyAuthCallbackUrl()));
  }

  const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set("provider", "google");
  authorizeUrl.searchParams.set("redirect_to", progyAuthCallbackUrl());

  return NextResponse.redirect(authorizeUrl);
}
