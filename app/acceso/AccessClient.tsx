"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AccessClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">(params.get("mode") === "login" ? "login" : "signup");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(() => params.get("error") || "");
  const [isError, setIsError] = useState(() => Boolean(params.get("error")));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    };
    try {
      const response = await fetch(`/api/auth/${mode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; needsConfirmation?: boolean };
      if (!response.ok) throw new Error(result.error || "No pudimos completar el acceso.");
      if (result.needsConfirmation) {
        setMessage("Cuenta creada. Revisa tu correo y confirma el registro antes de iniciar sesión.");
        setMode("login");
      } else {
        router.push("/panel");
        router.refresh();
      }
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(next: "signup" | "login") {
    setMode(next);
    setMessage("");
    setIsError(false);
  }

  return (
    <main className="access-page">
      <Link className="brand access-brand" href="/" aria-label="Volver a Progy">
        <span className="brand-mark"><i /><i /><i /></span><span>Progy</span><small>por PrograWebs</small>
      </Link>
      <section className="access-copy">
        <div className="eyebrow"><span className="status-dot" /> TU NUEVO ASISTENTE EMPIEZA AQUÍ</div>
        <h1>Configura una atención<br /><em>que nunca se detiene.</em></h1>
        <p>En pocos minutos, Progy aprenderá sobre tu negocio, tu forma de atender y los resultados que quieres conseguir.</p>
        <div className="access-benefits">
          <div><span>01</span><p><b>Cuéntanos sobre tu negocio</b><small>Productos, servicios y forma de atención.</small></p></div>
          <div><span>02</span><p><b>Elige la voz de Progy</b><small>Escucha y compara antes de decidir.</small></p></div>
          <div><span>03</span><p><b>Realiza una prueba completa</b><small>Habla con Progy antes de activarlo.</small></p></div>
        </div>
      </section>
      <section className="access-card">
        <div className="access-tabs" role="tablist" aria-label="Tipo de acceso">
          <button className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")} type="button">Crear cuenta</button>
          <button className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")} type="button">Iniciar sesión</button>
        </div>
        <div className="access-card-head">
          <span className="chip">ACCESO SEGURO</span>
          <h2>{mode === "signup" ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h2>
          <p>{mode === "signup" ? "Empieza con una prueba limitada, sin tarjeta." : "Continúa configurando y probando tu Progy."}</p>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && <label>Nombre completo<input name="name" type="text" autoComplete="name" placeholder="¿Cómo te llamas?" required /></label>}
          <label>Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="tu@negocio.com" required /></label>
          <label>Contraseña<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Mínimo 8 caracteres" minLength={8} required /></label>
          {message && <div className={`form-message ${isError ? "error" : "success"}`} role="status">{message}</div>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Procesando…" : mode === "signup" ? "Crear mi cuenta" : "Entrar a Progy"} <span>↗</span>
          </button>
        </form>
        <div className="form-divider"><span>O CONTINÚA CON</span></div>
        <a className="social-button" href="/api/auth/google">
          <span className="google-mark" aria-hidden="true">G</span>
          Continuar con Google
        </a>
        <p className="access-login">
          {mode === "signup" ? "¿Ya tienes una cuenta? " : "¿Aún no tienes una cuenta? "}
          <button type="button" onClick={() => changeMode(mode === "signup" ? "login" : "signup")}>
            {mode === "signup" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </p>
        <small className="access-note">Tus datos de acceso se procesan de forma segura mediante Supabase y nunca se envían a OpenAI ni a ElevenLabs.</small>
      </section>
      <Link className="access-back" href="/">← Volver al inicio</Link>
    </main>
  );
}
