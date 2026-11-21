import { sql } from '@/lib/db';
import { sameOrigin } from '@/lib/auth';
import { clientIp, ipHash, rateLimit } from '@/lib/rate-limit';
import { tgConfigured, tgSend } from '@/lib/telegram';

export const runtime = 'nodejs';
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: 'bad_origin' }, { status: 403 });
  if (!(await rateLimit(`cancel:${ipHash(clientIp(req))}`, 10, 600))) return Response.json({ error: 'Слишком часто' }, { status: 429 });
  const { token } = await params;
  const [r] = await sql`update requests set status = 'cancel', updated_at = now() where token = ${token} and status in ('new','ask','ok') returning no, name`;
  if (!r) return Response.json({ error: 'Заявку нельзя отменить' }, { status: 409 });
  const [tg] = await sql`select chat_id from telegram where id = 1`;
  if (tgConfigured() && tg?.chat_id) tgSend(tg.chat_id, `❌ Клиент отменил заявку № ${r.no}`).catch(console.error);
  return Response.json({ ok: true });
}
