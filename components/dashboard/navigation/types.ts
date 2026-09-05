import type { DashboardIconName } from "../types/icons";

export type DashboardSectionId =
  | "inicio"
  | "negocio"
  | "progy"
  | "catalogo"
  | "conocimiento"
  | "whatsapp"
  | "pruebas"
  | "conversaciones"
  | "pedidos"
  | "consumo"
  | "ajustes";

export type ProgyTab = "personalidad" | "voz";

export type NavigationItemId =
  | "inicio"
  | "conversaciones"
  | "contactos"
  | "oportunidades"
  | "agenda"
  | "resultados"
  | "conocimiento"
  | "personalidad"
  | "pruebas"
  | "whatsapp"
  | "uso-plan"
  | "configuracion";

export type NavigationGroupId = "operacion" | "progy" | "canales" | "cuenta";

export type NavigationStatus = "connected" | "attention";

export type NavigationBadge = {
  value: string | number;
  label?: string;
  tone?: "neutral" | "success" | "attention";
};

export type NavigationItem = {
  readonly id: NavigationItemId;
  readonly label: string;
  readonly href: string;
  readonly icon: DashboardIconName;
  readonly badge?: NavigationBadge;
  readonly status?: NavigationStatus;
};

export type NavigationGroup = {
  readonly id: NavigationGroupId;
  readonly label: string;
  readonly items: readonly NavigationItem[];
};
