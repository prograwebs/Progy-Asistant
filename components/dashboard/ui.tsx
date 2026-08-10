import type { ReactNode } from "react";
import styles from "./ProgyDashboard.module.css";

export function Card({
  title,
  description,
  tag,
  className = "",
  children,
}: {
  title?: string;
  description?: string;
  tag?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.card} ${className}`}>
      {(title || description || tag) && (
        <div className={styles.cardHead}>
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {tag && <span className={styles.cardTag}>{tag}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className={styles.empty}><div><b>{title}</b><p>{text}</p></div></div>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
