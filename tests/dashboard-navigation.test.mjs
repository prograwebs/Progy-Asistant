import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("dashboard navigation declares the grouped v1 hierarchy", () => {
  const dashboard = read("components/dashboard/ProgyDashboard.tsx");
  const labels = ["OPERACIÓN", "MI PROGY", "CANALES", "CUENTA"];
  let previous = -1;
  for (const label of labels) {
    const index = dashboard.indexOf(`label: "${label}"`);
    assert.ok(index > previous, `${label} should be declared in order`);
    previous = index;
  }

  for (const label of [
    "Conversaciones", "Resultados", "Interesados", "Cotizaciones", "Negocio", "Catálogo",
    "Información y respuestas", "Personalidad y voz", "Pruebas", "WhatsApp", "Llamadas",
    "Web", "Uso y plan", "Configuración",
  ]) assert.match(dashboard, new RegExp(`label: "${label}"`));
});

test("future dashboard destinations are visible but cannot navigate", () => {
  const dashboard = read("components/dashboard/ProgyDashboard.tsx");
  assert.match(dashboard, /soon: true/);
  assert.match(dashboard, /aria-disabled=\{item\.soon \? "true" : undefined\}/);
  assert.match(dashboard, /if \(!item\.soon && item\.destination\) onNavigate\(item\.destination\)/);
  assert.match(dashboard, /const tooltipLabel = item\.soon \? `\$\{item\.label\} · Próximamente`/);
});

test("legacy checklist destinations resolve into the Personalidad y voz tabs", () => {
  const dashboard = read("components/dashboard/ProgyDashboard.tsx");
  assert.match(dashboard, /next === "asistente" \|\| next === "personalidad" \|\| next === "progy"/);
  assert.match(dashboard, /next === "voz"\) return \{ section: "progy", progyTab: "voz" \}/);
  assert.match(dashboard, /section === "progy" && <ProgySection/);
  const progy = read("components/dashboard/sections/ProgySection.tsx");
  assert.match(progy, /role="tablist"/);
  assert.match(progy, /Personalidad/);
  assert.match(progy, /Voz/);
  assert.match(progy, /<AgentSection/);
  assert.match(progy, /<VoiceSection/);
});

test("sidebar exposes active page semantics and preserves the combined results view", () => {
  const dashboard = read("components/dashboard/ProgyDashboard.tsx");
  const records = read("components/dashboard/sections/RecordsSections.tsx");
  assert.match(dashboard, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(dashboard, /const groupActive = group\.items\.some/);
  assert.match(records, /title="Pedidos y reservas"/);
  assert.match(records, /Pedidos \(\{workspace\.orders\.length\}\)/);
  assert.match(records, /Reservas y citas/);
});

test("dashboard icons include future channel destinations", () => {
  const icons = read("components/dashboard/LineIcon.tsx");
  assert.match(icons, /\bGlobe2\b/);
  assert.match(icons, /\bPhone\b/);
  assert.match(icons, /phone: Phone/);
  assert.match(icons, /globe: Globe2/);
});
