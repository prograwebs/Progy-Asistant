import type { SelectedWorkspace } from "../types";
import { completionPercent, money } from "../utils";
import { Card, SectionHeader } from "../ui";
import styles from "../ProgyDashboard.module.css";

export default function OverviewSection({ workspace, onGo }: { workspace: SelectedWorkspace; onGo: (section: string) => void }) {
  const completion = completionPercent({ businessName: workspace.business.name, hours: workspace.hours.length, catalog: workspace.catalogItems.length, knowledge: workspace.knowledge.length, voiceId: workspace.agent?.voice_id, greeting: workspace.agent?.greeting });
  const pendingOrders = workspace.orders.filter((row) => row.status === "pending").length;
  const pendingBookings = workspace.bookings.filter((row) => row.status === "pending").length;
  const orderValue = workspace.orders.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const latest = workspace.conversations[0];

  return <>
    <SectionHeader eyebrow="TU OPERACIÓN EN UN VISTAZO" title={`Hola, ${workspace.business.name}`} description="Configura tu asistente, revisa lo que ocurrió y mantén control sobre la atención de tu negocio." />
    <div className={styles.metricGrid}>
      <article className={styles.metric}><small>Configuración</small><b>{completion}%</b><span>Progy preparado</span><div className={styles.progress}><i style={{ width: `${completion}%` }} /></div></article>
      <article className={styles.metric}><small>Conversaciones</small><b>{workspace.conversations.length}</b><span>Historial reciente</span></article>
      <article className={styles.metric}><small>Por atender</small><b>{pendingOrders + pendingBookings}</b><span>Pedidos y reservas pendientes</span></article>
      <article className={styles.metric}><small>Pedidos registrados</small><b>{money(orderValue)}</b><span>Valor total visible en el panel</span></article>
    </div>
    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Deja a Progy listo" description="Completa estos puntos antes de comenzar con clientes." tag={`${completion}%`}>
        <div className={styles.list}>
          {[
            ["Información del negocio", Boolean(workspace.business.description), "negocio"],
            ["Horario", workspace.hours.length >= 7, "negocio"],
            ["Productos o servicios", workspace.catalogItems.length > 0, "catalogo"],
            ["Conocimiento", workspace.knowledge.length > 0, "conocimiento"],
            ["Voz elegida", Boolean(workspace.agent?.voice_id), "voz"],
            ["Saludo de Progy", Boolean(workspace.agent?.greeting?.trim()), "asistente"],
          ].map(([label, done, section]) => <div className={styles.listRow} key={String(label)}><div><b>{done ? "✓" : "○"} {label}</b><small>{done ? "Listo" : "Completa este paso para mejorar la prueba."}</small></div>{!done && <button className={styles.textButton} onClick={() => onGo(String(section))}>Configurar →</button>}</div>)}
        </div>
      </Card>
      <Card className={styles.cardHalf} title="Actividad reciente" description="Última conversación registrada para este negocio.">
        {latest ? <div className={styles.listRow}><div><b>{latest.customer_name || latest.customer_phone || "Cliente"}</b><small>{latest.summary || latest.outcome || "Conversación registrada sin resumen."}</small></div><button className={styles.textButton} onClick={() => onGo("conversaciones")}>Ver historial →</button></div> : <div className={styles.empty}><div><b>Todavía no hay conversaciones</b><p>Realiza una prueba por voz y aparecerá aquí junto con su resultado.</p><div className={styles.actions}><button className={styles.secondary} onClick={() => onGo("pruebas")}>Probar a Progy</button></div></div></div>}
      </Card>
    </div>
  </>;
}
