/**
 * Esmi chat proxy — keeps Railway URL + CHAT_PROXY_SECRET server-side.
 *
 * Vercel Node serverless function (static site / framework: null).
 *
 * Env (Vercel project → Settings → Environment Variables):
 *   ESMI_API_URL       default https://ai-receptionist-production-5375.up.railway.app
 *   CHAT_PROXY_SECRET  same value as Railway CHAT_PROXY_SECRET
 *   ESMI_TENANT_ID     default coastline-condos
 */

const RAILWAY_URL =
  process.env.ESMI_API_URL ||
  process.env.RAILWAY_API_URL ||
  'https://ai-receptionist-production-5375.up.railway.app';

const TENANT_ID = process.env.ESMI_TENANT_ID || 'coastline-condos';

function writeSseError(res, message, status = 502) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.end(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    res.end('Method Not Allowed');
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      writeSseError(res, 'Invalid request body.', 400);
      return;
    }
  }
  if (!body || typeof body !== 'object') {
    writeSseError(res, 'Invalid request body.', 400);
    return;
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const threadId = typeof body.thread_id === 'string' ? body.thread_id.trim() : '';

  if (!message || !threadId) {
    writeSseError(res, 'message and thread_id are required.', 400);
    return;
  }
  if (message.length > 4000 || threadId.length > 128 || threadId.includes(':')) {
    writeSseError(res, 'Invalid message or thread_id.', 400);
    return;
  }

  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : '')?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const payload = {
    message,
    thread_id: threadId,
    tenant_id: TENANT_ID,
  };

  let upstream;
  try {
    upstream = await fetch(`${RAILWAY_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Chat-Secret': process.env.CHAT_PROXY_SECRET || '',
        'X-Tenant-Id': TENANT_ID,
        'X-Client-IP': clientIp,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    writeSseError(res, 'Could not reach Esmi — please try again shortly.');
    return;
  }

  if (!upstream.ok || !upstream.body) {
    writeSseError(
      res,
      'Esmi is temporarily unavailable. You can also reach us on WhatsApp.',
      upstream.status || 502
    );
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'keep-alive');

  // Stream SSE from Railway to the browser without buffering the full reply.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch {
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: 'Connection interrupted — please try again.' })}\n\n`
    );
  } finally {
    res.end();
  }
};
