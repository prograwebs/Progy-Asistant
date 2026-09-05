"use client";

import {
  useEffect,
  useState,
} from "react";

import type { SelectedWorkspace } from "@/lib/shared/types/workspace";
import { launchWhatsAppSignup } from "../../whatsapp/metaSignup";
import {
  TEST_TEMPLATE_BODY,
  TEST_TEMPLATE_NAME,
} from "@/lib/shared/whatsapp/constants";
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
  webhookSubscribedAt?: string | null;
  phoneRegisteredAt?: string | null;
  registrationStatus?: string | null;
  onboardingFlow?: "standard" | "business_app" | null;
  historySyncStatus?: string | null;
  contactsSyncStatus?: string | null;
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

type RegisterResponse = {
  ok?: boolean;
  error?: string;
  webhookSubscribedAt?: string | null;
  phoneRegisteredAt?: string | null;
  registrationStatus?: string | null;
};

type TemplateInfo = {
  id?: string | null;
  name?: string;
  language?: string;
  status?: string;
  category?: string;
};

type TemplateResponse = {
  ok?: boolean;
  exists?: boolean;
  alreadyExists?: boolean;
  error?: string;
  template?: TemplateInfo | null;
  templates?: TemplateInfo[];
};

const TEMPLATE_NAME = TEST_TEMPLATE_NAME;
const TEMPLATE_BODY = TEST_TEMPLATE_BODY;

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

  const [registrationPin, setRegistrationPin] =
    useState("");

  const [registeringPhone, setRegisteringPhone] =
    useState(false);

  const [registrationMessage, setRegistrationMessage] =
    useState("");

  const [creatingTemplate, setCreatingTemplate] =
    useState(false);

  const [checkingTemplate, setCheckingTemplate] =
    useState(false);

  const [templates, setTemplates] =
    useState<TemplateInfo[]>([]);

  const [selectedTemplateName, setSelectedTemplateName] =
    useState(TEMPLATE_NAME);

  const [selectedTemplateLanguage, setSelectedTemplateLanguage] =
    useState("es");

  const [
    fetchedTemplateStatus,
    setFetchedTemplateStatus,
  ] = useState("");

  const [
    fetchedTemplateMessage,
    setFetchedTemplateMessage,
  ] = useState("");

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
   * Cuando no hay conexión o el canal está deshabilitado no queremos mostrar
   * datos de una plantilla que quedaron guardados de otro negocio/conexión.
   */
  const templateStatus = featureEnabled && connection?.wabaId
    ? fetchedTemplateStatus
    : "";

  const templateMessage = featureEnabled && connection?.wabaId
    ? fetchedTemplateMessage
    : "";

  const selectedTemplate = templates.find(
    (template) =>
      template.name === selectedTemplateName &&
      template.language === selectedTemplateLanguage,
  );

  const selectedTemplateStatus = (
    selectedTemplate?.status || templateStatus
  ).toUpperCase();

  /*
   * Carga la conexión persistida en Supabase.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadConnection() {
      setLoadingConnection(true);
      setError("");
      setMessage("");
      setTestResult("");
      setRegistrationMessage("");
      setRegistrationPin("");
      setTemplates([]);
      setSelectedTemplateName(TEMPLATE_NAME);
      setSelectedTemplateLanguage("es");

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
            response.status !== 204 &&
            response.status !== 503
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
          setConnection(
            result.meta,
          );
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
   * Comprueba automáticamente si nuestra
   * plantilla ya existe y cuál es su estado.
   */
  useEffect(() => {
    if (!connection?.wabaId) {
      return;
    }

    let cancelled = false;

    async function loadTemplate() {
      setCheckingTemplate(true);

      try {
        const response = await fetch(
          `/api/whatsapp/templates?businessId=${encodeURIComponent(
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
            .catch(() => ({}))) as TemplateResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setFetchedTemplateStatus("");

          /*
           * No bloqueamos toda la pantalla
           * si solamente falla la consulta
           * de plantilla.
           */
          return;
        }

        const receivedTemplates = result.templates || (
          result.template ? [result.template] : []
        );
        setTemplates(receivedTemplates);

        const preferredTemplate =
          receivedTemplates.find(
            (template) =>
              template.status?.toUpperCase() === "APPROVED",
          ) || result.template;

        if (preferredTemplate?.name) {
          setSelectedTemplateName(preferredTemplate.name);
          setSelectedTemplateLanguage(
            preferredTemplate.language || "es",
          );
        }

        if (
          result.exists &&
          result.template
        ) {
          const status =
            (
              result.template.status ||
              ""
            ).toUpperCase();

          setFetchedTemplateStatus(
            status,
          );

          if (
            status === "APPROVED"
          ) {
            setFetchedTemplateMessage(
              "Plantilla aprobada. Ya puedes enviar el mensaje de prueba.",
            );
          } else {
            setFetchedTemplateMessage(
              `Plantilla encontrada. Estado: ${
                status || "PENDING"
              }.`,
            );
          }
        } else {
          setFetchedTemplateStatus("");
          setFetchedTemplateMessage("");
        }
      } catch {
        if (!cancelled) {
          setFetchedTemplateStatus("");
        }
      } finally {
        if (!cancelled) {
          setCheckingTemplate(false);
        }
      }
    }

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [
    connection?.wabaId,
    workspace.business.id,
  ]);

  /*
   * Embedded Signup.
   *
   * También permite reautorizar una conexión persistida. La conexión anterior
   * solo se reemplaza después de que el servidor valida la nueva autorización.
   */
  async function connect() {
    if (
      !available ||
      connecting ||
      loadingConnection
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

            flow:
              signup.flow,

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

      if (
        !result.meta?.wabaId
      ) {
        throw new Error(
          "WhatsApp fue autorizado, pero Progy no recibió los datos de la conexión.",
        );
      }

      setConnection(
        result.meta,
      );

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
   * Crear nuestra plantilla real
   * dentro de la WABA conectada.
   */
  async function createTestTemplate() {
    if (!connection?.wabaId) {
      setError(
        "Conecta primero el WhatsApp del negocio.",
      );
      return;
    }

    setCreatingTemplate(true);
    setError("");
    setFetchedTemplateMessage("");
    setTestResult("");

    try {
      const response = await fetch(
        "/api/whatsapp/templates",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            businessId:
              workspace.business.id,
          }),
        },
      );

      const result =
        (await response
          .json()
          .catch(() => ({}))) as TemplateResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No pudimos crear la plantilla.",
        );
      }

      const status =
        (
          result.template?.status ||
          "PENDING"
        ).toUpperCase();

      setFetchedTemplateStatus(
        status,
      );
      setSelectedTemplateName(
        result.template?.name || TEMPLATE_NAME,
      );
      setSelectedTemplateLanguage(
        result.template?.language || "es",
      );

      if (
        status === "APPROVED"
      ) {
        setFetchedTemplateMessage(
          "Plantilla aprobada. Ya puedes enviar el mensaje de prueba.",
        );
      } else if (
        status === "PENDING"
      ) {
        setFetchedTemplateMessage(
          "Plantilla creada correctamente. Meta la está revisando.",
        );
      } else {
        setFetchedTemplateMessage(
          `Plantilla creada. Estado: ${status}.`,
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos crear la plantilla.",
      );
    } finally {
      setCreatingTemplate(false);
    }
  }

  async function registerPhone() {
    if (!connection?.wabaId) {
      setError("Conecta primero el WhatsApp del negocio.");
      return;
    }

    if (!/^\d{6}$/.test(registrationPin.trim())) {
      setError("El PIN de seguridad debe tener exactamente 6 dígitos.");
      return;
    }

    setRegisteringPhone(true);
    setError("");
    setRegistrationMessage("");

    try {
      const response = await fetch("/api/whatsapp/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: workspace.business.id,
          pin: registrationPin.trim(),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as RegisterResponse;

      if (!response.ok) {
        throw new Error(result.error || "No pudimos activar el número.");
      }

      setConnection((current) => current ? {
        ...current,
        webhookSubscribedAt: result.webhookSubscribedAt || current.webhookSubscribedAt,
        phoneRegisteredAt: result.phoneRegisteredAt || current.phoneRegisteredAt,
        registrationStatus: result.registrationStatus || "registered",
      } : current);
      setRegistrationPin("");
      setRegistrationMessage("Cloud API quedó activo. El número está listo.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos activar el número de WhatsApp.",
      );
    } finally {
      setRegisteringPhone(false);
    }
  }

  /*
   * Consulta nuevamente el estado de
   * nuestra plantilla sin recargar
   * toda la página.
   */
  async function refreshTemplateStatus() {
    if (!connection?.wabaId) {
      return;
    }

    setCheckingTemplate(true);
    setError("");

    try {
      const response = await fetch(
        `/api/whatsapp/templates?businessId=${encodeURIComponent(
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
          .catch(() => ({}))) as TemplateResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No pudimos comprobar la plantilla.",
        );
      }

      if (
        !result.exists ||
        !result.template
      ) {
        setFetchedTemplateStatus("");
        setFetchedTemplateMessage(
          "La plantilla todavía no existe.",
        );

        return;
      }

      if (result.templates) {
        setTemplates(result.templates);
      }

      const status =
        (
          result.template.status ||
          "PENDING"
        ).toUpperCase();

      setFetchedTemplateStatus(
        status,
      );

      if (
        status === "APPROVED"
      ) {
        setFetchedTemplateMessage(
          "Plantilla aprobada. Ya puedes enviar el mensaje de prueba.",
        );
      } else if (
        status === "PENDING"
      ) {
        setFetchedTemplateMessage(
          "La plantilla sigue pendiente de aprobación por Meta.",
        );
      } else {
        setFetchedTemplateMessage(
          `Estado actual de la plantilla: ${status}.`,
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos comprobar la plantilla.",
      );
    } finally {
      setCheckingTemplate(false);
    }
  }

  /*
   * Envío real.
   *
   * El servidor obtiene de Supabase:
   * - access token
   * - Phone Number ID
   *
   * El navegador solo envía:
   * - businessId
   * - destinatario
   * - plantilla seleccionada
   */
  async function sendTestMessage() {
    if (!featureEnabled) {
      setError("WhatsApp no está habilitado.");
      return;
    }

    if (!connection?.wabaId) {
      setError(
        "Conecta primero el WhatsApp del negocio.",
      );
      return;
    }

    if (selectedTemplateStatus !== "APPROVED") {
      setError(
        "La plantilla debe estar aprobada antes de enviar el mensaje.",
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
        "/api/whatsapp/send-text",
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

            templateName:
              selectedTemplateName,

            templateLanguage:
              selectedTemplateLanguage,
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
    !featureEnabled
      ? "En revisión"
      : loadingConnection
      ? "Comprobando"
      : connection?.wabaId
        ? "AUTORIZADO"
        : available
          ? "Preparado"
          : "En revisión";

  const cloudApiActive = Boolean(
    connection?.wabaId &&
      (connection.registrationStatus === "registered" ||
        connection.onboardingFlow === "business_app" ||
        connection.isOnBizApp),
  );

  const templateApproved =
    selectedTemplateStatus === "APPROVED";

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

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 14,
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.16)",
                  background: "rgba(255,255,255,.04)",
                }}
              >
                <b>
                  {cloudApiActive
                    ? "Cloud API Activo"
                    : "Activación de Cloud API"}
                </b>
                <small>
                  {cloudApiActive
                    ? "Este número está activo y listo para usar WhatsApp Cloud API."
                    : "Crea un PIN de seguridad de 6 dígitos para activar este número en WhatsApp Cloud API."}
                </small>

                {!cloudApiActive && (
                  <>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={registrationPin}
                      onChange={(event) =>
                        setRegistrationPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="Crea un PIN de 6 dígitos"
                      disabled={registeringPhone || !featureEnabled}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,.16)",
                        background: "rgba(255,255,255,.04)",
                        color: "inherit",
                      }}
                    />
                    <small>
                      Este PIN activa la verificación en dos pasos de WhatsApp. Guárdalo en un lugar seguro; Progy no podrá recuperarlo después.
                    </small>
                    <button
                      className={styles.primary}
                      disabled={
                        registeringPhone ||
                        !featureEnabled ||
                        registrationPin.length !== 6
                      }
                      onClick={() => void registerPhone()}
                    >
                      {registeringPhone
                        ? "Activando número…"
                        : "Activar número"}
                    </button>
                  </>
                )}

                {registrationMessage && (
                  <div className={styles.notice}>{registrationMessage}</div>
                )}
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
                loadingConnection
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
                    ? "Reautorizar WhatsApp"
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

        {/* PLANTILLA PARA META */}

        <Card
          className={
            styles.cardHalf
          }
          title="Plantilla de WhatsApp"
          description="Crea y verifica la plantilla utilizada para la prueba de mensajería."
          tag={
            templateApproved
            ? "APROBADA"
              : selectedTemplateStatus ||
                "PREPARAR"
          }
        >
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <div
              style={{
                padding:
                  "14px 16px",
                borderRadius:
                  10,
                border:
                  "1px solid rgba(255,255,255,.16)",
                background:
                  "rgba(255,255,255,.04)",
              }}
            >
              <b>
                {selectedTemplateName}
              </b>

              <p
                style={{
                  margin:
                    "8px 0 0",
                }}
              >
                {selectedTemplateName === TEMPLATE_NAME
                  ? TEMPLATE_BODY
                  : "Plantilla administrada en Meta. Progy validará su estado antes de enviar."}
              </p>
            </div>

            {templates.length > 0 && (
              <label
                style={{
                  display: "grid",
                  gap: 6,
                }}
              >
                <b>Plantilla para la prueba</b>
                <select
                  value={`${selectedTemplateName}::${selectedTemplateLanguage}`}
                  onChange={(event) => {
                    const [name, language] = event.target.value.split("::");
                    setSelectedTemplateName(name || TEMPLATE_NAME);
                    setSelectedTemplateLanguage(language || "es");
                  }}
                  disabled={loadingConnection || !featureEnabled}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.16)",
                    background: "rgba(255,255,255,.04)",
                    color: "inherit",
                  }}
                >
                  {templates.map((template) => (
                    <option
                      key={`${template.name}-${template.language}`}
                      value={`${template.name || ""}::${template.language || "es"}`}
                    >
                      {template.name || "Sin nombre"} · {template.language || "es"} · {template.status || "UNKNOWN"}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {templateMessage && (
              <div
                className={
                  styles.notice
                }
              >
                {templateMessage}
              </div>
            )}

            <div
              className={
                styles.actions
              }
            >
              {templates.length === 0 && !templateStatus && (
                <button
                  className={
                    styles.primary
                  }
                  disabled={
                    creatingTemplate ||
                    checkingTemplate ||
                    loadingConnection ||
                    !featureEnabled ||
                    !connection?.wabaId
                  }
                  onClick={() =>
                    void createTestTemplate()
                  }
                >
                  {creatingTemplate
                    ? "Creando plantilla…"
                    : "Crear plantilla en WhatsApp"}
                </button>
              )}

              {selectedTemplateStatus &&
                !templateApproved && (
                  <button
                    className={
                      styles.primary
                    }
                    disabled={
                      checkingTemplate ||
                      !featureEnabled
                    }
                    onClick={() =>
                      void refreshTemplateStatus()
                    }
                  >
                    {checkingTemplate
                      ? "Comprobando estado…"
                      : "Actualizar estado"}
                  </button>
                )}

              {templateApproved && (
                <button
                  className={
                    styles.primary
                  }
                  disabled
                >
                  Plantilla aprobada
                </button>
              )}
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
                  Conecta primero el
                  WhatsApp del negocio para
                  habilitar el envío.
                </div>
              )}

            {connection?.wabaId &&
              !templateApproved && (
                <div
                  className={
                    styles.notice
                  }
                >
                  Primero crea la plantilla y
                  espera a que Meta la marque
                  como aprobada.
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
                  !featureEnabled ||
                  !connection?.wabaId ||
                  sendingTest
                }
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "12px 14px",
                  borderRadius:
                    10,
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
                {TEMPLATE_BODY}
              </div>

              <small>
                Progy enviará la plantilla
                {` ${TEMPLATE_NAME} `}
                mediante la cuenta de
                WhatsApp Business conectada.
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
                  !featureEnabled ||
                  !connection?.wabaId ||
                  !templateApproved ||
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
