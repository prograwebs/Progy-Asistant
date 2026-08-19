import type { OnboardingTemplate } from "./types";

const demoHours = [
  { dayOfWeek: 0, opensAt: null, closesAt: null, isClosed: true },
  ...Array.from({ length: 6 }, (_, index) => ({ dayOfWeek: index + 1, opensAt: "08:00", closesAt: "18:00", isClosed: false })),
];

const templates: Record<string, OnboardingTemplate> = {
  clinic: {
    version: "v1",
    code: "clinic",
    label: "Clínica",
    description: "Citas, horarios y consultas",
    icon: "clinic",
    capabilities: ["Responder consultas", "Informar precios", "Agendar citas"],
    features: ["answer_questions", "schedule_appointments", "capture_leads", "transfer_human"],
    tone: "cálido, natural y profesional",
    hours: demoHours,
    catalog: [
      { key: "general-consultation", kind: "service", name: "Consulta general", description: "Consulta médica de ejemplo.", price: 35, durationMinutes: 30, sortOrder: 1 },
      { key: "preventive-checkup", kind: "service", name: "Valoración preventiva", description: "Valoración de ejemplo para conocer tu estado general.", price: 45, durationMinutes: 45, sortOrder: 2 },
    ],
    knowledge: [
      { key: "clinic-appointments", kind: "faq", title: "Citas", question: "¿Trabajan con cita?", answer: "Sí. Esta es una respuesta de ejemplo; podrás reemplazarla con la información real.", priority: 10 },
      { key: "clinic-payments", kind: "payment_method", title: "Formas de pago", question: "¿Aceptan transferencia?", answer: "Sí. Las formas de pago mostradas son de ejemplo y deben confirmarse para tu negocio.", priority: 9 },
    ],
    scenarios: [
      { id: "clinic-availability", prompt: "¿Tienen citas disponibles mañana?", reply: "Sí. Tenemos disponibilidad de ejemplo mañana por la mañana y por la tarde. ¿Qué horario prefieres?", followUp: "En la tarde.", followUpReply: "Perfecto. Para registrar la cita necesitaría tu nombre y un teléfono de contacto." },
      { id: "clinic-price", prompt: "¿Cuánto cuesta una consulta?", reply: "La consulta de ejemplo tiene un valor de $35. Si quieres, también puedo ayudarte a reservar una cita.", followUp: "Sí, quiero reservar.", followUpReply: "Con gusto. Para continuar necesitaría tu nombre y un teléfono de contacto." },
    ],
  },
  beauty_salon: {
    version: "v1",
    code: "beauty_salon",
    label: "Salón de belleza",
    description: "Servicios, precios y citas",
    icon: "beautySalon",
    capabilities: ["Explicar servicios", "Informar precios", "Gestionar citas"],
    features: ["answer_questions", "schedule_appointments", "capture_leads", "transfer_human"],
    tone: "cálido, cercano y natural",
    hours: demoHours,
    catalog: [
      { key: "haircut", kind: "service", name: "Corte", description: "Corte de cabello de ejemplo.", price: 12, durationMinutes: 45, sortOrder: 1 },
      { key: "manicure", kind: "service", name: "Manicure", description: "Manicure de ejemplo.", price: 15, durationMinutes: 45, sortOrder: 2 },
      { key: "hair-color", kind: "service", name: "Tinte", description: "Servicio de tinte de ejemplo.", price: 35, durationMinutes: 90, sortOrder: 3 },
    ],
    knowledge: [
      { key: "salon-appointments", kind: "faq", title: "Citas", question: "¿Trabajan con cita?", answer: "Sí. Esta es una respuesta de ejemplo para que puedas probar el flujo.", priority: 10 },
      { key: "salon-payments", kind: "payment_method", title: "Formas de pago", question: "¿Aceptan transferencia?", answer: "Las formas de pago de esta plantilla son de ejemplo y podrás reemplazarlas.", priority: 9 },
    ],
    scenarios: [
      { id: "salon-price", prompt: "¿Cuánto cuesta un corte?", reply: "El corte de ejemplo cuesta $12. También tenemos manicure y tinte. ¿Te gustaría reservar un horario?", followUp: "Sí, para mañana.", followUpReply: "Perfecto. Puedo revisar los horarios de ejemplo y registrar tu nombre para confirmar la cita." },
      { id: "salon-booking", prompt: "¿Puedo reservar para mañana?", reply: "Claro. Tenemos horarios de ejemplo por la mañana y la tarde. ¿Qué momento te funciona mejor?", followUp: "Por la mañana.", followUpReply: "Anotado. Para completar la reserva necesito tu nombre y un teléfono de contacto." },
    ],
  },
  hardware_store: {
    version: "v1",
    code: "hardware_store",
    label: "Ferretería",
    description: "Productos, precios y cotizaciones",
    icon: "hardwareStore",
    capabilities: ["Responder consultas", "Preparar cotizaciones", "Registrar pedidos"],
    features: ["answer_questions", "take_orders", "create_quotes", "capture_leads", "transfer_human"],
    tone: "claro, práctico y profesional",
    hours: demoHours,
    catalog: [
      { key: "cement", kind: "product", name: "Cemento de ejemplo", description: "Saco de cemento para demostración.", price: 8.5, sortOrder: 1 },
      { key: "paint", kind: "product", name: "Pintura de ejemplo", description: "Galón de pintura para demostración.", price: 22, sortOrder: 2 },
      { key: "hammer", kind: "product", name: "Martillo de ejemplo", description: "Herramienta de ejemplo.", price: 12, sortOrder: 3 },
    ],
    knowledge: [
      { key: "hardware-delivery", kind: "faq", title: "Entregas", question: "¿Realizan entregas?", answer: "Sí, esta respuesta es de ejemplo y debe reemplazarse por la política real del negocio.", priority: 10 },
      { key: "hardware-quotes", kind: "instruction", title: "Cotizaciones", question: "¿Cómo solicito una cotización?", answer: "Progy puede registrar los productos y cantidades para que un vendedor revise la solicitud.", priority: 9 },
    ],
    scenarios: [
      { id: "hardware-stock", prompt: "¿Tienen cemento Holcim?", reply: "Sí, tenemos cemento de ejemplo disponible. Puedo compartirte el precio o preparar una cotización.", followUp: "Necesito 20 sacos.", followUpReply: "Perfecto. Prepararé una cotización de ejemplo para 20 sacos y registraré tus datos de contacto." },
      { id: "hardware-quote", prompt: "Necesito una cotización para 20 sacos", reply: "Con gusto. Para preparar la cotización necesito confirmar el producto y la ciudad de entrega.", followUp: "Es para Quito.", followUpReply: "Gracias. Progy puede dejar la solicitud registrada para que un vendedor la revise." },
    ],
  },
  hotel: {
    version: "v1",
    code: "hotel",
    label: "Hotel",
    description: "Habitaciones y reservas",
    icon: "hotel",
    capabilities: ["Informar disponibilidad", "Explicar servicios", "Gestionar reservas"],
    features: ["answer_questions", "create_reservations", "capture_leads", "transfer_human"],
    tone: "amable, claro y hospitalario",
    hours: demoHours,
    catalog: [
      { key: "standard-room", kind: "service", name: "Habitación estándar", description: "Habitación de ejemplo para dos personas.", price: 60, durationMinutes: 1440, sortOrder: 1 },
      { key: "suite", kind: "service", name: "Suite de ejemplo", description: "Suite de ejemplo con servicios incluidos.", price: 95, durationMinutes: 1440, sortOrder: 2 },
    ],
    knowledge: [
      { key: "hotel-breakfast", kind: "faq", title: "Desayuno", question: "¿El desayuno está incluido?", answer: "Sí, esta respuesta es de ejemplo y deberá confirmarse con la información real.", priority: 10 },
      { key: "hotel-checkin", kind: "instruction", title: "Check-in", question: "¿A qué hora es el check-in?", answer: "El horario mostrado es de ejemplo; reemplázalo por el horario real del hotel.", priority: 9 },
    ],
    scenarios: [
      { id: "hotel-availability", prompt: "¿Tienen habitaciones este fin de semana?", reply: "Tenemos disponibilidad de ejemplo para este fin de semana. ¿Para cuántas personas sería la reserva?", followUp: "Para dos personas.", followUpReply: "Perfecto. Para continuar con la reserva necesito las fechas y un nombre de contacto." },
      { id: "hotel-breakfast", prompt: "¿El desayuno está incluido?", reply: "Sí, el desayuno de ejemplo está incluido en la tarifa de algunas habitaciones. ¿Quieres que revise opciones?", followUp: "Sí, por favor.", followUpReply: "Con gusto. Puedo compartir las opciones disponibles y ayudarte a solicitar una reserva." },
    ],
  },
  restaurant: {
    version: "v1",
    code: "restaurant",
    label: "Restaurante",
    description: "Menú, pedidos y reservas",
    icon: "restaurant",
    capabilities: ["Responder consultas", "Tomar pedidos", "Reservar mesas"],
    features: ["answer_questions", "take_orders", "create_reservations", "capture_leads", "transfer_human"],
    tone: "cálido, ágil y cercano",
    hours: demoHours,
    catalog: [
      { key: "house-breakfast", kind: "product", name: "Desayuno de la casa", description: "Café, jugo y sándwich de ejemplo.", price: 6.5, sortOrder: 1 },
      { key: "daily-lunch", kind: "product", name: "Almuerzo del día", description: "Plato del día de ejemplo.", price: 9.9, sortOrder: 2 },
      { key: "vegetarian-option", kind: "product", name: "Opción vegetariana", description: "Plato vegetariano de ejemplo.", price: 8.5, sortOrder: 3 },
    ],
    knowledge: [
      { key: "restaurant-reservations", kind: "faq", title: "Reservas", question: "¿Puedo reservar una mesa?", answer: "Sí, Progy puede registrar una solicitud de reserva de ejemplo.", priority: 10 },
      { key: "restaurant-payments", kind: "payment_method", title: "Formas de pago", question: "¿Qué formas de pago aceptan?", answer: "Las formas de pago de esta plantilla son de ejemplo y deben confirmarse.", priority: 9 },
    ],
    scenarios: [
      { id: "restaurant-menu", prompt: "¿Qué tienen para almorzar?", reply: "Tenemos un menú de ejemplo con platos del día, bebidas y opciones vegetarianas. ¿Quieres que te comparta los precios?", followUp: "Sí, compárteme los precios.", followUpReply: "Claro. Progy puede informar cada opción y tomar tu pedido cuando estés listo." },
      { id: "restaurant-booking", prompt: "Quiero reservar una mesa para cuatro", reply: "Perfecto. Puedo registrar una reserva de ejemplo para cuatro personas. ¿Qué día te gustaría venir?", followUp: "Este sábado en la noche.", followUpReply: "Anotado. Para confirmar la reserva necesito tu nombre y un teléfono de contacto." },
    ],
  },
  other: {
    version: "v1",
    code: "other",
    label: "Otro negocio",
    description: "Configura el flujo a tu medida",
    icon: "other",
    capabilities: ["Responder consultas", "Compartir información", "Registrar interesados"],
    features: ["answer_questions", "capture_leads", "transfer_human"],
    tone: "claro, amable y profesional",
    hours: demoHours,
    catalog: [
      { key: "sample-service", kind: "service", name: "Servicio de ejemplo", description: "Un servicio demo para probar el asistente.", price: 25, durationMinutes: 30, sortOrder: 1 },
      { key: "sample-product", kind: "product", name: "Producto de ejemplo", description: "Un producto demo para probar respuestas.", price: 15, sortOrder: 2 },
    ],
    knowledge: [
      { key: "other-information", kind: "faq", title: "Información general", question: "¿Qué servicios ofrecen?", answer: "Puedo explicar los productos y servicios de ejemplo de tu negocio.", priority: 10 },
      { key: "other-contact", kind: "instruction", title: "Contacto", question: "Quiero hablar con alguien del negocio", answer: "Puedo registrar tu solicitud y pedirte un nombre y un teléfono.", priority: 9 },
    ],
    scenarios: [
      { id: "other-information", prompt: "¿Qué servicios ofrecen?", reply: "Puedo explicar los productos y servicios de ejemplo de tu negocio, además de compartir horarios y formas de contacto.", followUp: "¿Cómo puedo conocer más?", followUpReply: "Puedo registrar tus datos y dejar la consulta lista para que alguien de tu equipo la atienda." },
      { id: "other-contact", prompt: "Quiero hablar con alguien del negocio", reply: "Claro. Puedo registrar tu solicitud y pedirte un nombre y un teléfono para que el equipo te contacte.", followUp: "Mi nombre es Ana.", followUpReply: "Gracias, Ana. Solo necesitaría un teléfono para completar la solicitud." },
    ],
  },
};

export const TEMPLATE_VERSION = "v1";

export function getOnboardingTemplate(categoryCode: string) {
  return templates[categoryCode] ?? templates.other;
}

export function listOnboardingTemplates() {
  return Object.values(templates);
}
