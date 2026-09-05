import type { NavigationGroup, NavigationItem } from "./types";

export const homeNavigationItem: NavigationItem = {
  id: "inicio",
  icon: "home",
  label: "Inicio",
  href: "/panel",
};

export const navigationGroups: readonly NavigationGroup[] = [
  {
    id: "operacion",
    label: "OPERACIÓN",
    items: [
      { id: "conversaciones", icon: "conversation", label: "Conversaciones", href: "/panel/conversaciones" },
      { id: "contactos", icon: "contacts", label: "Contactos", href: "/panel/contactos" },
      { id: "oportunidades", icon: "opportunities", label: "Oportunidades", href: "/panel/oportunidades" },
      { id: "agenda", icon: "calendar", label: "Agenda", href: "/panel/agenda" },
      { id: "resultados", icon: "results", label: "Resultados", href: "/panel/resultados" },
    ],
  },
  {
    id: "progy",
    label: "PROGY",
    items: [
      { id: "conocimiento", icon: "knowledge", label: "Conocimiento", href: "/panel/conocimiento" },
      { id: "personalidad", icon: "assistant", label: "Personalidad y voz", href: "/panel/personalidad" },
      { id: "pruebas", icon: "test", label: "Pruebas", href: "/panel/pruebas" },
    ],
  },
  {
    id: "canales",
    label: "CANALES",
    items: [
      { id: "whatsapp", icon: "whatsapp", label: "WhatsApp", href: "/panel/canales/whatsapp" },
    ],
  },
  {
    id: "cuenta",
    label: "CUENTA",
    items: [
      { id: "uso-plan", icon: "usage", label: "Uso y plan", href: "/panel/uso-plan" },
      { id: "configuracion", icon: "settings", label: "Configuración", href: "/panel/configuracion" },
    ],
  },
];
