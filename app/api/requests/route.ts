import crypto from 'node:crypto';
import sharp from 'sharp';
import { after } from 'next/server';
import { jsonb, sql } from '@/lib/db';
import { requestSchema } from '@/lib/validation';
import { calc, svcNames, total, type PricedPet } from '@/lib/pricing';
import { getServices, getSettings } from '@/lib/settings';
import { clientIp, ipHash, rateLimit } from '@/lib/rate-limit';
import { notifyNewRequest } from '@/lib/telegram';

export const runtime = 'nodejs';
const MAX_PHOTOS = 3, MAX_BYTES = 10 * 1024 * 1024;
const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const ih = ipHash(clientIp(req));
  const idem = (req.headers.get('idempotency-key') ?? '').slice(0, 64);
  if (idem) {
    const [dup] = await sql`select token, no from requests where idem_key = ${idem}`;
    if (dup) return Response.json({ token: dup.token, no: dup.no });
  }
  if (!(await rateLimit(`req:${ih}`, 5, 600))) return bad('Слишком много заявок. Попробуйте через 10 минут или позвоните в салон.', 429);

  let form: FormData;
  try { form = await req.formData(); } catch { return bad('Не удалось прочитать заявку'); }
  let raw: unknown;
  try { raw = JSON.parse(String(form.get('payload') ?? '')); } catch { return bad('Не удалось прочитать заявку'); }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? 'Проверьте поля заявки');
  const d = parsed.data;

  // Цена считается заново на сервере по текущему прайсу (порода + услуги): цене из браузера не доверяем.
  const [SV, S] = await Promise.all([getServices(), getSettings()]);
  const pets: PricedPet[] = [];
  for (const p of d.pets) {
    const res = calc(p, SV);
    if (!res) return bad(`У питомца «${p.name || 'без клички'}» не выбрана порода или услуга, либо услуга недоступна для этой породы. Обновите страницу.`);
    // Название услуги фиксируется в заявке, чтобы она читалась, даже если услугу потом удалят.
    pets.push({ ...p, svcName: p.species === 'other' ? undefined : svcNames(p, SV), res });
  }
  const t = total(pets);
  const branch = S.branches.includes(d.branch) ? d.branch : '';

  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return bad(`Можно приложить до ${MAX_PHOTOS} фото`);
  const photos: Buffer[] = [];
  for (const f of files) {
    if (!MIMES.has(f.type) || f.size > MAX_BYTES) return bad('Фото: только JPEG, PNG или WebP до 10 МБ');
    try {
      // Перекодируем: убираем EXIF и геометки, уменьшаем до 1600 пикселей.
      photos.push(await sharp(Buffer.from(await f.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer());
    } catch { return bad('Одно из фото не удалось открыть'); }
  }

  const token = crypto.randomBytes(18).toString('base64url');
  let created: { id: number; no: number; token: string };
  try {
    created = await sql.begin(async (trx) => {
      const tx = trx as unknown as typeof sql; // обход типов postgres.js
      const [r] = await tx`insert into requests (token, idem_key, name, phone, branch, pref_date, pref_time, comment, consent_at, pets, total_text, total_min, ip_hash)
        values (${token}, ${idem || null}, ${d.name}, ${d.phone}, ${branch}, ${d.prefDate || null}, ${d.prefTime}, ${d.comment}, now(), ${jsonb(pets)}::jsonb, ${t.text}, ${t.min}, ${ih})
        returning id, no, token`;
      for (const buf of photos) await tx`insert into request_photos (request_id, mime, data) values (${r.id}, 'image/jpeg', ${buf})`;
      return r as unknown as { id: number; no: number; token: string };
    }) as unknown as { id: number; no: number; token: string };
  } catch (e) {
    if ((e as { code?: string }).code === '23505' && idem) {
      const [dup] = await sql`select token, no from requests where idem_key = ${idem}`;
      if (dup) return Response.json({ token: dup.token, no: dup.no });
    }
    console.error(e);
    return bad('Не удалось сохранить заявку. Попробуйте ещё раз.', 500);
  }
  after(() => notifyNewRequest(Number(created.id)));
  return Response.json({ token: created.token, no: created.no });
}
