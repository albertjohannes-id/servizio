import {
  handleCheckEmail,
  handleRefresh,
  handleRegister,
  handleRequestOtp,
  handleVerifyOtp,
} from './auth';
import { handleGetMedia, handlePutMedia } from './media';
import { handleGetSync, handlePutSync } from './sync';
import { Env, corsHeaders, error } from './util';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      let res: Response;
      if (request.method === 'GET' && (path === '/' || path === '/health')) {
        res = Response.json({ ok: true, service: 'servizio-api', photos: !!env.PHOTOS });
      } else if (request.method === 'POST' && path === '/auth/check-email') {
        res = await handleCheckEmail(request, env);
      } else if (request.method === 'POST' && path === '/auth/register') {
        res = await handleRegister(request, env);
      } else if (request.method === 'POST' && path === '/auth/request-otp') {
        res = await handleRequestOtp(request, env);
      } else if (request.method === 'POST' && path === '/auth/verify-otp') {
        res = await handleVerifyOtp(request, env);
      } else if (request.method === 'POST' && path === '/auth/refresh') {
        res = await handleRefresh(request, env);
      } else if (request.method === 'GET' && path === '/sync') {
        res = await handleGetSync(request, env);
      } else if (request.method === 'PUT' && path === '/sync') {
        res = await handlePutSync(request, env);
      } else if (request.method === 'PUT' && path === '/media') {
        res = await handlePutMedia(request, env);
      } else if (request.method === 'GET' && path === '/media') {
        res = await handleGetMedia(request, env);
      } else {
        res = error('not_found', 404);
      }

      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(cors)) headers.set(k, String(v));
      return new Response(res.body, { status: res.status, headers });
    } catch (err) {
      console.error(err);
      const res = error('internal_error', 500);
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(cors)) headers.set(k, String(v));
      return new Response(res.body, { status: res.status, headers });
    }
  },
} satisfies ExportedHandler<Env>;
