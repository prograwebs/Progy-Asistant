export const DEFAULT_META_GRAPH_VERSION = "v25.0";

export const TEST_TEMPLATE_NAME = "progy_prueba_mensaje";
export const TEST_TEMPLATE_LANGUAGE = "es";
export const TEST_TEMPLATE_CATEGORY = "UTILITY";
export const TEST_TEMPLATE_BODY =
  "Hola, este es un mensaje de prueba enviado desde Progy mediante WhatsApp Business.";

export type WhatsAppTemplate = {
  id?: string | null;
  name?: string;
  language?: string;
  status?: string;
  category?: string;
};
