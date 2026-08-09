import LegalPage from "../_components/legal-page";

export const metadata = {
  title: "Términos y condiciones | Progy",
  description: "Términos y condiciones de uso de Progy.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="CONDICIONES DEL SERVICIO"
      title="Términos y condiciones"
      description="Estas condiciones regulan el acceso y uso de Progy y sus funcionalidades para negocios."
    >
      <h2>1. Sobre Progy</h2>

      <p>
        Progy es una plataforma de PrograWebs diseñada para ayudar a negocios a
        automatizar parte de la atención a clientes mediante inteligencia
        artificial e integraciones con servicios de terceros.
      </p>

      <h2>2. Uso del servicio</h2>

      <p>
        El usuario se compromete a utilizar Progy únicamente para actividades
        legítimas relacionadas con su negocio y de conformidad con las leyes y
        políticas aplicables.
      </p>

      <h2>3. Cuenta del usuario</h2>

      <p>
        El propietario de la cuenta es responsable de mantener protegidos sus
        accesos y de garantizar que la información configurada en Progy sea
        correcta y esté autorizada.
      </p>

      <h2>4. Información del negocio</h2>

      <p>
        El usuario es responsable de los precios, productos, servicios,
        horarios, políticas y demás información que proporciona a Progy.
      </p>

      <p>
        Progy utilizará esa información para generar respuestas y ejecutar las
        funciones habilitadas por el negocio.
      </p>

      <h2>5. Servicios externos</h2>

      <p>
        Algunas funciones dependen de servicios externos, incluyendo
        proveedores de mensajería, inteligencia artificial, voz,
        autenticación e infraestructura.
      </p>

      <p>
        La disponibilidad de ciertas funciones también puede depender de las
        políticas y condiciones establecidas por esos proveedores.
      </p>

      <h2>6. WhatsApp</h2>

      <p>
        Para utilizar funciones relacionadas con WhatsApp, el usuario debe
        contar con autorización suficiente sobre el número y la cuenta
        empresarial que decida conectar.
      </p>

      <p>
        El usuario acepta cumplir las políticas de WhatsApp Business y las
        reglas aplicables al envío de mensajes comerciales.
      </p>

      <h2>7. Uso responsable de inteligencia artificial</h2>

      <p>
        Las respuestas generadas automáticamente pueden contener errores. El
        negocio debe revisar y mantener actualizada la información utilizada
        por su asistente.
      </p>

      <p>
        Progy no debe utilizarse como sustituto de profesionales cualificados
        en situaciones que requieran asesoramiento médico, jurídico,
        financiero u otras decisiones de alto riesgo.
      </p>

      <h2>8. Disponibilidad</h2>

      <p>
        Trabajamos para mantener Progy disponible, pero no garantizamos que el
        servicio funcione de forma ininterrumpida en todo momento.
      </p>

      <h2>9. Suspensión</h2>

      <p>
        Podemos limitar o suspender una cuenta cuando exista uso fraudulento,
        incumplimiento de estas condiciones, riesgo de seguridad o violación de
        las políticas de proveedores conectados.
      </p>

      <h2>10. Modificaciones</h2>

      <p>
        Progy puede evolucionar e incorporar, modificar o retirar
        funcionalidades. Las condiciones también pueden actualizarse cuando
        sea necesario.
      </p>

      <h2>11. Contacto</h2>

      <p>
        Para consultas sobre estas condiciones:
      </p>

      <p>
        <strong>Correo:</strong> prograwebs0@gmail.com
      </p>
    </LegalPage>
  );
}