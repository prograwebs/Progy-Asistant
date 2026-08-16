import LandingMotion from "@/components/landing/LandingMotion";
import { Brand } from "@/components/public/Brand";

const industries = [
  { tag: "RE", title: "Restaurantes", text: "Toma pedidos, confirma entrega o retiro y comparte el resumen por WhatsApp." },
  { tag: "CL", title: "Clínicas", text: "Responde dudas, identifica la necesidad y agenda citas sin interrumpir al equipo." },
  { tag: "HO", title: "Hoteles", text: "Consulta disponibilidad, registra datos y acompaña cada solicitud de reserva." },
  { tag: "FE", title: "Ferreterías", text: "Busca productos, prepara cotizaciones y recopila los datos de entrega." },
];

const features = [
  ["01", "Conoce tu negocio", "Carga servicios, precios, horarios, políticas y preguntas frecuentes."],
  ["02", "Habla con naturalidad", "Elige una voz en español, ajusta el estilo y escucha el resultado antes de activarlo."],
  ["03", "Resuelve y registra", "Progy convierte conversaciones en pedidos, reservas, cotizaciones o transferencias."],
];

export default function Home() {
  return (
    <LandingMotion>
      <header className="topbar">
        <Brand href="#inicio" />
        <nav aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#soluciones">Soluciones</a>
          <a href="#planes">Planes</a>
          <a href="#preguntas">Preguntas</a>
        </nav>
        <div className="nav-actions">
          <a className="text-link" href="/acceso">Iniciar sesión</a>
          <a className="button button-small" href="/acceso">Probar gratis <span>↗</span></a>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-glow" />
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> Asistente de voz para negocios reales</div>
          <h1>Tu negocio responde<br /><span>Incluso cuando tú no puedes</span></h1>
          <p className="hero-lead">Progy atiende las llamadas de tus clientes, responde consultas y registra pedidos o reservas con una voz natural y el conocimiento de tu negocio.</p>
          <div className="hero-actions">
            <a className="button" href="/acceso">Crear mi Progy <span>↗</span></a>
            <a className="button button-ghost" href="#como-funciona"><span className="play">▶</span> Ver cómo funciona</a>
          </div>
          <p className="microcopy"><span>✓</span> Configuración guiada <span>✓</span> Prueba gratuita <span>✓</span> Sin tarjeta</p>
        </div>

        <div className="hero-stage" aria-label="Demostración visual de una conversación con Progy">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="call-card">
            <div className="call-head">
              <div className="progy-avatar"><span /><span /><span /></div>
              <div><strong>Progy está atendiendo</strong><small>Restaurante Casa Manabita</small></div>
              <span className="live-pill">EN VIVO</span>
            </div>
            <div className="wave" aria-hidden="true">
              {[22,34,52,28,65,42,76,48,30,60,85,44,66,38,54,26,40,68,36,25].map((h,i)=><i key={i} style={{height:`${h}%`}} />)}
            </div>
            <div className="transcript">
              <small>PROGY ENTENDIÓ</small>
              <p>“Perfecto, una parrillada familiar para cuatro personas, con entrega a domicilio.”</p>
            </div>
            <div className="call-result">
              <span className="result-icon">✓</span>
              <div><small>ACCIÓN COMPLETADA</small><strong>Pedido #1048 registrado</strong></div>
              <b>$ 38,50</b>
            </div>
          </div>
          <div className="float-card float-top"><span>◉</span><div><small>Llamadas atendidas hoy</small><strong>24</strong></div><em>+18%</em></div>
          <div className="float-card float-bottom"><span>✓</span><div><small>Tiempo ahorrado</small><strong>3 h 42 min</strong></div></div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Beneficios principales">
        <p>Un nuevo tipo de atención para</p>
        <div><span>●</span> Conversaciones naturales</div>
        <div><span>●</span> WhatsApp Business</div>
        <div><span>●</span> Pedidos y reservas</div>
        <div><span>●</span> Atención 24/7</div>
      </section>

      <section className="section intro-section" id="como-funciona">
        <div className="section-kicker">CONFIGURAR PROGY ES SIMPLE</div>
        <div className="section-heading">
          <h2>Enséñale una vez<br /><span>Progy atiende cada día</span></h2>
          <p>No necesitas programar ni aprender herramientas complicadas. Te guiamos paso a paso para convertir la información de tu negocio en una atención consistente.</p>
        </div>
        <div className="steps-grid">
          {features.map(([number,title,text]) => (
            <article className="step-card" key={number}>
              <span className="step-number">{number}</span>
              <div className={`step-visual visual-${number}`}><span /><span /><span /></div>
              <h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section bento-section" id="soluciones">
        <div className="section-kicker">TODO EN UN SOLO LUGAR</div>
        <div className="section-heading compact">
          <h2>Una conversación que<br /><span>termina en resultados</span></h2>
          <p>Progy no se limita a responder. Entiende lo que necesita cada cliente y ayuda a que el siguiente paso realmente ocurra.</p>
        </div>
        <div className="bento-grid">
          <article className="bento bento-large">
            <div><span className="chip">ATENCIÓN INTELIGENTE</span><h3>Respuestas con el conocimiento de tu negocio</h3><p>Horarios, precios, disponibilidad y políticas siempre claros, incluso cuando tu equipo está ocupado.</p></div>
            <div className="knowledge-ui">
              <div className="knowledge-head"><strong>Conocimiento</strong><span>Actualizado</span></div>
              <div className="knowledge-row active"><i>✓</i><span><b>Servicios y precios</b><small>38 elementos</small></span></div>
              <div className="knowledge-row"><i>✓</i><span><b>Preguntas frecuentes</b><small>24 respuestas</small></span></div>
              <div className="knowledge-row"><i>✓</i><span><b>Horarios y políticas</b><small>Listo para atender</small></span></div>
            </div>
          </article>
          <article className="bento voice-bento">
            <span className="chip">VOZ E IDIOMA</span><h3>Una voz que representa tu marca</h3><p>Compara voces, acentos y estilos antes de elegir.</p>
            <div className="voice-preview"><button aria-label="Reproducir voz">▶</button><div className="mini-wave">{[18,42,29,60,34,70,45,26,58,38,64,24,46,31,55].map((h,i)=><i key={i} style={{height:`${h}%`}} />)}</div><small>00:08</small></div>
          </article>
          <article className="bento whatsapp-bento">
            <span className="chip">WHATSAPP</span><h3>La llamada continúa en el chat</h3><p>Envía automáticamente resúmenes, ubicaciones e instrucciones de pago.</p>
            <div className="message"><span>✓</span><div><b>Pedido confirmado</b><small>Resumen enviado al cliente</small></div></div>
          </article>
        </div>
      </section>

      <section className="section industry-section">
        <div className="section-kicker">HECHO PARA TU NEGOCIO</div>
        <div className="section-heading compact"><h2>Progy aprende la forma<br /><span>en que tú trabajas</span></h2><p>Empieza con una estructura preparada para tu industria y personalízala según tus procesos.</p></div>
        <div className="industry-grid">
          {industries.map((item, i)=><article key={item.title} className="industry-card"><span className="industry-tag">{item.tag}</span><small>0{i+1}</small><h3>{item.title}</h3><p>{item.text}</p><a href="/acceso">Configurar plantilla <span>→</span></a></article>)}
        </div>
      </section>

      <section className="section pricing-section" id="planes">
        <div className="section-kicker">CRECE A TU RITMO</div>
        <div className="section-heading centered"><h2>Empieza gratis. Activa más<br /><span>cuando tu negocio lo necesite</span></h2><p>Prueba la experiencia antes de pagar. Todos los planes muestran con claridad el consumo de tu asistente.</p></div>
        <div className="pricing-grid">
          <article className="price-card"><div><small>PRUEBA</small><h3>Descubre Progy</h3><p>Para configurar y escuchar tu primer asistente.</p></div><div className="price"><b>$0</b><span>sin tarjeta</span></div><ul><li>✓ Un asistente de prueba</li><li>✓ Conocimiento básico</li><li>✓ Pruebas de voz limitadas</li><li>✓ Simulación desde la web</li></ul><a className="button button-ghost" href="/acceso">Comenzar gratis</a></article>
          <article className="price-card featured"><div className="recommended">MÁS ELEGIDO</div><div><small>NEGOCIO</small><h3>Progy en acción</h3><p>Para negocios que quieren atender y convertir más.</p></div><div className="price"><b>A medida</b><span>según consumo</span></div><ul><li>✓ Llamadas por WhatsApp</li><li>✓ Más minutos y voces</li><li>✓ Pedidos y reservas</li><li>✓ Historial y resúmenes</li><li>✓ Transferencia a una persona</li></ul><a className="button" href="/acceso">Crear mi Progy <span>↗</span></a></article>
          <article className="price-card"><div><small>PRO</small><h3>Automatiza más</h3><p>Para equipos con mayor volumen y procesos propios.</p></div><div className="price"><b>Personalizado</b><span>solución flexible</span></div><ul><li>✓ Todo lo del plan Negocio</li><li>✓ Múltiples asistentes</li><li>✓ Automatizaciones</li><li>✓ Integraciones a medida</li></ul><a className="button button-ghost" href="#contacto">Hablar con nosotros</a></article>
        </div>
      </section>

      <section className="section faq-section" id="preguntas">
        <div><div className="section-kicker">PREGUNTAS FRECUENTES</div><h2>Antes de darle<br /><span>la bienvenida a Progy</span></h2><p>Si tienes un proceso particular, nuestro equipo puede ayudarte a configurarlo.</p><a href="#contacto" className="text-cta">Conversar con Prograwebs →</a></div>
        <div className="faq-list">
          <details open><summary>¿Necesito conocimientos técnicos?<span>+</span></summary><p>No. Progy se configura con preguntas claras sobre tu negocio, como si estuvieras formando a una persona nueva en tu equipo.</p></details>
          <details><summary>¿Puedo probar la voz antes de pagar?<span>+</span></summary><p>Sí. La prueba gratuita incluye una simulación y una cuota limitada para elegir la voz y revisar cómo responderá.</p></details>
          <details><summary>¿Progy puede tomar pedidos o reservas?<span>+</span></summary><p>Sí. Puede recopilar la información, confirmar el resultado y dejarlo registrado para que tu equipo continúe.</p></details>
          <details><summary>¿Qué pasa si un cliente necesita hablar con alguien?<span>+</span></summary><p>Definirás cuándo Progy debe transferir la conversación o avisar a una persona de tu equipo.</p></details>
        </div>
      </section>

      <section className="cta-section" id="contacto">
        <div className="cta-orb"><span /><span /><span /></div>
        <div><small>CONSTRUYE UNA MEJOR ATENCIÓN</small><h2>Tu próximo cliente<br />ya está llamando.</h2><p>Configura tu primer asistente y descubre cómo Progy puede atender mejor, incluso en los momentos más ocupados.</p></div>
        <div className="cta-actions"><a className="button button-light" href="/acceso">Probar Progy gratis <span>↗</span></a><p>¿Necesitas ayuda? <a href="https://prograwebs.com/">Habla con Prograwebs</a></p></div>
      </section>

      <footer>
        <div className="footer-brand"><Brand href="#inicio" showCompany={false} /><p>Tecnología explicada para negocios reales.</p></div>
        <div><strong>Producto</strong><a href="#como-funciona">Cómo funciona</a><a href="#soluciones">Soluciones</a><a href="#planes">Planes</a></div>
        <div><strong>Prograwebs</strong><a href="https://prograwebs.com/">Nosotros</a><a href="#contacto">Contacto</a><a href="#preguntas">Preguntas frecuentes</a></div>
        <div className="footer-end"><p>Una solución de <b>Prograwebs</b><br />Ecuador</p><small>© 2026 Prograwebs</small></div>
      </footer>
    </LandingMotion>
  );
}
