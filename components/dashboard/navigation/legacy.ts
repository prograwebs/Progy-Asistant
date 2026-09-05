import type { DashboardSectionId, ProgyTab } from "./types";

export const dashboardHeaders: Record<DashboardSectionId, string> = {
  inicio: "Inicio",
  negocio: "Negocio",
  progy: "Personalidad y voz",
  catalogo: "Catálogo",
  conocimiento: "Información y respuestas",
  whatsapp: "WhatsApp",
  pruebas: "Pruebas",
  conversaciones: "Conversaciones",
  pedidos: "Resultados",
  consumo: "Uso y plan",
  ajustes: "Configuración",
};

export function resolveDashboardNavigation(next: string): { section: DashboardSectionId; progyTab?: ProgyTab } {
  if (next === "asistente" || next === "personalidad" || next === "progy") {
    return { section: "progy", progyTab: "personalidad" };
  }
  if (next === "voz") return { section: "progy", progyTab: "voz" };
  if (next === "resultados") return { section: "pedidos" };
  if (next in dashboardHeaders) return { section: next as DashboardSectionId };
  return { section: "inicio" };
}

export function planLabel(code?: string | null): string {
  const normalized = String(code || "trial").toLowerCase().replaceAll("-", "_");
  if (["trial", "free_trial", "free"].includes(normalized)) return "Prueba";
  if (normalized === "business") return "Negocio";
  if (normalized === "starter") return "Starter";
  if (normalized === "pro") return "Pro";
  return code || "Prueba";
}
