import { Check, Clock3, Phone, RefreshCw, ShieldCheck } from "lucide-react";
import styles from "./Onboarding.module.css";

const benefits = [
  { icon: Clock3, title: "Responde 24/7", text: "Atiende mensajes en cualquier momento, incluso fuera de horario." },
  { icon: Phone, title: "Mantén tu número actual", text: "Conecta el WhatsApp que ya utilizas con tus clientes." },
  { icon: RefreshCw, title: "Sincroniza conversaciones", text: "Centraliza y organiza todas tus conversaciones automáticamente." },
  { icon: Check, title: "Activa cuando estés listo", text: "Conecta ahora o vuelve a este paso más adelante." },
];

export default function BenefitList() {
  return <div className={styles.benefitList}>{benefits.map(({ icon: Icon, title, text }) => <div className={styles.benefit} key={title}><span className={styles.benefitIcon}><Icon size={17} /></span><span><strong>{title}</strong><small>{text}</small></span></div>)}</div>;
}

export function SecureConnectionNote() {
  return <div className={styles.secureNote}>
    <span className={styles.secureNoteIcon}><ShieldCheck size={16} /></span>
    <span className={styles.secureNoteCopy}>
      <strong>Tus datos y conversaciones están protegidos.</strong>
      <small>La conexión se realiza directamente con Meta, sin copiar tokens ni configurar credenciales manualmente.</small>
    </span>
    <span className={styles.secureBadge}><Check size={12} /><span><strong>Conexión segura</strong><small>Integración oficial</small></span></span>
  </div>;
}
