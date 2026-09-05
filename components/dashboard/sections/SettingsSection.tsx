import type { SettingsSectionProps } from "../types/dashboard";
import { planLabel } from "../navigation/legacy";
import { Card, SectionHeader } from "../ui";
import { DashboardIcon } from "../LineIcon";
import styles from "../ProgyDashboard.module.css";

export default function SettingsSection({ user, workspace, integrations }: SettingsSectionProps) {
  const serviceReady = integrations.supabase && integrations.openai && integrations.elevenlabs;

  return <>
    <SectionHeader eyebrow="TU CUENTA" title="Configuración" description="Información general del espacio de trabajo. Los detalles internos de proveedores y credenciales no se muestran en el panel de clientes." />
    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Cuenta" description="Sesión y negocio activo.">
        <div className={styles.list}>
          <div className={styles.listRow}><div><b>{user.name}</b><small>{user.email}</small></div></div>
          <div className={styles.listRow}><div><b>{workspace.business.name}</b><small>Negocio activo</small></div><strong>{planLabel(workspace.plan?.plan_code || workspace.business.status)}</strong></div>
        </div>
      </Card>
      <Card className={styles.cardHalf} title="Estado del servicio" description="Progy comprueba internamente que todo lo necesario esté disponible.">
        <div className={styles.listRow}><div><b>{serviceReady ? "Todo listo para trabajar" : "Hay una configuración pendiente"}</b><small>{serviceReady ? "Puedes seguir configurando y realizando pruebas." : "Algunas funciones pueden estar temporalmente limitadas."}</small></div><strong><DashboardIcon name={serviceReady ? "check" : "pending"} size={17} /></strong></div>
      </Card>
    </div>
  </>;
}
