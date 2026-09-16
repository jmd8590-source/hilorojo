// api/contact.js — función serverless para Vercel (Node).
//
// Valida el formulario, verifica hCaptcha, aplica un límite de peticiones
// (con Upstash Redis si está configurado; si no, un respaldo en memoria) y
// envía el email con la API HTTP de Resend — no por SMTP, así el mismo
// enfoque funciona igual si algún día se despliega en Cloudflare Pages
// (ver functions/api/contact.js, la versión equivalente para Cloudflare).
//
// Variables de entorno (ver .env.example):
//   RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, HCAPTCHA_SECRET
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (opcionales, recomendadas)

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
  // Respaldo en memoria (best-effort: se reinicia con cada "cold start")
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

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Método no permitido.' }));
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (await isRateLimited(ip, process.env)) {
    res.statusCode = 429;
    return res.end(
      JSON.stringify({ ok: false, error: 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.' })
    );
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }

  const {
    name,
    email,
    type,
    message,
    company, // honeypot — un humano nunca debería rellenarlo
    'h-captcha-response': captchaToken,
  } = body || {};

  if (company) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  }

  const cleanName = clean(name, 120);
  const cleanEmail = clean(email, 200);
  const cleanType = clean(type, 60);
  const cleanMessage = clean(message, 4000);

  if (!cleanName || !isValidEmail(cleanEmail) || !cleanMessage) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'Revisa el nombre, el email y el mensaje.' }));
  }

  if (!captchaToken) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'Completa la verificación anti-spam.' }));
  }

  try {
    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET || '',
        response: captchaToken,
      }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'Verificación anti-spam fallida. Vuelve a intentarlo.' }));
    }
  } catch (err) {
    console.error('Error verificando hCaptcha:', err);
    res.statusCode = 502;
    return res.end(JSON.stringify({ ok: false, error: 'No se pudo verificar el captcha. Inténtalo de nuevo.' }));
  }

  try {
    await sendWithResend(
      process.env,
      cleanEmail,
      `Nuevo encargo (${cleanType || 'General'}) — ${cleanName}`,
      `Nombre: ${cleanName}\nEmail: ${cleanEmail}\nTipo de encargo: ${cleanType}\n\nMensaje:\n${cleanMessage}`
    );
  } catch (err) {
    console.error('Error enviando email con Resend:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'No se pudo enviar el mensaje. Inténtalo más tarde.' }));
  }

  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true }));
};
