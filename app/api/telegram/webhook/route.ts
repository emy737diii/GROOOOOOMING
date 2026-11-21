import crypto from 'node:crypto';
import { sql } from '@/lib/db';
import { tgSend } from '@/lib/telegram';

export const runtime = 'nodejs';
type Update = { message?: { text?: string; chat: { id: number; type: string; first_name?: string; username?: string; title?: string } } };

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
  const got = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!secret || got.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return new Response('forbidden', { status: 403 });
  const u = (await req.json().catch(() => ({}))) as Update;
  const m = u.message;
  if (!m?.text) return Response.json({ ok: true });
  const chatId = m.chat.id;
  try {
    if (m.text.startsWith('/start')) {
      const code = m.text.split(/\s+/)[1] ?? '';
      const [row] = code
        ? await sql`update telegram set chat_id = ${chatId}, chat_title = ${m.chat.title || m.chat.username || m.chat.first_name || ''}, link_code = null, link_code_expires = null, linked_at = now()
            where id = 1 and link_code = ${code} and link_code_expires > now() returning id`
        : [];
      if (row) await tgSend(chatId, '✅ Готово! Теперь новые заявки с сайта будут приходить сюда.');
      else await tgSend(chatId, 'Это бот для уведомлений салона. Чтобы подключиться, нажмите «Подключить Telegram» в кабинете владельца. Ссылка действует 15 минут.');
    }
  } catch (e) { console.error(e); }
  return Response.json({ ok: true });
}
