import type { DemoScenario, OnboardingCategory, OnboardingVoice } from "./types";

export const onboardingCategories: OnboardingCategory[] = [
  {
    code: "clinic",
    label: "Clínica",
    description: "Citas, horarios y consultas",
    icon: "clinic",
    capabilities: ["Responder consultas", "Informar precios", "Agendar citas"],
  },
  {
    code: "beauty_salon",
    label: "Salón de belleza",
    description: "Servicios, precios y citas",
    icon: "beautySalon",
    capabilities: ["Explicar servicios", "Informar precios", "Gestionar citas"],
  },
  {
    code: "hardware_store",
    label: "Ferretería",
    description: "Productos, precios y cotizaciones",
    icon: "hardwareStore",
    capabilities: ["Responder consultas", "Preparar cotizaciones", "Registrar pedidos"],
  },
  {
    code: "hotel",
    label: "Hotel",
    description: "Habitaciones y reservas",
    icon: "hotel",
    capabilities: ["Informar disponibilidad", "Explicar servicios", "Gestionar reservas"],
  },
  {
    code: "restaurant",
    label: "Restaurante",
    description: "Menú, pedidos y reservas",
    icon: "restaurant",
    capabilities: ["Responder consultas", "Tomar pedidos", "Reservar mesas"],
  },
  {
    code: "other",
    label: "Otro negocio",
    description: "Configura el flujo a tu medida",
    icon: "other",
    capabilities: ["Responder consultas", "Compartir información", "Registrar interesados"],
  },
];

export const onboardingVoices: OnboardingVoice[] = [
  {
    id: "valentina",
    name: "Valentina",
    description: "Cálida y cercana",
    tone: "Una voz amable para conversaciones naturales.",
  },
  {
    id: "mateo",
    name: "Mateo",
    description: "Claro y profesional",
    tone: "Una voz directa para atender con confianza.",
  },
];

const scenarios: Record<string, DemoScenario[]> = {
  clinic: [
    {
      id: "clinic-availability",
      prompt: "¿Tienen citas disponibles mañana?",
      reply: "Sí. Tenemos disponibilidad de ejemplo mañana por la mañana y por la tarde. ¿Qué horario prefieres?",
      followUp: "En la tarde.",
      followUpReply: "Perfecto. Para registrar la cita necesitaría tu nombre y un teléfono de contacto.",
    },
    {
      id: "clinic-price",
      prompt: "¿Cuánto cuesta una consulta?",
      reply: "La consulta de ejemplo tiene un valor de $35. Si quieres, también puedo ayudarte a reservar una cita.",
      followUp: "Sí, quiero reservar.",
      followUpReply: "Con gusto. Para continuar necesitaría tu nombre y un teléfono de contacto.",
    },
  ],
  beauty_salon: [
    {
      id: "salon-price",
      prompt: "¿Cuánto cuesta un corte?",
      reply: "El corte de ejemplo cuesta $12. También tenemos manicure y tinte. ¿Te gustaría reservar un horario?",
      followUp: "Sí, para mañana.",
      followUpReply: "Perfecto. Puedo revisar los horarios de ejemplo y registrar tu nombre para confirmar la cita.",
    },
    {
      id: "salon-booking",
      prompt: "¿Puedo reservar para mañana?",
      reply: "Claro. Tenemos horarios de ejemplo por la mañana y la tarde. ¿Qué momento te funciona mejor?",
      followUp: "Por la mañana.",
      followUpReply: "Anotado. Para completar la reserva necesito tu nombre y un teléfono de contacto.",
    },
  ],
  hardware_store: [
    {
      id: "hardware-stock",
      prompt: "¿Tienen cemento Holcim?",
      reply: "Sí, tenemos cemento de ejemplo disponible. Puedo compartirte el precio o preparar una cotización.",
      followUp: "Necesito 20 sacos.",
      followUpReply: "Perfecto. Prepararé una cotización de ejemplo para 20 sacos y registraré tus datos de contacto.",
    },
    {
      id: "hardware-quote",
      prompt: "Necesito una cotización para 20 sacos",
      reply: "Con gusto. Para preparar la cotización necesito confirmar el producto y la ciudad de entrega.",
      followUp: "Es para Quito.",
      followUpReply: "Gracias. Progy puede dejar la solicitud registrada para que un vendedor la revise.",
    },
  ],
  hotel: [
    {
      id: "hotel-availability",
      prompt: "¿Tienen habitaciones este fin de semana?",
      reply: "Tenemos disponibilidad de ejemplo para este fin de semana. ¿Para cuántas personas sería la reserva?",
      followUp: "Para dos personas.",
      followUpReply: "Perfecto. Para continuar con la reserva necesito las fechas y un nombre de contacto.",
    },
    {
      id: "hotel-breakfast",
      prompt: "¿El desayuno está incluido?",
      reply: "Sí, el desayuno de ejemplo está incluido en la tarifa de algunas habitaciones. ¿Quieres que revise opciones?",
      followUp: "Sí, por favor.",
      followUpReply: "Con gusto. Puedo compartir las opciones disponibles y ayudarte a solicitar una reserva.",
    },
  ],
  restaurant: [
    {
      id: "restaurant-menu",
      prompt: "¿Qué tienen para almorzar?",
      reply: "Tenemos un menú de ejemplo con platos del día, bebidas y opciones vegetarianas. ¿Quieres que te comparta los precios?",
      followUp: "Sí, compárteme los precios.",
      followUpReply: "Claro. Progy puede informar cada opción y tomar tu pedido cuando estés listo.",
    },
    {
      id: "restaurant-booking",
      prompt: "Quiero reservar una mesa para cuatro",
      reply: "Perfecto. Puedo registrar una reserva de ejemplo para cuatro personas. ¿Qué día te gustaría venir?",
      followUp: "Este sábado en la noche.",
      followUpReply: "Anotado. Para confirmar la reserva necesito tu nombre y un teléfono de contacto.",
    },
  ],
  other: [
    {
      id: "other-information",
      prompt: "¿Qué servicios ofrecen?",
      reply: "Puedo explicar los productos y servicios de ejemplo de tu negocio, además de compartir horarios y formas de contacto.",
      followUp: "¿Cómo puedo conocer más?",
      followUpReply: "Puedo registrar tus datos y dejar la consulta lista para que alguien de tu equipo la atienda.",
    },
    {
      id: "other-contact",
      prompt: "Quiero hablar con alguien del negocio",
      reply: "Claro. Puedo registrar tu solicitud y pedirte un nombre y un teléfono para que el equipo te contacte.",
      followUp: "Mi nombre es Ana.",
      followUpReply: "Gracias, Ana. Solo necesitaría un teléfono para completar la solicitud.",
    },
  ],
};

export const defaultOnboardingDraft = {
  businessName: "",
  categoryCode: "clinic",
  voiceId: "valentina",
  scenarioId: "clinic-availability",
  connectionChoice: null,
} as const;

export function getCategory(code: string) {
  return onboardingCategories.find((category) => category.code === code) ?? onboardingCategories[0];
}

export function getScenarios(categoryCode: string) {
  return scenarios[categoryCode] ?? scenarios.other;
}

export function getScenario(categoryCode: string, scenarioId: string) {
  const categoryScenarios = getScenarios(categoryCode);
  return categoryScenarios.find((scenario) => scenario.id === scenarioId) ?? categoryScenarios[0];
}
