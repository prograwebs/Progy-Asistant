"use client";

import {
  useEffect,
  useState,
} from "react";

import type { SelectedWorkspace } from "../types";
import { launchWhatsAppSignup } from "../metaSignup";
import { Card, SectionHeader } from "../ui";
import { DashboardIcon } from "../LineIcon";
import styles from "../ProgyDashboard.module.css";

type Connection = {
  wabaId?: string | null;
  wabaName?: string | null;
  phoneNumberId?: string | null;
  phoneNumber?: string | null;
  verifiedName?: string | null;
  isOnBizApp?: boolean;
  platformType?: string | null;
};

type ConnectionResponse = {
  connected?: boolean;
  meta?: Connection | null;
  error?: string;
};

type SendMessageResponse = {
  ok?: boolean;
  error?: string;
  messageId?: string | null;
};

export default function WhatsAppSection({
  workspace,
}: {
  workspace: SelectedWorkspace;
}) {
  const [connecting, setConnecting] =
    useState(false);

  const [loadingConnection, setLoadingConnection] =
    useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [connection, setConnection] =
    useState<Connection | null>(null);

  const [testPhone, setTestPhone] =
    useState("");

  const [sendingTest, setSendingTest] =
    useState(false);

  const [testResult, setTestResult] =
    useState("");

  const appId =
    process.env.NEXT_PUBLIC_META_APP_ID || "";

  const configId =
    process.env.NEXT_PUBLIC_META_CONFIG_ID || "";

  const featureEnabled =
    process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true";

  const available =
    featureEnabled &&
    Boolean(appId && configId);

  /*
   * Recuperar conexión guardada.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadConnection() {
      setLoadingConnection(true);
      setError("");
      setMessage("");
      setTestResult("");

      try {
        const response = await fetch(
          `/api/whatsapp/connect?businessId=${encodeURIComponent(
            workspace.business.id,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result =
          (await response
            .json()
            .catch(() => ({}))) as ConnectionResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setConnection(null);

          if (
            response.status !== 404 &&
            response.status !== 204
          ) {
            setError(
              result.error ||
                "No pudimos comprobar la conexión de WhatsApp.",
            );
          }

          return;
        }

        if (
          result.connected &&
          result.meta
        ) {
          setConnection(result.meta);
        } else {
          setConnection(null);
        }
      } catch {
        if (!cancelled) {
          setConnection(null);

          setError(
            "No pudimos comprobar la conexión de WhatsApp.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingConnection(false);
        }
      }
    }

    void loadConnection();

    return () => {
      cancelled = true;
    };
  }, [workspace.business.id]);

  /*
   * Conectar WhatsApp mediante Embedded Signup.
   */
  async function connect() {
    if (
      !available ||
      connecting ||
      loadingConnection ||
      connection?.wabaId
    ) {
      return;
    }

    setConnecting(true);
    setError("");
    setMessage("");
    setTestResult("");

    try {
      const signup =
        await launchWhatsAppSignup(
          appId,
          configId,
        );

      setMessage(
        "Autorización recibida. Estamos comprobando y guardando el número seleccionado…",
      );

      const response = await fetch(
        "/api/whatsapp/connect",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            code:
              signup.code,

            wabaId:
              signup.wabaId,

            phoneNumberId:
              signup.phoneNumberId,

            businessId:
              signup.businessId,

            progyBusinessId:
              workspace.business.id,
          }),
        },
      );

      const result =
        (await response
          .json()
          .catch(() => ({}))) as ConnectionResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No pudimos terminar la conexión de WhatsApp.",
        );
      }

      if (!result.meta?.wabaId) {
        throw new Error(
          "WhatsApp fue autorizado, pero Progy no recibió los datos de la conexión.",
        );
      }

      setConnection(result.meta);

      setMessage(
        "WhatsApp quedó autorizado y guardado para este negocio.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar WhatsApp.",
      );
    } finally {
      setConnecting(false);
    }
  }

  /*
   * Envía la plantilla oficial hello_world.
   *
   * El navegador únicamente manda:
   * - businessId
   * - número destino
   *
   * Token y Phone Number ID permanecen
   * exclusivamente en el servidor.
   */
  async function sendTestMessage() {
    if (!connection?.wabaId) {
      setError(
        "Conecta primero el WhatsApp del negocio.",
      );
      return;
    }

    if (!testPhone.trim()) {
      setError(
        "Escribe el número del destinatario.",
      );
      return;
    }

    setSendingTest(true);
    setError("");
    setTestResult("");

    try {
      const response = await fetch(
        "/api/whatsapp/send-test",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            businessId:
              workspace.business.id,

            to:
              testPhone,
          }),
        },
      );

      const result =
        (await response
          .json()
          .catch(() => ({}))) as SendMessageResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No pudimos enviar el mensaje.",
        );
      }

      setTestResult(
        result.messageId
          ? `Mensaje enviado correctamente. ID: ${result.messageId}`
          : "Mensaje enviado correctamente por WhatsApp.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos enviar el mensaje.",
      );
    } finally {
      setSendingTest(false);
    }
  }

  const statusTag =
    loadingConnection
      ? "Comprobando"
      : connection?.wabaId
        ? "Autorizado"
        : available
          ? "Preparado"
          : "En revisión";

  return (
    <>
      <SectionHeader
        eyebrow="UN CANAL MÁS PARA TU ASISTENTE"
        title="WhatsApp"
        description="Conecta el WhatsApp del negocio una sola vez. Progy conservará la conexión para utilizarla en mensajes, pedidos, citas y otras automatizaciones."
      />

      {error && (
        <div
          className={
            styles.errorBanner
          }
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className={
            styles.notice
          }
        >
          {message}
        </div>
      )}

      <div
        className={
          styles.grid
        }
      >
        {/* CONEXIÓN */}

        <Card
          className={
            styles.cardHalf
          }
          title="WhatsApp del negocio"
          description={`Cuenta para ${workspace.business.name}`}
          tag={statusTag}
        >
          {loadingConnection ? (
            <div
              className={
                styles.empty
              }
            >
              <div>
                <b>
                  Comprobando conexión…
                </b>

                <p>
                  Estamos verificando si este
                  negocio ya tiene WhatsApp
                  conectado.
                </p>
              </div>
            </div>
          ) : connection?.wabaId ? (
            <div
              className={
                styles.list
              }
            >
              <div
                className={
                  styles.listRow
                }
              >
                <div>
                  <b>
                    {connection.verifiedName ||
                      connection.wabaName ||
                      workspace.business.name}
                  </b>

                  <small>
                    {connection.phoneNumber ||
                      "Número autorizado"}
                  </small>
                </div>

                <strong>
                  <DashboardIcon
                    name="check"
                    size={17}
                  />
                </strong>
              </div>

              <div
                className={
                  styles.listRow
                }
              >
                <div>
                  <b>
                    {connection.isOnBizApp
                      ? "WhatsApp Business conectado"
                      : "Canal autorizado"}
                  </b>

                  <small>
                    La conexión está guardada
                    para este negocio.
                  </small>
                </div>

                <strong>
                  <DashboardIcon
                    name="check"
                    size={17}
                  />
                </strong>
              </div>
            </div>
          ) : (
            <div
              className={
                styles.empty
              }
            >
              <div>
                <b>
                  {available
                    ? "Listo para autorizar"
                    : "Canal en revisión"}
                </b>

                <p>
                  {available
                    ? "Autoriza WhatsApp una sola vez. Después Progy conservará la conexión."
                    : "Puedes continuar configurando Progy mientras terminamos de habilitar este canal."}
                </p>
              </div>
            </div>
          )}

          <div
            className={
              styles.actions
            }
          >
            <button
              className={
                styles.primary
              }
              disabled={
                !available ||
                connecting ||
                loadingConnection ||
                Boolean(
                  connection?.wabaId,
                )
              }
              onClick={() =>
                void connect()
              }
            >
              {loadingConnection
                ? "Comprobando…"
                : connecting
                  ? "Abriendo WhatsApp…"
                  : connection?.wabaId
                    ? "WhatsApp conectado"
                    : available
                      ? "Conectar WhatsApp"
                      : "Disponible próximamente"}
            </button>
          </div>
        </Card>

        {/* FUNCIONES */}

        <Card
          className={
            styles.cardHalf
          }
          title="Qué podrá hacer Progy"
          description="El canal utilizará el mismo conocimiento y las mismas reglas configuradas para el negocio."
        >
          <div
            className={
              styles.list
            }
          >
            <div
              className={
                styles.listRow
              }
            >
              <div>
                <b>
                  Responder mensajes
                </b>

                <small>
                  Consultas de productos,
                  servicios, horarios y
                  políticas.
                </small>
              </div>

              <strong>
                01
              </strong>
            </div>

            <div
              className={
                styles.listRow
              }
            >
              <div>
                <b>
                  Enviar información útil
                </b>

                <small>
                  Confirmaciones y datos
                  relevantes cuando
                  corresponda.
                </small>
              </div>

              <strong>
                02
              </strong>
            </div>

            <div
              className={
                styles.listRow
              }
            >
              <div>
                <b>
                  Registrar resultados
                </b>

                <small>
                  Pedidos, citas y reservas
                  visibles en el mismo panel.
                </small>
              </div>

              <strong>
                03
              </strong>
            </div>
          </div>
        </Card>

        {/* PRUEBA DE MENSAJERÍA */}

        <Card
          className={
            styles.cardHalf
          }
          title="Prueba de mensajería"
          description="Envía un mensaje real desde Progy para comprobar que el canal funciona correctamente."
          tag="PRUEBA"
        >
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            {!loadingConnection &&
              !connection?.wabaId && (
                <div
                  className={
                    styles.notice
                  }
                >
                  Conecta primero el WhatsApp
                  del negocio para habilitar
                  el envío.
                </div>
              )}

            <label
              style={{
                display: "grid",
                gap: 6,
              }}
            >
              <b>
                Número del destinatario
              </b>

              <input
                value={
                  testPhone
                }
                onChange={(
                  event,
                ) =>
                  setTestPhone(
                    event.target.value,
                  )
                }
                placeholder="593999999999"
                inputMode="tel"
                autoComplete="tel"
                disabled={
                  loadingConnection ||
                  !connection?.wabaId ||
                  sendingTest
                }
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "12px 14px",
                  borderRadius: 10,
                  border:
                    "1px solid rgba(255,255,255,.16)",
                  background:
                    "rgba(255,255,255,.04)",
                  color:
                    "inherit",
                  opacity:
                    loadingConnection ||
                    !connection?.wabaId
                      ? 0.6
                      : 1,
                }}
              />

              <small>
                Incluye el código de país,
                sin + ni espacios. Ejemplo:
                593999999999.
              </small>
            </label>

            <div
              style={{
                display: "grid",
                gap: 6,
              }}
            >
              <b>
                Mensaje de prueba
              </b>

              <div
                style={{
                  padding:
                    "12px 14px",
                  borderRadius:
                    10,
                  border:
                    "1px solid rgba(255,255,255,.16)",
                  background:
                    "rgba(255,255,255,.04)",
                }}
              >
                Plantilla oficial de prueba
                de WhatsApp
              </div>

              <small>
                Progy enviará la plantilla
                oficial hello_world
                autorizada por Meta.
              </small>
            </div>

            <div
              className={
                styles.actions
              }
            >
              <button
                className={
                  styles.primary
                }
                disabled={
                  sendingTest ||
                  loadingConnection ||
                  !connection?.wabaId ||
                  !testPhone.trim()
                }
                onClick={() =>
                  void sendTestMessage()
                }
              >
                {sendingTest
                  ? "Enviando mensaje…"
                  : "Enviar prueba a WhatsApp"}
              </button>
            </div>

            {testResult && (
              <div
                className={
                  styles.notice
                }
              >
                ✓ {testResult}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}