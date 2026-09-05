import { NextResponse } from "next/server";
import { saveSupabaseSession } from "@/lib/server/auth/supabase";
import { integrationConfig } from "@/lib/server/config/env";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    };
    const { supabaseUrl, supabaseAnonKey } = integrationConfig();

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase todavía no está configurado." }, { status: 503 });
    }
    if (!body.accessToken || !body.refreshToken) {
      return NextResponse.json({ error: "Google no devolvió una sesión válida." }, { status: 400 });
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${body.accessToken}`,
      },
      cache: "no-store",
    });
    if (!userResponse.ok) {
      return NextResponse.json({ error: "No pudimos validar tu acceso con Google." }, { status: 401 });
    }

    await saveSupabaseSession({
      access_token: body.accessToken,
      refresh_token: body.refreshToken,
      expires_in: body.expiresIn,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No pudimos completar el acceso con Google." }, { status: 500 });
  }
}
