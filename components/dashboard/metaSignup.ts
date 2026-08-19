type MetaLoginResponse = {
  authResponse?: { code?: string };
};

type MetaFacebookSdk = {
  init: (options: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
  login: (
    callback: (response: MetaLoginResponse) => void,
    options: {
      config_id: string;
      auth_type?: string;
      response_type: "code";
      override_default_response_type: true;
      extras: {
        setup: Record<string, unknown>;
        featureType?: string;
        sessionInfoVersion: string;
      };
    },
  ) => void;
};

type MetaWindow = Window & {
  FB?: MetaFacebookSdk;
  fbAsyncInit?: () => void;
};

export type EmbeddedSignupResult = {
  code: string;
  wabaId: string;
  phoneNumberId?: string;
  businessId?: string;
  flow: "standard" | "business_app";
};

function loadSdk(appId: string) {
  return new Promise<void>((resolve, reject) => {
    if (!appId) return reject(new Error("La conexión de WhatsApp todavía no está disponible."));
    const metaWindow = window as MetaWindow;

    const initialize = () => {
      if (!metaWindow.FB) return false;
      metaWindow.FB.init({ appId, cookie: true, xfbml: false, version: "v25.0" });
      resolve();
      return true;
    };

    if (initialize()) return;
    metaWindow.fbAsyncInit = () => {
      if (!initialize()) reject(new Error("No pudimos abrir la conexión segura de WhatsApp."));
    };

    const current = document.getElementById("facebook-jssdk") as HTMLScriptElement | null;
    if (current) {
      current.addEventListener("load", () => initialize(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/es_LA/sdk.js";
    script.onerror = () => reject(new Error("No pudimos abrir la conexión segura de WhatsApp."));
    document.body.appendChild(script);
  });
}

export async function launchWhatsAppSignup(appId: string, configId: string): Promise<EmbeddedSignupResult> {
  if (!configId) throw new Error("La conexión de WhatsApp todavía no está disponible.");
  await loadSdk(appId);
  const metaWindow = window as MetaWindow;
  const facebook = metaWindow.FB;
  if (!facebook) throw new Error("No pudimos iniciar la conexión con WhatsApp.");

  return new Promise((resolve, reject) => {
    let code = "";
    let assets: Omit<EmbeddedSignupResult, "code"> | null = null;
    let finished = false;

    const timeout = window.setTimeout(() => fail("La autorización tardó demasiado. Inténtalo nuevamente."), 5 * 60 * 1000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error(message));
    };
    const complete = () => {
      if (finished || !code || !assets?.wabaId) return;
      finished = true;
      cleanup();
      resolve({ ...assets, code });
    };

    function onMessage(event: MessageEvent) {
      if (!event.origin.endsWith("facebook.com")) return;
      let payload: { type?: string; event?: string; data?: { waba_id?: string; phone_number_id?: string; business_id?: string; error_message?: string } } | null = null;
      try {
        payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (payload.event === "CANCEL") return fail("La conexión fue cancelada antes de terminar.");
      if (payload.event === "ERROR") return fail(payload.data?.error_message || "WhatsApp no pudo completar la autorización.");

      if (payload.event === "FINISH" || payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
        const wabaId = payload.data?.waba_id || "";
        if (!wabaId) return fail("WhatsApp terminó la autorización sin devolver la cuenta seleccionada.");
        assets = {
          wabaId,
          phoneNumberId: payload.data?.phone_number_id,
          businessId: payload.data?.business_id,
          flow: payload.event === "FINISH" ? "standard" : "business_app",
        };
        complete();
      }
    }

    window.addEventListener("message", onMessage);
    facebook.login((response) => {
      code = response.authResponse?.code?.trim() || "";

      if (!code) {
        return fail("La autorización no se completó.");
      }

      complete();
    }, {
      config_id: configId,
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {},
        sessionInfoVersion: "3",
      },
    });
  });
}
