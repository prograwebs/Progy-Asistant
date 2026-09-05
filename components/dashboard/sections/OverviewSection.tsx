import type { SelectedWorkspace } from "@/lib/shared/types/workspace";
import { completionPercent, money } from "@/lib/shared/utils/formatters";
import { Card, SectionHeader } from "../ui";
import { DashboardIcon } from "../LineIcon";
import styles from "../ProgyDashboard.module.css";

export default function OverviewSection({ workspace, onGo }: { workspace: SelectedWorkspace; onGo: (section: string) => void }) {
  const completion = completionPercent({
    businessName: workspace.business.name,
    hours: workspace.hours.length,
    catalog: workspace.catalogItems.length,
    knowledge: workspace.knowledge.length,
    voiceId: workspace.agent?.voice_id,
    greeting: workspace.agent?.greeting,
  });
  const pendingOrders = workspace.orders.filter((row) => row.status === "pending").length;
  const pendingBookings = workspace.bookings.filter((row) => row.status === "pending").length;
  const orderValue = workspace.orders.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const completedTests = workspace.conversations.filter((row) => row.channel === "web_voice" && row.status === "completed").length;
  const needsReview = workspace.conversations.filter((row) => row.status === "failed").length;
  const launchReady = completion === 100 && completedTests > 0;
  const latest = workspace.conversations[0];

  const readiness = [
    ["Información del negocio", Boolean(workspace.business.description), "negocio"],
    ["Horario", workspace.hours.length >= 7, "negocio"],
    ["Productos o servicios", workspace.catalogItems.length > 0, "catalogo"],
    ["Conocimiento", workspace.knowledge.length > 0, "conocimiento"],
    ["Voz elegida", Boolean(workspace.agent?.voice_id), "voz"],
    ["Saludo de Progy", Boolean(workspace.agent?.greeting?.trim()), "asistente"],
    ["Prueba completa", completedTests > 0, "pruebas"],
  ] as const;

  return <>
    <SectionHeader eyebrow="TU OPERACIÓN EN UN VISTAZO" title={`Hola, ${workspace.business.name}`} description="Configura tu asistente, valida una conversación completa y revisa lo que requiere atención antes de atender clientes." />
    <div className={styles.metricGrid}>
      <article className={styles.metric}><small>Preparación</small><b>{launchReady ? "Lista" : `${completion}%`}</b><span>{launchReady ? "Validada para publicar" : "Completa la configuración y una prueba"}</span><div className={styles.progress}><i style={{ width: `${launchReady ? 100 : completion}%` }} /></div></article>
      <article className={styles.metric}><small>Conversaciones</small><b>{workspace.conversations.length}</b><span>{completedTests} pruebas completas</span></article>
      <article className={styles.metric}><small>Por atender</small><b>{pendingOrders + pendingBookings}</b><span>Pedidos y reservas pendientes</span></article>
      <article className={styles.metric}><small>Revisión</small><b>{needsReview}</b><span>{needsReview ? "Conversaciones con error" : "Sin incidencias registradas"}</span></article>
    </div>
    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Preparación para publicar" description="El mismo checklist puede repetirse después de cada cambio importante del asistente." tag={launchReady ? "Listo" : `${readiness.filter(([, done]) => done).length}/${readiness.length}`}>
        <div className={styles.list}>
          {readiness.map(([label, done, section]) => <div className={styles.listRow} key={label}><div><b><DashboardIcon name={done ? "check" : "pending"} size={15} className={styles.inlineIcon} />{label}</b><small>{done ? "Validado" : "Completa este paso antes de publicar."}</small></div>{!done && <button className={styles.textButton} onClick={() => onGo(section)}>Configurar <DashboardIcon name="arrowRight" size={14} /></button>}</div>)}
        </div>
      </Card>
      <Card className={styles.cardHalf} title="Actividad reciente" description={`Pedidos registrados: ${money(orderValue)}. Última conversación del negocio:`}>
        {latest ? <div className={styles.listRow}><div><b>{latest.customer_name || latest.customer_phone || "Cliente"}</b><small>{latest.summary || latest.outcome || "Conversación registrada sin resumen."}</small></div><button className={styles.textButton} onClick={() => onGo("conversaciones")}>Ver historial <DashboardIcon name="arrowRight" size={14} /></button></div> : <div className={styles.empty}><div><b>Todavía no hay conversaciones</b><p>Realiza una prueba por voz y aparecerá aquí junto con su resultado.</p><div className={styles.actions}><button className={styles.secondary} onClick={() => onGo("pruebas")}>Probar a Progy</button></div></div></div>}
      </Card>
    </div>
  </>;
}
