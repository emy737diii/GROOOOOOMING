import crypto from 'node:crypto';
import { sql } from '@/lib/db';
import { guardAdmin } from '@/lib/auth';
import { tgConfigured, tgSend } from '@/lib/telegram';

export const runtime = 'nodejs';
const bot = () => process.env.TELEGRAM_BOT_USERNAME ?? '';

/** Состояние подключения. Кабинет опрашивает его, пока владелец жмёт «Старт» в боте. */
export async function GET(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  const [t] = await sql`select chat_id, chat_title, linked_at, link_code_expires > now() as waiting from telegram where id = 1`;
  return Response.json({ configured: tgConfigured(), bot: bot(), linked: !!t?.chat_id, title: t?.chat_title ?? '', linkedAt: t?.linked_at ?? null, waiting: !!t?.waiting });
}
/** Выдаёт одноразовую ссылку t.me/бот?start=код на 15 минут. */
export async function POST(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  if (!tgConfigured()) return Response.json({ error: 'Бот не настроен: заполните TELEGRAM_BOT_TOKEN и TELEGRAM_BOT_USERNAME на сервере' }, { status: 400 });
  const code = crypto.randomBytes(12).toString('hex');
  await sql`update telegram set link_code = ${code}, link_code_expires = now() + interval '15 minutes' where id = 1`;
  return Response.json({ url: `https://t.me/${bot()}?start=${code}` });
}
/** Тестовое сообщение. */
export async function PUT(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  const [t] = await sql`select chat_id from telegram where id = 1`;
  if (!t?.chat_id) return Response.json({ error: 'Telegram не подключён' }, { status: 400 });
  try { await tgSend(t.chat_id, '🔔 Тестовое сообщение: уведомления о заявках работают.'); }
  catch (e) { console.error(e); return Response.json({ error: 'Не удалось отправить. Проверьте токен бота и что чат не заблокирован.' }, { status: 502 }); }
  return Response.json({ ok: true });
}
export async function DELETE(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  await sql`update telegram set chat_id = null, chat_title = '', link_code = null, link_code_expires = null, linked_at = null where id = 1`;
  return Response.json({ ok: true });
}
