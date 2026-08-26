Ayúdame por favor a refactorizar el onboarding en [BusinessOnboarding.tsx](/mnt/hdd/Proyectos/fullstack/Progy-Asistant/components/dashboard/BusinessOnboarding.tsx) . Actualmente solamente está una sola pantalla grande de configuracion, lo cual es pésimo en experiencia de usuario UX y en brindarle una demostración rápida al usuario que esté interesado. La idea es simplificar no pedir que llene mucha información, cargar templates con info precargada eso te menciono pero lo vemos luego; que sera de diferentes negocios y pasar por tres fases o onboarding, la primera en donde seleccionaría la categoría de su empresa, de su negocio y el nombre de su negocio, la segunda ya pasamos a mostrar para que pruebe cómo sonaría o cómo progy respondería cuando un cliente se contacte con el negocio. y la tercerra es decir que se conecte a whatsapp.

Sí: el problema principal no está en la estética actual, sino en el orden en que Progy entrega valor.

Ahora mismo el usuario entra y Progy básicamente le dice:

“Antes de que veas lo que puedo hacer, configúrame.”

Y para un SaaS nuevo eso es una barrera fuerte. El usuario todavía no está convencido de que valga la pena llenar horarios, catálogo, conocimiento, acciones, voz, WhatsApp, etc.
Lo que veo problemático en el flujo actual

Visualmente, Progy ya tiene una base bastante sólida. Se siente como un producto SaaS real y no como un prototipo. El problema está en la experiencia inicial.
1. La primera pantalla pide demasiado
Actualmente entras a algo como:

tipo de negocio
nombre comercial
teléfono
WhatsApp
web
ciudad
provincia
dirección
descripción
Para alguien que acaba de registrarse son demasiados datos cuando todavía no ha escuchado a Progy ni ha comprobado qué hace.
2. El dashboard aparece antes de que exista algo interesante

Tu dashboard actual está bien construido, pero cuando está vacío presenta:

0 conversaciones
0 pedidos
0 reservas
$0
configuración 50%
varios elementos pendientes

Es decir, la primera experiencia real del usuario es prácticamente una colección de ceros y tareas pendientes.
Eso psicológicamente comunica:
“Todavía tienes mucho que hacer.”
En vez de:
“Mira lo que Progy acaba de hacer por ti.”


# PLAN REAL
El onboarding debe demostrar valor en menos de 2 minutos. La activación completa puede ocurrir después, dentro del dashboard.

## Flujo definitivo que te recomiendo

```text
REGISTRO / LOGIN
        ↓
1. CREA TU PROGY
Nombre del negocio + plantilla
        ↓
2. CONOCE A PROGY
Elegir 1 de 2 voces
Escuchar saludo
Probar 2 situaciones precargadas
        ↓
3. CONECTA WHATSAPP
Meta Embedded Signup
o "Lo haré después"
        ↓
DASHBOARD DE PREPARACIÓN
        ↓
Completar información real
Catálogo
Horarios
Conocimiento
Acciones
Prueba real
        ↓
LISTO PARA ATENDER
        ↓
DASHBOARD OPERATIVO
```

La parte importante es esta última: **yo no mostraría el mismo dashboard antes y después de estar configurado**.

---

# 1. Pantalla: Crea tu Progy

Esta debería ser muchísimo más sencilla que tu pantalla actual.

### Encabezado

**Vamos a crear tu Progy**

> Cuéntanos qué negocio tienes y prepararemos una primera versión para que puedas probarla.

### Campo

**Nombre de tu negocio**

`Ej. Clínica San Gabriel`

### Selección

**¿Qué tipo de negocio tienes?**

Cinco templates principales:

* Clínica
* Salón de belleza
* Ferretería
* Hotel
* Restaurante

Y finalmente:

**Otro negocio**

No pondría 15 categorías.

Tus cinco verticales están perfectamente alineados con el problema que quieres resolver: negocios con alto volumen de preguntas repetitivas por WhatsApp, audio y llamadas.

### CTA

**Crear mi Progy**

Arriba podrías indicar:

`Paso 1 de 3`

---

# Qué sucede técnicamente al elegir una plantilla

Aquí está la verdadera potencia.

El usuario no está seleccionando solamente un icono.

Por ejemplo:

### Template: Salón de belleza

Internamente puedes precargar:

```text
Nombre asistente:
Progy

Personalidad:
Cálido y cercano

Funciones demo:
- responder preguntas
- explicar servicios
- informar precios
- gestionar citas

Servicios demo:
- Corte: $12
- Manicure: $15
- Tinte: $35

Horario demo:
Lunes - sábado
09:00 - 18:00

FAQ:
¿Trabajan con cita?
Sí.

¿Aceptan transferencia?
Sí.

Situaciones demo:
- preguntar precio
- pedir una cita
```

Y así con todos.

Esto significa que con **dos clics** Progy ya parece configurado.

Eso es exactamente lo que necesitamos.

---

# Importante: diferenciar datos demo y datos reales

Esto tiene que quedar muy claro.

No queremos que el usuario piense que Progy mágicamente descubrió que el corte de su salón cuesta $12.

Durante el demo podemos mostrar algo pequeño:

**Estás probando Progy con información de ejemplo.**

Y después:

> Cuando termines, podrás reemplazarla con la información real de tu negocio.

Eso evita confusión.

---

# 2. Pantalla: Conoce a Progy

Esta es la pantalla crítica.

La pantalla anterior existe únicamente para llevar al usuario hasta aquí.

Yo la diseñaría alrededor de **una conversación**, no alrededor de formularios.

## Encabezado

**Así podría atender Progy en Clínica San Gabriel**

> Escoge una voz y escucha cómo atendería a uno de tus clientes.

---

## A. Selección de voz

Nada de las 22 voces de la pantalla actual.

Solo dos.

Por ejemplo:

### Valentina

**Cálida y cercana**

`▶ Escuchar voz`

### Mateo

**Claro y profesional**

`▶ Escuchar voz`

Cuando seleccionas una:

✓ Valentina seleccionada

Y automáticamente podrías escuchar:

> “Hola, gracias por comunicarte con Clínica San Gabriel. Soy Progy, ¿en qué puedo ayudarte?”

Ahí aparece el primer momento interesante.

---

# B. Inmediatamente: prueba con un cliente

Debajo:

### Prueba cómo respondería

> Elige una pregunta que podría hacer uno de tus clientes.

Dependiendo de la plantilla.

### Clínica

`¿Tienen citas disponibles mañana?`

`¿Cuánto cuesta una consulta?`

### Ferretería

`¿Tienen cemento Holcim?`

`Necesito una cotización para 20 sacos`

### Restaurante

`¿Qué tienen para almorzar?`

`Quiero reservar una mesa para cuatro`

### Hotel

`¿Tienen habitaciones este fin de semana?`

`¿El desayuno está incluido?`

### Salón

`¿Cuánto cuesta un corte?`

`¿Puedo reservar para mañana?`

---

# Cómo mostraría la interacción

No pondría inmediatamente una interfaz estilo teléfono.

Haría algo parecido a WhatsApp/conversación:

**Cliente**

> ¿Tienen citas disponibles mañana?

↓

animación pequeña:

**Progy está respondiendo...**

↓

🔊 **Progy**

> Sí. Tenemos disponibilidad de ejemplo mañana por la mañana y por la tarde. ¿Qué horario prefieres?

`▶ Escuchar respuesta`

Y después:

**Cliente**

> En la tarde.

↓

🔊 **Progy**

> Perfecto. Para registrar la cita necesitaría tu nombre y un teléfono de contacto.

---

# Esto vende mucho más que explicar funcionalidades

Porque acabas de demostrar:

> Pregunta → entiende → responde → intenta completar una acción.

Y Progy deja de ser:

> “otro chatbot con IA”

y se convierte en:

> “esta cosa realmente podría atender a mis clientes”.

---

# Yo limitaría el onboarding a 2 interacciones

Coincido contigo.

No necesitas una conversación de diez mensajes.

De hecho es contraproducente:

* cuesta más;
* tarda más;
* aumenta las posibilidades de que el modelo falle;
* prolonga el onboarding.

Dos turnos bien diseñados son suficientes.

Después:

### ¿Quieres probarlo con tus propios clientes?

**Continuar**

---

# Y aquí hay una optimización técnica importante

Estas primeras dos interacciones **ni siquiera necesitan consumir LLM** necesariamente.

Puedes tener:

* respuestas precargadas por template;
* audios pre-generados;
* variables como `{{businessName}}`.

Por ejemplo:

```text
"Hola, gracias por comunicarte con {{businessName}}..."
```

Solamente el saludo personalizado requeriría generar algo nuevo, y hasta eso lo puedes cachear.

Entonces el onboarding puede sentirse como IA funcionando mientras te cuesta prácticamente nada.

Una vez dentro del dashboard sí le das tokens reales para experimentar.

---

# 3. Pantalla: Conecta WhatsApp

Después del wow.

No antes.

## Título

**Pon a Progy donde ya están tus clientes**

> Conecta el WhatsApp Business de tu negocio para que Progy pueda atender las conversaciones desde el mismo canal que ya utilizas.

Visualmente pondría:

WhatsApp
↕
Progy
↕
Tus clientes

### CTA principal

**Conectar WhatsApp**

Esto abre el **Meta Embedded Signup**.

No:

**Conectar Facebook**

Aunque técnicamente utilices Facebook Login.

Para el cliente eso es implementación.

Su objetivo es conectar WhatsApp.

---

## Debajo del botón

Algo importante para generar confianza:

> La conexión se realiza directamente con Meta. No tendrás que copiar tokens ni configurar credenciales manualmente.

Eso es una ventaja comercial de Progy.

De hecho, yo la resaltaría.

---

## Y debajo

**Lo haré después**

Completamente de acuerdo contigo en permitirlo.

Si Meta:

* falla;
* requiere verificación;
* pide algo que el cliente no tiene;
* el cliente todavía está explorando;

no puedes bloquear todo Progy.

---

# Después llega al dashboard

Pero aquí cambiaría sustancialmente tu pantalla actual.

Actualmente llega a:

> Hola, prograwebs

y encuentra:

50%
0 conversaciones
0 pendientes
0 revisión

Eso no es útil todavía.

## Antes de estar activado mostraría otro Dashboard

Algo así:

# Tu Progy está casi listo

> Ya conociste cómo puede atender. Ahora enséñale cómo funciona realmente tu negocio.

Y una barra:

**Preparación para atender clientes**

`██████░░░░ 40%`

Después solo cuatro tareas.

---

## 1. Información del negocio

✓ Nombre

○ Dirección
○ Horarios
○ Contacto
○ sitio web

**Completar información →**

---

## 2. Productos o servicios

> Agrega lo que vendes para que Progy pueda informar precios y características.

**Agregar servicios →**

Y aquí mantienes tu funcionalidad actual:

* manual;
* PDF;
* DOCX;
* TXT;
* CSV.

Esta funcionalidad me gusta bastante.

---

## 3. Enséñale cómo funciona tu negocio

Aquí metería tu actual **Conocimiento**.

Pero cambiaría el wording.

No:

**Conocimiento**

Para alguien no técnico puede resultar abstracto.

Quizá:

### Información y respuestas

> Formas de pago, políticas, preguntas frecuentes e instrucciones.

Internamente sigue siendo knowledge.

---

## 4. Haz una prueba real

> Habla libremente con Progy y comprueba que las respuestas sean correctas.

**Probar a Progy →**

Aquí sí entra tu pantalla actual de pruebas.

---

# ¿Y WhatsApp?

Si hizo skip:

Una tarjeta claramente visible:

### Conecta WhatsApp

> Cuando estés listo, conecta el número de tu negocio.

**Conectar WhatsApp →**

Si ya está conectado:

✓ WhatsApp conectado

---

# Entonces cambia el concepto de “configuración completa”

Yo establecería un **activation gate**.

Progy no atiende clientes reales hasta cumplir requisitos mínimos.

Por ejemplo:

```text
OBLIGATORIO

✓ Nombre del negocio
✓ Tipo de negocio
✓ Una voz
✓ Horarios
✓ Al menos 1 producto/servicio
✓ Información básica
✓ Una prueba completada
✓ Canal conectado
```

Entonces:

### Progy está listo

**Activar atención**

Eso es muchísimo más importante que simplemente “100% configuración”.

Porque significa algo.

---

# Tu dashboard tendría dos estados

Esta decisión de UX me parece especialmente importante.

## Estado A — Preparación

Cuando todavía no está activo.

La prioridad es:

> Configurar → probar → activar.

No necesitas mostrar:

* estadísticas;
* valor de pedidos;
* conversaciones;
* tokens;
* métricas vacías.

---

## Estado B — Operación

Después de activar Progy.

Entonces sí tu dashboard actual empieza a tener mucho sentido:

### Hoy

* 38 conversaciones
* 7 clientes interesados
* 4 reservas
* 2 pedidos
* 3 requieren atención

### Actividad reciente

Últimas conversaciones.

### Resultados

Pedidos / reservas / citas.

### Atención necesaria

Conversaciones escaladas.

Ahí el dashboard deja de tener `0 0 0 0` porque ya está diseñado para un negocio operativo.

---

# Qué haría con tu sidebar actual

No lo eliminaría, pero sí lo reorganizaría.

Ahora tienes demasiados elementos al mismo nivel.

Yo lo llevaría a:

```text
INICIO

OPERACIÓN
Conversaciones
Resultados

MI PROGY
Negocio
Catálogo
Información y respuestas
Personalidad y voz
Pruebas

CANALES
WhatsApp
Llamadas       ← futuro
Web            ← futuro

CUENTA
Uso y plan
Configuración
```

Mucho más limpio.

---

# “Pedidos y reservas” también tiene un problema

Porque una clínica no tiene pedidos.

Una ferretería quizá no tiene reservas.

Un hotel tiene reservas.

Un salón tiene citas.

Tu interfaz debería adaptarse según el template.

### Clínica

**Citas**

### Salón

**Citas**

### Restaurante

**Pedidos y reservas**

### Hotel

**Reservas**

### Ferretería

**Cotizaciones y pedidos**

Esto refuerza muchísimo la sensación de:

> “Progy entiende mi negocio.”

Y es una de las ventajas de utilizar templates.

---

# Lo mismo con “Acciones permitidas”

Ahora tienes:

* Responder consultas
* Registrar interesados
* Preparar cotizaciones
* Crear reservas
* Agendar citas
* continuar por WhatsApp
* tomar pedidos
* pedir ayuda

Eso está bien técnicamente.

Pero no mostraría todas a todos.

Template:

### Clínica

```text
✓ Responder consultas
✓ Registrar pacientes interesados
✓ Agendar citas
✓ Escalar a recepción
```

### Ferretería

```text
✓ Responder consultas
✓ Preparar cotizaciones
✓ Registrar pedidos
✓ Escalar a un vendedor
```

### Restaurante

```text
✓ Responder consultas
✓ Tomar pedidos
✓ Crear reservas
✓ Escalar al personal
```

El template empieza a gobernar toda la experiencia.

---

# Estructura técnica que yo prepararía desde ahora

Aunque inicialmente tengas un negocio por cuenta, diseñaría:

```text
User
 └── Workspace
      └── Business
           ├── Template
           ├── Assistant
           ├── Channels
           ├── Catalog
           ├── Knowledge
           ├── Conversations
           └── Actions
```

Hoy:

```text
1 User
1 Workspace
1 Business
```

Mañana podrías permitir:

```text
1 User
1 Workspace
5 Businesses
```

sin reconstruir Progy.

No necesitas desarrollar multi-negocio ahora; solo **no acoples toda la arquitectura al usuario directamente**.

---

# Sobre lo de crear agentes

Sí veo muchísimo potencial, pero **no lo metería todavía en este onboarding**.

De hecho, hay una evolución natural:

Hoy Progy:

> entiende y responde.

Después:

> entiende, decide y ejecuta.

Ahí aparecen acciones/agentes:

```text
Cliente solicita cotización
↓
Progy entiende productos
↓
Agente genera cotización
↓
Genera PDF
↓
Envía email
↓
Registra oportunidad
↓
Notifica al vendedor
```

o:

```text
Paciente solicita cita
↓
Progy consulta disponibilidad
↓
Agenda
↓
Envía confirmación
↓
Envía recordatorio
```

o incluso lo que mencionas:

* generar Excel;
* enviar emails;
* crear documentos;
* generar cotizaciones;
* consultar sistemas;
* CRM;
* calendar;
* ERP.

Eso puede terminar siendo **una de las partes más fuertes de Progy**.

Pero conceptualmente no lo vendería como “crea agentes”.

Para el dueño de negocio probablemente sería algo como:

**Automatizaciones**

o:

**Qué puede hacer Progy**

Y debajo:

> Cuando ocurra X → Progy hace Y.

Lo trabajamos después porque merece una arquitectura propia.

---

# Para que puedas empezar a programar hoy

Yo implementaría en este orden:

1. **Nuevo `/onboarding/business`**
   Nombre + cinco templates.

2. **Sistema de templates**
   Datos demo, acciones, FAQ, servicios y casos de prueba por vertical.

3. **Nuevo `/onboarding/demo`**
   Dos voces + saludo + dos interacciones controladas.

4. **Nuevo `/onboarding/connect`**
   Meta Embedded Signup + Skip.

5. **Guardar estado del onboarding**, por ejemplo:

```text
onboarding_status:
BUSINESS_CREATED
DEMO_COMPLETED
CHANNEL_SKIPPED
CHANNEL_CONNECTED
ONBOARDING_COMPLETED
```

6. **Crear dashboard pre-activación.**

7. Cuando el negocio cumpla requisitos → cambiar al **dashboard operativo**.

Si haces únicamente estas siete cosas, ya estarías cambiando radicalmente la primera experiencia de Progy sin necesidad de reconstruir todas las pantallas que ya tienes.

Y creo que la decisión más importante de todo este refactor es esta: **el usuario debería escuchar a su propio “Progy” antes de que le pidamos configurar seriamente su negocio.** Ahí está el momento que puede convertir curiosidad en intención real de usar el producto.
