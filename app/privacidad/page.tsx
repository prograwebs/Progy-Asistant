import LegalPage from "../_components/legal-page";

export const metadata = {
  title: "Política de privacidad | Progy",
  description: "Política de privacidad de Progy por PrograWebs.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="PRIVACIDAD"
      title="Política de privacidad"
      description="Explicamos qué información utiliza Progy, para qué se utiliza y qué opciones tienen nuestros usuarios sobre sus datos."
    >
      <h2>1. Responsable del servicio</h2>

      <p>
        Progy es una plataforma tecnológica desarrollada por PrograWebs para
        ayudar a negocios a atender consultas, mensajes y otras interacciones
        de sus clientes mediante asistentes de inteligencia artificial.
      </p>

      <h2>2. Información que podemos tratar</h2>

      <p>
        Dependiendo de las funciones utilizadas, Progy puede procesar
        información proporcionada por el propietario del negocio, como nombre
        comercial, información de contacto, horarios, productos, servicios,
        precios, preguntas frecuentes y configuraciones del asistente.
      </p>

      <p>
        Cuando se utilizan integraciones externas, como WhatsApp, también
        podemos recibir los identificadores técnicos necesarios para conectar
        la cuenta autorizada por el negocio.
      </p>

      <h2>3. Información de clientes del negocio</h2>

      <p>
        Cuando un cliente se comunica con un negocio mediante un canal
        conectado a Progy, pueden procesarse datos necesarios para atender la
        conversación, como número de teléfono, nombre proporcionado por el
        cliente, mensajes, solicitudes, pedidos, reservas o información
        relacionada con la atención.
      </p>

      <h2>4. Para qué utilizamos la información</h2>

      <p>La información puede utilizarse para:</p>

      <ul>
        <li>Proporcionar y mantener las funciones de Progy.</li>
        <li>Responder consultas de clientes.</li>
        <li>Gestionar pedidos, reservas o solicitudes.</li>
        <li>Personalizar el asistente de cada negocio.</li>
        <li>Conectar servicios autorizados por el usuario.</li>
        <li>Prevenir abuso, fraude y problemas de seguridad.</li>
        <li>Mejorar el funcionamiento del servicio.</li>
      </ul>

      <h2>5. WhatsApp y Meta</h2>

      <p>
        Cuando un negocio decide conectar WhatsApp, la autorización se realiza
        mediante las herramientas oficiales proporcionadas por Meta. Progy no
        solicita al usuario que entregue su contraseña de Facebook o WhatsApp.
      </p>

      <p>
        Progy únicamente utiliza los permisos y activos autorizados por el
        propietario del negocio para proporcionar las funcionalidades
        solicitadas.
      </p>

      <h2>6. Proveedores tecnológicos</h2>

      <p>
        Para proporcionar determinadas funciones podemos utilizar proveedores
        especializados de infraestructura, autenticación, inteligencia
        artificial, voz y comunicaciones. Estos proveedores reciben únicamente
        la información necesaria para prestar el servicio correspondiente.
      </p>

      <h2>7. Seguridad</h2>

      <p>
        Aplicamos medidas razonables para proteger la información y separar los
        datos correspondientes a cada cuenta y negocio.
      </p>

      <p>
        Las credenciales privadas, tokens y secretos de integraciones no se
        muestran públicamente a otros usuarios de Progy.
      </p>

      <h2>8. Conservación de información</h2>

      <p>
        Conservamos información mientras sea necesaria para proporcionar el
        servicio, cumplir obligaciones legales, resolver disputas o mantener la
        seguridad de la plataforma.
      </p>

      <h2>9. Eliminación de datos</h2>

      <p>
        Los usuarios pueden solicitar la eliminación de sus datos utilizando
        las instrucciones disponibles en la página de eliminación de datos de
        Progy.
      </p>

      <h2>10. Cambios a esta política</h2>

      <p>
        Podemos actualizar esta política cuando cambien las funciones de Progy
        o los requisitos aplicables. La fecha de actualización aparecerá en
        esta página.
      </p>

      <h2>11. Contacto</h2>

      <p>
        Para consultas relacionadas con privacidad o tratamiento de datos
        puedes contactar a PrograWebs mediante:
      </p>

      <p>
        <strong>Correo:</strong> prograwebs0@gmail.com
      </p>
    </LegalPage>
  );
}