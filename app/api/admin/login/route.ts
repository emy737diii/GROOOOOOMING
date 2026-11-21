import { sql } from '@/lib/db';
import { createSession, sameOrigin, verifyPassword } from '@/lib/auth';
import { clientIp, ipHash, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const DUMMY = 'scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA==:' + 'A'.repeat(86) + '==';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'bad_origin' }, { status: 403 });
  if (!(await rateLimit(`login:${ipHash(clientIp(req))}`, 5, 900))) return Response.json({ error: 'Слишком много попыток. Подождите 15 минут.' }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { login?: string; password?: string };
  const [a] = await sql`select login, password_hash, session_version from admin where id = 1`;
  // Проверяем хеш всегда, чтобы время ответа не выдавало, верен ли логин.
  const passOk = verifyPassword(String(body.password ?? ''), a?.password_hash ?? DUMMY);
  if (!a || !passOk || String(body.login ?? '').trim() !== a.login) return Response.json({ error: 'Неверный логин или пароль' }, { status: 401 });
  await createSession(a.session_version);
  return Response.json({ ok: true });
}
