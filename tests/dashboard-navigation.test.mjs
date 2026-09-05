import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

async function importTypeScript(file) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

test("dashboard navigation declares the exact grouped v1 hierarchy", () => {
  const config = read("components/dashboard/navigation/config.ts");
  const labels = ["OPERACIÓN", "PROGY", "CANALES", "CUENTA"];
  let previous = -1;
  for (const label of labels) {
    const index = config.indexOf(`label: "${label}"`);
    assert.ok(index > previous, `${label} should be declared in order`);
    previous = index;
  }

  const expected = [
    ["Inicio", "/panel"],
    ["Conversaciones", "/panel/conversaciones"],
    ["Contactos", "/panel/contactos"],
    ["Oportunidades", "/panel/oportunidades"],
    ["Agenda", "/panel/agenda"],
    ["Resultados", "/panel/resultados"],
    ["Conocimiento", "/panel/conocimiento"],
    ["Personalidad y voz", "/panel/personalidad"],
    ["Pruebas", "/panel/pruebas"],
    ["WhatsApp", "/panel/canales/whatsapp"],
    ["Uso y plan", "/panel/uso-plan"],
    ["Configuración", "/panel/configuracion"],
  ];
  let itemPrevious = -1;
  for (const [label, href] of expected) {
    const index = config.indexOf(`label: "${label}"`);
    assert.ok(index > itemPrevious, `${label} should be declared in order`);
    assert.ok(config.indexOf(`href: "${href}"`, itemPrevious) > itemPrevious, `${label} should use ${href}`);
    itemPrevious = index;
  }
});

test("sidebar excludes non-v1 entries and future-disabled states", () => {
  const config = read("components/dashboard/navigation/config.ts");
  for (const label of ["Interesados", "Cotizaciones", "Negocio", "Catálogo", "Información y respuestas", "Llamadas", "Web", "Instagram", "Messenger", "TikTok"]) {
    assert.doesNotMatch(config, new RegExp(`label: "${label}"`));
  }
  assert.doesNotMatch(config, /soon|Próximamente|aria-disabled/);
});

test("route matching treats /panel as an exact route and supports descendants", async () => {
  const { isNavigationItemActive } = await importTypeScript("components/dashboard/navigation/route-matching.ts");
  assert.equal(isNavigationItemActive("/panel", "/panel"), true);
  assert.equal(isNavigationItemActive("/panel/conversaciones", "/panel"), false);
  assert.equal(isNavigationItemActive("/panel/conversaciones", "/panel/conversaciones"), true);
  assert.equal(isNavigationItemActive("/panel/conversaciones/123", "/panel/conversaciones"), true);
  assert.equal(isNavigationItemActive("/panel/conocimiento", "/panel/conversaciones"), false);
});

test("sidebar preserves legacy in-panel destinations and active accessibility", () => {
  const dashboard = read("components/dashboard/ProgyDashboard.tsx");
  const legacy = read("components/dashboard/navigation/legacy.ts");
  const sidebar = read("components/dashboard/navigation/Sidebar.tsx");
  assert.match(legacy, /next === "asistente" \|\| next === "personalidad" \|\| next === "progy"/);
  assert.match(legacy, /next === "voz"\) return \{ section: "progy", progyTab: "voz" \}/);
  assert.match(dashboard, /section === "progy" && <ProgySection/);
  const progy = read("components/dashboard/sections/ProgySection.tsx");
  assert.match(progy, /role="tablist"/);
  assert.match(progy, /Personalidad/);
  assert.match(progy, /Voz/);
  assert.match(progy, /<AgentSection/);
  assert.match(progy, /<VoiceSection/);
  assert.match(sidebar, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(sidebar, /usePathname/);
  assert.match(sidebar, /onCloseMobile/);
  assert.match(sidebar, /navigationBadges/);
  assert.match(sidebar, /navigationStatuses/);
  assert.match(read("components/dashboard/navigation/types.ts"), /badge\?: NavigationBadge/);
  assert.match(read("components/dashboard/navigation/types.ts"), /status\?: NavigationStatus/);
  assert.match(read("components/dashboard/navigation/NavItem.tsx"), /navStatus/);
});

test("sidebar preserves the combined results view", () => {
  const records = read("components/dashboard/sections/RecordsSections.tsx");
  assert.match(records, /title=\{`\$\{labels\.orderPlural\} y \$\{labels\.bookingPlural\}`\}/);
  assert.match(records, /labels\.orderPlural/);
  assert.match(records, /labels\.bookingPlural/);
});

test("dashboard icons include future channel destinations", () => {
  const icons = read("components/dashboard/LineIcon.tsx");
  assert.match(icons, /\bGlobe2\b/);
  assert.match(icons, /\bPhone\b/);
  assert.match(icons, /phone: Phone/);
  assert.match(icons, /globe: Globe2/);
  assert.match(icons, /contacts: Users/);
  assert.match(icons, /opportunities: Target/);
  assert.match(icons, /calendar: CalendarDays/);
});
