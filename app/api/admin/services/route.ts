import { guardAdmin } from '@/lib/auth';
import { getServices, saveServices } from '@/lib/settings';
import { servicesSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Список услуг для кабинета владельца: чтение и сохранение целиком (добавление, удаление, порядок, цены).
export async function GET(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  return Response.json(await getServices());
}

export async function PUT(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'Не удалось прочитать данные' }, { status: 400 }); }
  const parsed = servicesSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Проверьте поля услуг' }, { status: 400 });
  try { await saveServices(parsed.data); } catch (e) {
    console.error(e);
    return Response.json({ error: 'Не удалось сохранить: сайт не подключён к базе' }, { status: 503 });
  }
  return Response.json({ ok: true });
}
