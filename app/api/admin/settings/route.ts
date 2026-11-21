import { guardAdmin } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/settings';
import { settingsSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export async function GET(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  return Response.json(await getSettings());
}
export async function PUT(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  const parsed = settingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Укажите название, заголовок и хотя бы один филиал' }, { status: 400 });
  await saveSettings(parsed.data);
  return Response.json({ ok: true });
}
