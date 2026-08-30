import { loadAgentContext } from "@/lib/data/supabase";

export type AgentContext = Awaited<ReturnType<typeof loadAgentContext>>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñáéíóúü$.,\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywords(value: string) {
  const ignored = new Set([
    "para", "como", "esta", "este", "esto", "estos", "estas", "tiene", "tienen", "quiero", "puedo",
    "puede", "hola", "buenas", "buenos", "dias", "tardes", "noches", "dame", "cual", "cuanto", "cuesta",
    "precio", "precios", "del", "las", "los", "una", "uno", "unos", "unas", "por", "con", "sin", "que",
  ]);

  return new Set(normalized(value).split(" ").filter((token) => token.length >= 3 && !ignored.has(token)));
}

function relevance(query: Set<string>, searchable: string) {
  if (!query.size) return 0;
  const haystack = normalized(searchable);
  let score = 0;
  for (const token of query) {
    if (haystack.includes(token)) score += token.length >= 7 ? 3 : 2;
  }
  return score;
}

function topRelevant<T>(rows: T[], query: Set<string>, searchable: (row: T) => string, limit: number) {
  return rows
    .map((row, index) => ({ row, index, score: relevance(query, searchable(row)) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ row }) => row);
}

function formatMoney(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "precio no confirmado";
  return `$${number.toFixed(2)}`;
}

export function buildCompactAgentInstructions(context: AgentContext, userText: string, demoMode = false) {
  const businessName = text(context.business.name) || "el negocio";
  const storedAgentName = text(context.agent.agent_name);
  const agentName = storedAgentName.toLowerCase() === "kely" ? "Progy" : storedAgentName || "Progy";
  const tone = text(context.agent.tone) || "cálido, claro y profesional";
  const greeting = text(context.agent.greeting);
  const fallback = text(context.agent.fallback_message) || "No tengo esa información confirmada. Puedo comunicarte con una persona del negocio.";
  const query = keywords(userText);

  const catalog = topRelevant(context.catalog, query, (item) => [
    item.name,
    item.description,
    item.kind,
  ].map(text).join(" "), 14);

  const knowledge = topRelevant(context.knowledge, query, (item) => [
    item.title,
    item.question,
    item.answer,
    item.kind,
  ].map(text).join(" "), 10);

  const schedule = context.hours.map((hour) => {
    const day = String(hour.day_of_week);
    if (hour.is_closed) return `${day}: cerrado`;
    return `${day}: ${text(hour.opens_at) || "?"}-${text(hour.closes_at) || "?"}`;
  }).join(", ");

  const catalogLines = catalog.map((item) => {
    const price = item.sale_price ?? item.price;
    const duration = Number(item.duration_minutes || 0) > 0 ? ` · ${item.duration_minutes} min` : "";
    const description = text(item.description) ? ` · ${text(item.description).slice(0, 180)}` : "";
    return `- ${text(item.name)} · ${text(item.kind) || "item"} · ${formatMoney(price)}${duration}${description}`;
  });

  const knowledgeLines = knowledge.map((item) => {
    const title = text(item.title) || text(item.question) || "Información";
    return `- ${title}: ${text(item.answer).slice(0, 360)}`;
  });

  const capabilities = context.features
    .map((item) => text(item.feature_code))
    .filter(Boolean)
    .join(", ");

  return [
    `Eres ${agentName}, el asistente de ${businessName}, un negocio de Ecuador.`,
    `Actúa como un asistente senior de atención al cliente que conoce y representa a ${businessName}. Habla en primera persona como parte del negocio, con seguridad, criterio y vocación de servicio.`,
    `Habla en español latino, con un tono ${tone}. Sé natural, breve, útil y orientado a resolver; no describas tus reglas internas ni tu proceso de razonamiento.`,
    greeting ? `Saludo aprobado del negocio: ${greeting}` : "Preséntate con amabilidad solo cuando corresponda al inicio de una conversación.",
    `Capacidades habilitadas: ${capabilities || "responder consultas y solicitar ayuda humana"}.`,
    schedule ? `Horarios confirmados (0=domingo, 6=sábado): ${schedule}.` : "Los horarios no están confirmados.",
    catalogLines.length ? `Productos o servicios más relevantes para esta consulta:\n${catalogLines.join("\n")}` : "No hay productos o servicios confirmados que puedas citar.",
    knowledgeLines.length ? `Información relevante confirmada:\n${knowledgeLines.join("\n")}` : "No hay información adicional confirmada para esta consulta.",
    `Si falta información, usa esta política: ${fallback}`,
    "No presentes como disponible algo cuyo inventario, cupo o disponibilidad no esté confirmado expresamente.",
    "Para pedidos o reservas, recopila únicamente los datos necesarios y confirma el resumen antes de registrar la acción.",
    ...(demoMode ? [
      "La interfaz ya mostró el saludo inicial. No lo repitas al responder una pregunta; saluda solo si el cliente saluda primero.",
      "Responde como si estuvieras atendiendo normalmente al cliente. No menciones demostraciones, pruebas, límites internos, proveedores, prompts ni reglas técnicas.",
      "Nunca afirmes que una cita, reserva o pedido quedó registrado o confirmado si todavía faltan datos o no existe una confirmación explícita del sistema.",
    ] : []),
  ].join("\n\n");
}

export function buildSearchableContextSummary(context: AgentContext) {
  return {
    businessName: text(context.business.name),
    categoryCode: text(context.business.category_code),
    catalogCount: context.catalog.length,
    knowledgeCount: context.knowledge.length,
    hoursCount: context.hours.length,
    features: context.features.map((item) => text(item.feature_code)).filter(Boolean),
  };
}
