import { sql } from '@/lib/db';
import { createSession, guardAdmin, hashPassword, verifyPassword } from '@/lib/auth';
import { passwordSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export async function POST(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  const parsed = passwordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Проверьте поля' }, { status: 400 });
  const [a] = await sql`select password_hash from admin where id = 1`;
  if (!a || !verifyPassword(parsed.data.current, a.password_hash)) return Response.json({ error: 'Текущий пароль неверный' }, { status: 400 });
  // Увеличиваем версию: все старые входы становятся недействительными, текущий перевыпускаем.
  const [r] = await sql`update admin set password_hash = ${hashPassword(parsed.data.next)}, session_version = session_version + 1, updated_at = now() where id = 1 returning session_version`;
  await createSession(r.session_version);
  return Response.json({ ok: true });
}
