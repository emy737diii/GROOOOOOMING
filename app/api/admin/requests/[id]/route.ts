import { sql } from '@/lib/db';
import { guardAdmin } from '@/lib/auth';
import { adminUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guardAdmin(req); if (deny) return deny;
  const id = Number((await params).id);
  const parsed = adminUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || !parsed.success) return Response.json({ error: 'Проверьте поля' }, { status: 400 });
  const d = parsed.data;
  const when = d.finalTime ? new Date(d.finalTime) : null;
  if (when && Number.isNaN(when.getTime())) return Response.json({ error: 'Неверное время визита' }, { status: 400 });
  const [r] = await sql`update requests set status = ${d.status}, final_price = ${d.finalPrice}, final_time = ${when}, internal_note = ${d.internalNote}, updated_at = now() where id = ${id} returning id`;
  if (!r) return Response.json({ error: 'Заявка не найдена' }, { status: 404 });
  return Response.json({ ok: true });
}
export async function DELETE(req: Request, { params }: Ctx) {
  const deny = await guardAdmin(req); if (deny) return deny;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return Response.json({ error: 'bad_id' }, { status: 400 });
  await sql`delete from requests where id = ${id}`;
  return Response.json({ ok: true });
}
