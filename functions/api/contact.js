// functions/api/contact.js — función equivalente para Cloudflare Pages.
//
// Misma lógica que api/contact.js (la versión para Vercel), adaptada a la
// firma de Cloudflare Pages Functions (Request/Response, variables de
// entorno vía context.env). Cloudflare no expone sockets TCP tradicionales,
// así que el email se envía con la API HTTP de Resend en vez de SMTP —
// funciona igual en ambos sitios con fetch(), sin librerías adicionales.
//
// Cloudflare enruta automáticamente /api/contact a este archivo por su
// ubicación (functions/api/contact.js) — no hace falta configurar rutas.

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 5;
const memoryHits = new Map(); // respaldo si no hay Upstash configurado

async function isRateLimited(ip, env) {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const key = `rl:contact:${ip}`;
      const res = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, String(RATE_LIMIT_WINDOW_SECONDS)],
        ]),
      });
      const data = await res.json();
      const count = Number(data?.[0]?.result || 0);
      return count > RATE_LIMIT_MAX;
    } catch (err) {
      console.error('Upstash no disponible, usando límite en memoria:', err);
    }
  }
  const now = Date.now();
  const entry = memoryHits.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_SECONDS * 1000) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  memoryHits.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

function clean(value, max) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sendWithResend(env, replyTo, subject, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL,
      to: env.CONTACT_TO_EMAIL || env.CONTACT_FROM_EMAIL,
      reply_to: replyTo,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend respondió ${res.status}: ${errText}`);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Método no permitido.' }, 405);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await isRateLimited(ip, env)) {
    return json({ ok: false, error: 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.' }, 429);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const {
    name,
    email,
    type,
    message,
    company,
    'h-captcha-response': captchaToken,
  } = body || {};

  if (company) {
    return json({ ok: true }, 200);
  }

  const cleanName = clean(name, 120);
  const cleanEmail = clean(email, 200);
  const cleanType = clean(type, 60);
  const cleanMessage = clean(message, 4000);

  if (!cleanName || !isValidEmail(cleanEmail) || !cleanMessage) {
    return json({ ok: false, error: 'Revisa el nombre, el email y el mensaje.' }, 400);
  }
  if (!captchaToken) {
    return json({ ok: false, error: 'Completa la verificación anti-spam.' }, 400);
  }

  try {
    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.HCAPTCHA_SECRET || '', response: captchaToken }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return json({ ok: false, error: 'Verificación anti-spam fallida. Vuelve a intentarlo.' }, 400);
    }
  } catch (err) {
    console.error('Error verificando hCaptcha:', err);
    return json({ ok: false, error: 'No se pudo verificar el captcha. Inténtalo de nuevo.' }, 502);
  }

  try {
    await sendWithResend(
      env,
      cleanEmail,
      `Nuevo encargo (${cleanType || 'General'}) — ${cleanName}`,
      `Nombre: ${cleanName}\nEmail: ${cleanEmail}\nTipo de encargo: ${cleanType}\n\nMensaje:\n${cleanMessage}`
    );
  } catch (err) {
    console.error('Error enviando email con Resend:', err);
    return json({ ok: false, error: 'No se pudo enviar el mensaje. Inténtalo más tarde.' }, 500);
  }

  return json({ ok: true }, 200);
}
