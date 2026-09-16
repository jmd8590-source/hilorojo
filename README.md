# Rojo Hilo — guía de despliegue

Web corporativa con backend real para el formulario de contacto (envío por
Resend + verificación anti-spam con hCaptcha + límite de peticiones), chatbot
(Tidio, con banner de cookies) y páginas legales base. Preparada para
desplegarse en **Vercel** o en **Cloudflare Pages** enlazando el mismo
repositorio de GitHub — el proyecto incluye ambas versiones de la función de
contacto para que elijas sin tener que reescribir nada.

⚠️ **Antes de publicarla con tu dominio final**, sustituye el contenido de
ejemplo: las 6 piezas del portafolio (ahora son ilustraciones, no fotos
reales), los testimonios, los nombres de "colaboraciones" (son ficticios) y
los datos de contacto/dirección. Estos son los únicos que no he podido
hacer por ti porque no tengo fotos ni testimonios reales de Rojo Hilo — todo
lo demás de esta guía (backend, seguridad, legal, cookies) ya está aplicado.

---

## 0. Qué hay en esta carpeta

```
index.html              Página principal
aviso-legal.html         Aviso legal (plantilla, completar datos)
privacidad.html          Política de privacidad (plantilla, completar datos)
cookies.html             Política de cookies
assets/styles.css        Todos los estilos
assets/main.js           Interacción (menú, cursor, animaciones, formulario)
assets/cookies.js        Banner de cookies + carga condicional de Tidio
api/contact.js            Función serverless para Vercel (Node)
functions/api/contact.js  La misma función, para Cloudflare Pages
package.json
vercel.json               Cabeceras de seguridad para Vercel (HSTS, CSP...)
_headers                  Las mismas cabeceras, en formato Cloudflare Pages
.env.example               Plantilla de variables de entorno (NO subir tu .env real)
.gitignore
robots.txt / sitemap.xml
```

## 1. Revisa el contenido de ejemplo

Antes de nada, abre `index.html` y decide qué vas a sustituir ya y qué puede
esperar a una segunda vuelta:

- Sección **Portafolio**: sustituye las 6 ilustraciones SVG por fotos reales de piezas (formato recomendado: `.webp` o `.jpg`, colócalas en una carpeta `assets/img/` y cambia el `<svg class="port-art">` por `<img class="port-art" src="/assets/img/tu-foto.jpg" alt="...">`).
- Sección **Testimonios** y la franja de **Colaboraciones**: son ejemplos de plantilla — cámbialos por clientes y opiniones reales, o quítalos si no tienes todavía.
- **Contacto**: cambia el email (`hola@rojohilo.studio`), el Instagram y la dirección por los reales.
- `sitemap.xml`, `robots.txt`, `aviso-legal.html`, `privacidad.html` y las etiquetas `<meta>`/`ld+json` de `index.html`: cambia `https://tu-dominio.com` por tu dominio real en cuanto lo tengas.
- `aviso-legal.html` y `privacidad.html`: rellena los campos marcados entre corchetes (razón social, NIF, dirección, email, fecha) — son plantillas, no textos legales terminados (ver paso 7).

## 2. Configura el envío de correo (Resend)

El formulario envía el email a través de **Resend**, una API de email por
HTTP — funciona igual en Vercel y en Cloudflare Pages, y es más fiable que
depender de una contraseña de aplicación de Gmail.

1. Crea una cuenta gratuita en [resend.com](https://resend.com) (gratis hasta 100 emails/día y 3.000/mes).
2. Para probar rápido sin verificar dominio, puedes usar `CONTACT_FROM_EMAIL=onboarding@resend.dev`. Para producción, ve a **Domains → Add Domain**, añade tu dominio y crea los registros DNS (SPF/DKIM) que te indique Resend en el panel de tu proveedor de DNS; una vez verificado, usa una dirección de ese dominio (p. ej. `web@tu-dominio.com`).
3. En **API Keys**, crea una clave nueva.
4. Copia `.env.example` como `.env` y rellena:
   ```
   RESEND_API_KEY=tu-clave-de-resend
   CONTACT_FROM_EMAIL=web@tu-dominio.com
   CONTACT_TO_EMAIL=tu-correo@gmail.com
   ```

**Nunca subas el archivo `.env` a GitHub** — ya está excluido en `.gitignore`. Las variables reales se configuran en el panel de tu hosting (pasos 6 y 7).

## 3. Configura hCaptcha (anti-spam)

1. Crea una cuenta gratuita en [dashboard.hcaptcha.com](https://dashboard.hcaptcha.com).
2. Crea un "Site" nuevo con el dominio que vayas a usar (puedes poner el subdominio provisional de tu hosting y añadir tu dominio real más adelante).
3. Copia la **Site Key** (pública) y la **Secret Key** (privada).
4. En `index.html`, busca `data-sitekey="10000000-ffff-ffff-ffff-000000000001"` (es la clave de pruebas que hCaptcha documenta oficialmente, siempre aprueba) y sustitúyela por tu Site Key real.
5. Añade tu Secret Key a `.env` como `HCAPTCHA_SECRET=...` (y luego también en el panel de tu hosting).

## 4. Límite de peticiones distribuido (Upstash, opcional pero recomendado)

Sin configurar nada más, la función de contacto ya limita a 5 envíos por
minuto por IP usando la memoria de la propia función — funciona, pero es
"best-effort": se reinicia con cada arranque en frío y no se comparte entre
distintas instancias. Para un límite de verdad, compartido entre todas las
peticiones:

1. Crea una cuenta gratuita en [upstash.com](https://upstash.com) y una base de datos Redis.
2. Copia la **REST URL** y el **REST TOKEN** que te da el panel.
3. Añádelos a `.env`:
   ```
   UPSTASH_REDIS_REST_URL=https://tu-base.upstash.io
   UPSTASH_REDIS_REST_TOKEN=tu-token
   ```

Si dejas estas dos variables vacías, la función sigue funcionando con el
límite en memoria como respaldo automático — no es obligatorio, pero sí la
mejora que recomendaría antes de dar la web por lista para producción.

## 5. Prueba en local (opcional pero recomendado)

Con Vercel:
```bash
npm install -g vercel     # solo la primera vez
cd rojo-hilo-web
vercel dev
```

Con Cloudflare Pages (usa Wrangler, su CLI):
```bash
npm install -g wrangler   # solo la primera vez
cd rojo-hilo-web
wrangler pages dev . --compatibility-date=2026-01-01
```

Abre la URL que te indique la terminal, prueba el formulario de contacto de
arriba a abajo y confirma que te llega el email.

## 6. Despliega en Vercel

**Opción A — con GitHub (recomendada, permite actualizar la web solo con `git push`):**

1. Sube esta carpeta a un repositorio nuevo en GitHub.
2. En [vercel.com/new](https://vercel.com/new), pulsa "Import" sobre ese repositorio.
3. En "Environment Variables" añade las variables de tu `.env` (`RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`, `HCAPTCHA_SECRET` y, si las usas, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`).
4. Pulsa "Deploy". En un minuto tendrás una URL tipo `rojo-hilo.vercel.app` ya en HTTPS.

**Opción B — sin GitHub, desde tu ordenador:**

```bash
cd rojo-hilo-web
vercel
```

Sigue las preguntas en pantalla y añade las variables de entorno cuando te lo
pida (o después en el panel: Project → Settings → Environment Variables).
Para publicar la versión definitiva: `vercel --prod`.

## 7. Despliega en Cloudflare Pages (alternativa a Vercel)

Cloudflare Pages funciona igual de bien con este proyecto y su plan gratuito
no tiene límite de ancho de banda. No necesitas mover ni reescribir nada: la
función ya está en `functions/api/contact.js` y las cabeceras de seguridad en
`_headers`, en el formato que Cloudflare espera.

1. Sube esta carpeta a un repositorio de GitHub (el mismo que uses para Vercel, o uno nuevo — puedes tener ambos desplegados a la vez si quieres comparar).
2. En el panel de Cloudflare, ve a **Workers & Pages → Create → Pages → Connect to Git** y selecciona el repositorio.
3. En la configuración de compilación: **Framework preset**: "None"; **Build command**: (déjalo vacío); **Build output directory**: `/` (la raíz del proyecto). No hace falta ningún paso de compilación.
4. En **Environment variables** añade las mismas variables que en el paso 2 (`RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`, `HCAPTCHA_SECRET`, y opcionalmente las de Upstash) — recuerda añadirlas tanto para "Production" como para "Preview" si quieres probar en las URLs de vista previa.
5. Pulsa "Save and Deploy". Cloudflare detecta automáticamente `functions/api/contact.js` y lo publica en `/api/contact` sin configuración adicional, y aplica las cabeceras de `_headers` a todas las rutas.

**Nota técnica:** por eso el envío de email usa Resend (API HTTP) y no SMTP
directo — el runtime de Cloudflare no ofrece de forma estable las conexiones
TCP crudas que necesita el protocolo SMTP tradicional, así que una solución
basada en SMTP (como Nodemailer con Gmail) no es fiable ahí. Con Resend, el
mismo código funciona igual en Vercel y en Cloudflare.

## 8. Verifica que todo funciona

- Abre la URL en el móvil y en el ordenador, en vertical y en horizontal.
- Rellena el formulario de contacto de verdad y confirma que te llega el email.
- Comprueba las cabeceras de seguridad en [securityheaders.com](https://securityheaders.com) pegando tu URL — deberían salir en verde.
- Comprueba el SSL/HTTPS en [www.ssllabs.com/ssltest](https://www.ssllabs.com/ssltest/) (tanto Vercel como Cloudflare lo gestionan automáticamente, pero conviene confirmarlo).
- Comprueba el banner de cookies: al entrar por primera vez debe aparecer abajo; si pulsas "Solo necesarias" el chat de Tidio no debe cargarse (revísalo en las herramientas de desarrollador → pestaña Red/Network, no debe haber peticiones a `code.tidio.co` hasta que aceptes).
- Revisa que no queda ningún texto de ejemplo sin sustituir (portafolio, testimonios, colaboraciones, contacto, páginas legales).

## 9. Conecta tu dominio propio (cuando lo tengas)

**En Vercel:** Project → Settings → Domains → añade tu dominio y sigue las instrucciones DNS que te da.

**En Cloudflare Pages:** Tu proyecto → Custom domains → añade tu dominio (si el dominio ya está en Cloudflare, se conecta prácticamente al instante; si está en otro proveedor, te dará los registros DNS a añadir allí).

En ambos casos, cuando tengas el dominio definitivo actualiza
`https://tu-dominio.com` por el real en `index.html`, `aviso-legal.html`,
`privacidad.html`, `cookies.html`, `robots.txt` y `sitemap.xml`, y vuelve a
desplegar.

## 10. Añade el chatbot (Tidio, gratis)

1. Crea una cuenta gratuita en [tidio.com](https://www.tidio.com).
2. En el panel: **Canales → Live Chat → Instalar** — copia tu **Public Key** (un código corto, no es secreto, puede ir directamente en el HTML).
3. Abre `assets/cookies.js` y sustituye `TU_CLAVE_PUBLICA` en la constante `TIDIO_SRC` por tu clave real.
4. Diseña el bot sin código en **Tidio → Flows** (o "Lyro"/plantillas, según la versión del panel): un flujo de bienvenida con botones tipo "¿Cuánto tarda un encargo?", "¿Hacéis talleres?", "Quiero un presupuesto", y en este último un paso de "Recoger datos" (nombre + email) con notificación por email activada en Tidio.
5. En **Configuración → Apariencia** puedes ajustar el color del widget (escarlata `#c81d2b` u oro `#c9a227`) — lo hemos dejado en la esquina inferior derecha por defecto, por eso el botón "Encargar pieza" flotante se movió a la izquierda.

**Importante:** el widget solo se carga si el visitante acepta la cookie de
chat en el banner (ver paso 11) — es intencional, para cumplir con la
normativa de cookies. Si no ves el chat al probar la web, comprueba que has
aceptado el banner.

**Límites del plan gratuito** (revísalos en tidio.com/pricing, cambian con el tiempo): en el momento de escribir esto, 50 conversaciones facturables al mes y 100 visitantes alcanzados por Flows al mes.

## 11. Sobre el banner de cookies y las páginas legales

Se han añadido tres páginas (`aviso-legal.html`, `privacidad.html`,
`cookies.html`) y un banner de cookies con dos categorías:

- **Necesarias** (siempre activas): hCaptcha, imprescindible para proteger el formulario de contacto que el propio visitante decide usar.
- **Chat** (requiere aceptación): Tidio solo se inyecta en la página después de que el visitante pulse "Aceptar todas".

Esto es una base de cumplimiento normal para una web de este tamaño, **no
asesoramiento legal** — cada página legal lo indica en un aviso al
principio. Antes de publicar con dominio real: rellena los campos entre
corchetes (razón social, NIF, dirección, email, fecha) y, si vais a
gestionar muchos datos de clientes o algo especialmente sensible, que lo
revise un abogado o gestoría.

## 12. Accesibilidad, y por qué no se ha bloqueado el clic derecho

Se pidió deshabilitar el clic derecho y bloquear cualquier inspección del
código, y por otro lado hacer la web accesible para personas con
discapacidad. Con honestidad: la primera petición, tal y como se planteó
(bloqueo total, "que nadie pueda investigar el código"), **no se ha
implementado así**, por dos razones que conviene tener claras antes de
presentarlo al cliente final:

1. **No es técnicamente posible.** Cualquier página web tiene que enviar
   su HTML, CSS y JavaScript al navegador de la persona que la visita
   para poder mostrarse — eso significa que ese código *siempre* se puede
   ver, con "Ver código fuente", las herramientas de desarrollador, guardar
   la página, o simplemente descargando la web con `curl`. Los scripts que
   dicen "desactivar el botón derecho" o "bloquear F12" solo estorban a un
   usuario normal un segundo; no protegen nada frente a alguien con
   mínimo interés en copiarlo. Es una falsa sensación de seguridad, no
   seguridad real.
2. **Rompería justo la accesibilidad que también se pidió.** Bloquear el
   clic derecho y la selección de texto en toda la página impide que los
   lectores de pantalla lean con normalidad, que las herramientas de
   traducción automática funcionen, y que cualquier visitante copie el
   email o la dirección del taller para pegarlos en su agenda. Habría sido
   contradictorio hacer ambas cosas a la vez de forma global.

**Lo que sí se ha hecho, como término medio razonable:** solo las
ilustraciones del portafolio (`.port-art`, ejemplos a sustituir por fotos
reales) muestran un aviso — "© Rojo Hilo — ilustración protegida" — al
intentar abrir el menú contextual sobre ellas, en vez de bloquear nada de
forma silenciosa. El resto de la página (texto, datos de contacto, menús)
se puede seleccionar, copiar e inspeccionar con total normalidad. Si de
verdad se quiere dificultar la reutilización de las fotografías reales
cuando las haya, lo único que ayuda de verdad es: publicarlas en baja
resolución, con marca de agua, y registrar la autoría — no un script de
JavaScript.

La protección real del **código** (no del contenido visual) ya está
donde corresponde: las claves de Resend, hCaptcha y Upstash viven solo en
el servidor (ver "Notas de seguridad adicionales" más abajo) y nunca
llegan al navegador; eso sí es información sensible y sí está protegida.

### Accesibilidad implementada

- **Panel de accesibilidad real**, con el botón "♿ Accesibilidad" en la
  cabecera de todas las páginas (`assets/a11y.js` + estilos en
  `assets/styles.css`): tamaño de texto en tres niveles, alto contraste
  reforzado, reducción de movimiento forzada, subrayado permanente de
  enlaces y tipografía de lectura fácil (Atkinson Hyperlegible). No es un
  "overlay" cosmético de los que venden como solución mágica de
  accesibilidad: cada opción cambia CSS real de la propia web, y las
  preferencias se recuerdan entre visitas (`localStorage`).
- **Navegación por teclado**: enlace "Saltar al contenido", foco visible
  en todos los elementos interactivos, y el menú móvil y el panel de
  accesibilidad atrapan el foco mientras están abiertos, se cierran con
  Escape y devuelven el foco al botón que los abrió.
- **Formulario de contacto**: errores anunciados por lectores de pantalla
  (`aria-live`), campos marcados con `aria-invalid` y foco automático en
  el primer campo con error al fallar la validación.
- **Contraste de color verificado** (mínimo 4.5:1) incluido en estados de
  hover, con un token de color específico (`--scarlet-hover`) corregido
  porque el original solo llegaba a 3.4:1.
- **Preferencias del sistema respetadas**: `prefers-reduced-motion`,
  `prefers-reduced-transparency` y el modo de alto contraste de Windows
  (`forced-colors`).
- **Declaración de accesibilidad** en `accesibilidad.html`, enlazada desde
  el pie de página y desde el propio panel, con el detalle completo de lo
  implementado y un canal de contacto para reportar barreras.

Antes de publicar de verdad, se recomienda repetir estas pruebas con el
contenido final (no el de ejemplo):

- Lighthouse (pestaña "Accessibility" de Chrome DevTools) y la extensión [axe DevTools](https://www.deque.com/axe/devtools/).
- Navegación completa solo con teclado (Tab, Shift+Tab, Escape, Enter) sin tocar el ratón.
- Un lector de pantalla real: NVDA (Windows, gratis) o VoiceOver (Mac/iOS, integrado).
- Zoom del navegador al 200% y comprobar que nada se corta ni se superpone.

## 13. Si prefieres Netlify en vez de Vercel/Cloudflare

También es posible, con algunos cambios: mueve `api/contact.js` a
`netlify/functions/contact.js` (mismo contenido que la versión de Vercel),
añade un `netlify.toml` con `[build] functions = "netlify/functions"` y una
regla `[[redirects]]` de `/api/contact` a `/.netlify/functions/contact`, y
traslada las cabeceras de `vercel.json` a `netlify.toml` bajo `[[headers]]`
(sintaxis distinta, ver la documentación de Netlify sobre "Custom headers").

## 14. Checklist final antes de entregar al cliente

- [ ] Contenido de ejemplo sustituido (portafolio, testimonios, colaboraciones, contacto, dominio en meta-tags).
- [ ] Formulario probado de extremo a extremo (llega el email real vía Resend).
- [ ] hCaptcha con Site Key y Secret Key reales (no la clave de pruebas).
- [ ] Dominio de Resend verificado (o al menos decidido conscientemente seguir con `onboarding@resend.dev` para pruebas).
- [ ] Variables de entorno cargadas en el panel del hosting elegido (no solo en tu `.env` local).
- [ ] (Recomendado) Upstash configurado para un límite de peticiones real.
- [ ] Cabeceras de seguridad en verde en securityheaders.com.
- [ ] Probado en móvil (vertical y horizontal) y en escritorio.
- [ ] Dominio propio conectado (o decidido conscientemente posponerlo).
- [ ] Chatbot Tidio con tu Public Key real (no `TU_CLAVE_PUBLICA`) y al menos un flujo de FAQ + captura de contacto configurado.
- [ ] Banner de cookies probado (el chat no carga hasta aceptar).
- [ ] Aviso legal, privacidad y cookies con los datos reales rellenados (no los campos entre corchetes) — revisados por un profesional si el volumen de datos lo justifica.
- [ ] Declaración de accesibilidad (`accesibilidad.html`) con la fecha y el email de contacto reales.
- [ ] Accesibilidad probada de verdad con el contenido final: Lighthouse/axe, navegación solo con teclado y, al menos una vez, con un lector de pantalla real.

---

### Notas de seguridad adicionales

- La función nunca expone `HCAPTCHA_SECRET`, `RESEND_API_KEY` ni el token de Upstash al navegador — viven solo en el servidor, como variables de entorno.
- El formulario tiene doble protección anti-spam: un campo "honeypot" oculto (los bots lo rellenan, las personas no lo ven) y hCaptcha verificado en el servidor.
- Si el envío de email falla (Resend caído, clave incorrecta, etc.), el error se registra con `console.error` en los logs de tu hosting (Vercel → pestaña "Logs"; Cloudflare Pages → pestaña "Functions" del proyecto). Si quieres una alerta activa en vez de tener que mirar los logs, la mejora natural es añadir un segundo envío a una dirección de monitorización cuando `sendWithResend` lance un error, o conectar los logs a un servicio como Better Stack o Sentry.
