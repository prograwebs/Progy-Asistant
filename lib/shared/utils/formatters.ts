export function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "P";
}

export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

export function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(value));
}

export function completionPercent(options: { businessName?: string | null; hours: number; catalog: number; knowledge: number; voiceId?: string | null; greeting?: string | null }) {
  const checks = [Boolean(options.businessName?.trim()), options.hours >= 7, options.catalog > 0, options.knowledge > 0, Boolean(options.voiceId), Boolean(options.greeting?.trim())];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export const blueprint: Record<string, { catalog: string; singular: string; defaultKind: "product" | "service" }> = {
  restaurant: { catalog: "Menú y productos", singular: "producto o plato", defaultKind: "product" },
  clinic: { catalog: "Servicios y especialidades", singular: "servicio", defaultKind: "service" },
  hotel: { catalog: "Habitaciones y servicios", singular: "servicio", defaultKind: "service" },
  hardware_store: { catalog: "Productos y cotizaciones", singular: "producto", defaultKind: "product" },
  beauty_salon: { catalog: "Servicios y duración", singular: "servicio", defaultKind: "service" },
  retail_store: { catalog: "Productos y promociones", singular: "producto", defaultKind: "product" },
  professional_services: { catalog: "Servicios y tarifas", singular: "servicio", defaultKind: "service" },
  other: { catalog: "Productos o servicios", singular: "elemento", defaultKind: "service" },
};

export function businessBlueprint(code: string) {
  return blueprint[code] || blueprint.other;
}
