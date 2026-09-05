"use client";

import { useMemo } from "react";
import type { OnboardingReadiness } from "@/shared/types/onboarding";
import type { SelectedWorkspace } from "@/shared/types/workspace";
import { Card, SectionHeader } from "../ui";
import { DashboardIcon } from "../LineIcon";
import styles from "../ProgyDashboard.module.css";

type PreparationTask = {
  label: string;
  text: string;
  done: boolean;
  section: string;
  required: boolean;
};

export default function PreparationSection({ workspace, readiness, onGo, onActivate, activating }: { workspace: SelectedWorkspace; readiness: OnboardingReadiness; onGo: (section: string) => void; onActivate: () => Promise<void>; activating: boolean }) {
  const tasks = useMemo<PreparationTask[]>(() => [
    { label: "Información del negocio", text: "Agrega contacto, ubicación o una descripción real.", done: readiness.basicInfo, section: "negocio", required: true },
    { label: "Productos o servicios", text: "Reemplaza los datos de ejemplo por al menos un elemento real.", done: readiness.catalog, section: "catalogo", required: true },
    { label: "Información y respuestas", text: "Confirma pagos, políticas y preguntas frecuentes.", done: workspace.knowledge.some((item) => item.is_active && !item.is_demo), section: "conocimiento", required: false },
    { label: "Voz de Progy", text: "Elige una voz real para responder a tus clientes.", done: readiness.voice, section: "voz", required: true },
    { label: "Horarios", text: "Define cuándo puede atender Progy.", done: readiness.hours, section: "negocio", required: true },
    { label: "Prueba completada", text: "Valida una conversación antes de activar.", done: readiness.demo, section: "pruebas", required: true },
    { label: "WhatsApp verificado", text: "El canal debe confirmarse desde el servidor.", done: readiness.channel, section: "whatsapp", required: true },
  ], [readiness, workspace.knowledge]);

  const completed = tasks.filter((task) => task.done).length;
  const percent = Math.round((completed / tasks.length) * 100);
  const requiredReady = readiness.ready;

  return <>
    <SectionHeader eyebrow="PREPARACIÓN PARA ATENDER" title="Tu Progy está casi listo" description={`Ya conociste cómo puede atender ${workspace.business.name}. Ahora enséñale cómo funciona realmente tu negocio.`} />
    <div className={styles.metricGrid}>
      <article className={styles.metric}><small>Preparación</small><b>{percent}%</b><span>{completed} de {tasks.length} pasos completados</span><div className={styles.progress}><i style={{ width: `${percent}%` }} /></div></article>
      <article className={styles.metric}><small>Obligatorios</small><b>{requiredReady ? "Listos" : "Pendientes"}</b><span>Validación server-side</span></article>
      <article className={styles.metric}><small>Información demo</small><b>{workspace.catalogItems.filter((item) => item.is_demo).length}</b><span>Elementos para reemplazar</span></article>
      <article className={styles.metric}><small>Canal</small><b>{readiness.channel ? "Verificado" : "Pendiente"}</b><span>WhatsApp Business</span></article>
    </div>
    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Completa la preparación" description="Los datos demo ayudan a probar el flujo, pero no se usarán como información comercial real." tag={`${completed}/${tasks.length}`}>
        <div className={styles.list}>{tasks.map((task) => <div className={styles.listRow} key={task.label}><div><b><DashboardIcon name={task.done ? "check" : "pending"} size={15} className={styles.inlineIcon} />{task.label}{task.required && <small className={styles.requiredTag}>Obligatorio</small>}</b><small>{task.text}</small></div>{!task.done && <button className={styles.textButton} onClick={() => onGo(task.section)}>Completar <DashboardIcon name="arrowRight" size={14} /></button>}</div>)}</div>
        <div className={styles.actions}><button className={styles.primary} disabled={!requiredReady || activating} onClick={() => void onActivate()}>{activating ? "Activando…" : requiredReady ? "Activar atención" : "Completa los requisitos"}</button></div>
      </Card>
      <Card className={styles.cardHalf} title="Información de ejemplo" description="Revisa y reemplaza estos datos antes de activar la atención real.">
        <div className={styles.list}><div className={styles.listRow}><div><b>{workspace.catalogItems.filter((item) => item.is_demo).length} productos o servicios demo</b><small>Los precios y descripciones son exclusivamente para probar Progy.</small></div><button className={styles.textButton} onClick={() => onGo("catalogo")}>Revisar <DashboardIcon name="arrowRight" size={14} /></button></div><div className={styles.listRow}><div><b>{workspace.knowledge.filter((item) => item.is_demo).length} respuestas demo</b><small>Confirma políticas, pagos y respuestas del negocio.</small></div><button className={styles.textButton} onClick={() => onGo("conocimiento")}>Revisar <DashboardIcon name="arrowRight" size={14} /></button></div></div>
      </Card>
    </div>
  </>;
}
