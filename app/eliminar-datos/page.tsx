import LegalPage from "../_components/legal-page";

export const metadata = {
  title: "Eliminación de datos | Progy",
  description: "Instrucciones para solicitar la eliminación de datos de Progy.",
};

export default function DeleteDataPage() {
  return (
    <LegalPage
      eyebrow="CONTROL DE TUS DATOS"
      title="Eliminación de datos"
      description="Puedes solicitar la eliminación de tu cuenta y de la información asociada a tu uso de Progy."
    >
      <h2>Cómo solicitar la eliminación</h2>

      <p>
        Si deseas solicitar la eliminación de información asociada a tu cuenta
        de Progy, envía un correo electrónico a:
      </p>

      <p>
        <strong>prograwebs0@gmail.com</strong>
      </p>

      <p>
        Utiliza como asunto:
      </p>

      <p>
        <strong>Solicitud de eliminación de datos de Progy</strong>
      </p>

      <h2>Información necesaria</h2>

      <p>
        Para identificar correctamente la cuenta, incluye:
      </p>

      <ul>
        <li>Correo utilizado para iniciar sesión en Progy.</li>
        <li>Nombre del negocio asociado a la cuenta.</li>
        <li>
          Una indicación clara de que deseas eliminar la información de la
          cuenta.
        </li>
      </ul>

      <h2>Qué información se eliminará</h2>

      <p>
        Cuando la solicitud sea validada, eliminaremos o desvincularemos, según
        corresponda:
      </p>

      <ul>
        <li>Información del perfil de Progy.</li>
        <li>Configuración de negocios asociados.</li>
        <li>Configuraciones del asistente.</li>
        <li>Conocimiento y catálogo almacenado.</li>
        <li>Integraciones asociadas a la cuenta.</li>
        <li>
          Otros datos personales que no deban conservarse por una obligación
          legal o de seguridad.
        </li>
      </ul>

      <h2>Desconectar Meta o WhatsApp</h2>

      <p>
        Si solamente deseas dejar de utilizar WhatsApp con Progy, puedes
        solicitar que se desconecte esa integración sin necesidad de eliminar
        completamente tu cuenta.
      </p>

      <h2>Plazo de atención</h2>

      <p>
        Revisaremos la solicitud y procesaremos la eliminación dentro de un
        plazo razonable después de verificar que la solicitud proviene del
        propietario autorizado de la cuenta.
      </p>

      <h2>Contacto</h2>

      <p>
        Para cualquier duda relacionada con eliminación de datos:
      </p>

      <p>
        <strong>prograwebs0@gmail.com</strong>
      </p>
    </LegalPage>
  );
}