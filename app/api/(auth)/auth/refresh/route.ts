import { refreshSupabaseSession } from "@/lib/server/auth/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const refreshed = await refreshSupabaseSession();

    if (!refreshed) {
      return Response.json(
        {
          ok: false,
          error: "No se pudo renovar la sesión.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

    return Response.json(
      {
        ok: true,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Progy auth refresh exception:", error);

    return Response.json(
      {
        ok: false,
        error: "No pudimos renovar la sesión.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }
}
