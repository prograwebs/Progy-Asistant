import { DEFAULT_META_GRAPH_VERSION } from "./constants";

export function getWhatsAppConfig() {
  return {
    enabled: process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true",
    graphVersion:
      process.env.META_GRAPH_VERSION?.trim() ||
      process.env.NEXT_PUBLIC_META_GRAPH_VERSION?.trim() ||
      DEFAULT_META_GRAPH_VERSION,
    appId:
      process.env.META_APP_ID?.trim() ||
      process.env.NEXT_PUBLIC_META_APP_ID?.trim() ||
      "",
    appSecret: process.env.META_APP_SECRET?.trim() || "",
    configId: process.env.NEXT_PUBLIC_META_CONFIG_ID?.trim() || "",
    verifyToken: process.env.META_WHATSAPP_VERIFY_TOKEN?.trim() || "",
  };
}
