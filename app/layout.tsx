import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Progy | Tu negocio responde",
  description: "Asistente de voz de PrograWebs para atender consultas, pedidos y reservas por WhatsApp.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
