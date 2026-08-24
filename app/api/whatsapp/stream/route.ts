import type { RealtimeChannel } from "@supabase/supabase-js";
import { requireApiUser } from "@/lib/auth/supabase";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { canManageBusiness } from "@/lib/whatsapp/store";
import { createWhatsAppRealtimeClient } from "@/lib/whatsapp/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uuid(value: unknown) {
  const id = clean(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : "";
}

function recordId(record: unknown, field: string) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return "";
  }
  return uuid((record as Record<string, unknown>)[field]);
}

function eventData(businessId: string, conversationId?: string) {
  return JSON.stringify({
    businessId,
    ...(conversationId ? { conversationId } : {}),
  });
}

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }

  if (!getWhatsAppConfig().enabled) {
    return new Response("Not found", {
      status: 404,
      headers: NO_STORE_HEADERS,
    });
  }

  const businessId = uuid(new URL(request.url).searchParams.get("businessId"));
  if (!businessId) {
    return new Response("Invalid business", {
      status: 400,
      headers: NO_STORE_HEADERS,
    });
  }

  try {
    if (!await canManageBusiness(user.id, businessId)) {
      return new Response("Forbidden", {
        status: 403,
        headers: NO_STORE_HEADERS,
      });
    }

    const realtime = createWhatsAppRealtimeClient();
    const encoder = new TextEncoder();
    let channel: RealtimeChannel | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (value: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(value));
          } catch {
            closed = true;
          }
        };

        const sendStatus = (status: "connected" | "reconnecting") => {
          send(`event: whatsapp-stream\ndata: ${JSON.stringify({ status })}\n\n`);
        };

        const close = () => {
          if (closed) return;
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          request.signal.removeEventListener("abort", close);
          if (channel) void realtime.removeChannel(channel);
          try {
            controller.close();
          } catch {
            // The client may already have closed the stream.
          }
        };

        request.signal.addEventListener("abort", close, { once: true });
        send(": connected\n\n");
        heartbeat = setInterval(() => send(": heartbeat\n\n"), 15_000);

        channel = realtime
          .channel(`progy-whatsapp-${businessId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "whatsapp_messages",
              filter: `business_id=eq.${businessId}`,
            },
            (payload) => {
              const conversationId = recordId(
                payload.new,
                "conversation_id",
              ) || recordId(payload.old, "conversation_id");
              send(
                `event: whatsapp-update\ndata: ${eventData(
                  businessId,
                  conversationId,
                )}\n\n`,
              );
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "conversations",
              filter: `business_id=eq.${businessId}`,
            },
            (payload) => {
              const conversationId = recordId(payload.new, "id") ||
                recordId(payload.old, "id");
              send(
                `event: whatsapp-update\ndata: ${eventData(
                  businessId,
                  conversationId,
                )}\n\n`,
              );
            },
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              sendStatus("connected");
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              sendStatus("reconnecting");
            }
          });
      },
      cancel() {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (channel) void realtime.removeChannel(channel);
      },
    });

    return new Response(stream, {
      headers: {
        ...NO_STORE_HEADERS,
        "Content-Type": "text/event-stream; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Progy WhatsApp stream setup failed", error);
    return new Response("Unable to open stream", {
      status: 503,
      headers: NO_STORE_HEADERS,
    });
  }
}
