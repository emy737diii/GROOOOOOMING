import { guardAdmin } from '@/lib/auth';
import { getTariffs, saveTariffs } from '@/lib/settings';
import { tariffsSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export async function GET(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  return Response.json(await getTariffs());
}
export async function PUT(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  const parsed = tariffsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Все значения должны быть больше нуля' }, { status: 400 });
  await saveTariffs(parsed.data);
  return Response.json({ ok: true });
}
