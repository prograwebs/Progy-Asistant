"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Brand } from "@/components/public/Brand";

export default function AccessClient() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"signup" | "login">(params.get("mode") === "signup" ? "signup" : "login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(() => params.get("error") || "");
  const [isError, setIsError] = useState(() => Boolean(params.get("error")));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    if (mode === "signup" && !name) {
      setIsError(true);
      setMessage("Escribe tu nombre completo.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setIsError(true);
      setMessage("Escribe un correo electrónico válido.");
      return;
    }
    if (!password.trim() || (mode === "signup" && password.trim().length < 8)) {
      setIsError(true);
      setMessage(mode === "signup" ? "La contraseña debe tener al menos 8 caracteres." : "Escribe tu contraseña.");
      return;
    }
    setLoading(true);
    const payload = {
      name,
      email,
      password,
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
        window.location.replace("/panel");
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
    setShowPassword(false);
    setMessage("");
    setIsError(false);
  }

  return (
    <>
      <Brand className="brand access-brand" companyLabel="por PrograWebs" ariaLabel="Volver a Progy" />
      <section className="access-copy">
        <div className="eyebrow"><span className="status-dot" /> TU NUEVO ASISTENTE EMPIEZA AQUÍ</div>
        <h1>Configura una atención<br /><span>que nunca se detiene</span></h1>
        <p>En pocos minutos, Progy aprenderá sobre tu negocio, tu forma de atender y los resultados que quieres conseguir.</p>
        <div className="access-benefits">
          <div><span>01</span><p><b>Cuéntanos sobre tu negocio</b><small>Productos, servicios y forma de atención.</small></p></div>
          <div><span>02</span><p><b>Elige la voz de Progy</b><small>Escucha y compara antes de decidir.</small></p></div>
          <div><span>03</span><p><b>Realiza una prueba completa</b><small>Habla con Progy antes de activarlo.</small></p></div>
        </div>
      </section>
      <section className="access-card">
        <div className="access-tabs" role="tablist" aria-label="Tipo de acceso">
          <button className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")} type="button">Iniciar sesión</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")} type="button">Crear cuenta</button>
        </div>
        <div className="access-card-head">
          <h3>{mode === "signup" ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h3>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && <label>Nombre completo<input name="name" type="text" autoComplete="name" placeholder="¿Cómo te llamas?" maxLength={120} required /></label>}
          <label>Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="tu@negocio.com" maxLength={254} required /></label>
          <label className="password-field">
            Contraseña
            <span className="password-input-wrap">
              <input name="password" placeholder="Ingresa tu contraseña" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} maxLength={128} required />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </span>
          </label>
          {message && <div className={`form-message ${isError ? "error" : "success"}`} role="status">{message}</div>}
          <button className="button hover:cursor-pointer" type="submit" disabled={loading}>
            {loading ? "Procesando…" : mode === "signup" ? "Crear mi cuenta" : "Iniciar sesión"}
          </button>
        </form>
        <div className="form-divider"><span>O CONTINÚA CON</span></div>
        <a className="social-button" href="/api/auth/google">
          <Image src="/google.svg" alt="" width={16} height={16} aria-hidden="true" />
          Continuar con Google
        </a>
        <p className="access-login">
          {mode === "signup" ? "¿Ya tienes una cuenta? " : "¿Aún no tienes una cuenta? "}
          <button type="button" onClick={() => changeMode(mode === "signup" ? "login" : "signup")}>
            {mode === "signup" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </p>
      </section>
      <Link className="access-back" href="/">← Volver al inicio</Link>
    </>
  );
}
