import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function LegalPage({
  eyebrow,
  title,
  description,
  children,
}: LegalPageProps) {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <Link href="/" style={styles.brand}>
          <span style={styles.logo}>P</span>
          <span>Progy</span>
        </Link>

        <Link href="/" style={styles.back}>
          Volver a Progy
        </Link>
      </header>

      <section style={styles.hero}>
        <span style={styles.eyebrow}>{eyebrow}</span>

        <h1 style={styles.title}>{title}</h1>

        <p style={styles.description}>{description}</p>

        <p style={styles.date}>
          Última actualización: 8 de agosto de 2026
        </p>
      </section>

      <article style={styles.content}>{children}</article>

      <footer style={styles.footer}>
        <div>
          <strong>Progy</strong>
          <p style={styles.footerText}>
            Plataforma de asistentes inteligentes de PrograWebs.
          </p>
        </div>

        <nav style={styles.footerLinks}>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos</Link>
          <Link href="/eliminar-datos">Eliminar datos</Link>
        </nav>
      </footer>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #18130d 0%, #0b0b0b 38%, #070707 100%)",
    color: "#f3eee7",
    fontFamily: '"Times New Roman", Times, serif',
  },

  header: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "28px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,.08)",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "#ffffff",
    textDecoration: "none",
    fontSize: 28,
  },

  logo: {
    width: 38,
    height: 38,
    border: "1px solid #d99b51",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    color: "#e8ad64",
    fontSize: 18,
  },

  back: {
    color: "#d9a15f",
    textDecoration: "none",
    fontSize: 15,
  },

  hero: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "80px 24px 46px",
  },

  eyebrow: {
    display: "block",
    color: "#d59b58",
    fontFamily: "Arial, sans-serif",
    fontSize: 12,
    letterSpacing: "0.18em",
    marginBottom: 18,
  },

  title: {
    margin: 0,
    fontSize: "clamp(42px, 6vw, 72px)",
    fontWeight: 400,
    lineHeight: 1.05,
  },

  description: {
    maxWidth: 720,
    color: "#bdb7ae",
    lineHeight: 1.7,
    fontSize: 19,
    marginTop: 24,
  },

  date: {
    marginTop: 22,
    color: "#807a72",
    fontFamily: "Arial, sans-serif",
    fontSize: 13,
  },

  content: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "10px 24px 90px",
    color: "#d8d2ca",
    fontFamily: "Arial, sans-serif",
    fontSize: 16,
    lineHeight: 1.8,
  },

  footer: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "36px 24px 50px",
    borderTop: "1px solid rgba(255,255,255,.08)",
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    flexWrap: "wrap",
  },

  footerText: {
    color: "#857f77",
    fontFamily: "Arial, sans-serif",
    fontSize: 13,
  },

  footerLinks: {
    display: "flex",
    gap: 22,
    flexWrap: "wrap",
    fontFamily: "Arial, sans-serif",
    fontSize: 13,
  },
};