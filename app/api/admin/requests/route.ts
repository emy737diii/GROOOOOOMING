import { fromJson, sql } from '@/lib/db';
import { guardAdmin } from '@/lib/auth';
import { STATUS } from '@/lib/content';

export const runtime = 'nodejs';
export async function GET(req: Request) {
  const deny = await guardAdmin(req); if (deny) return deny;
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'all';
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 60);
  const st = status in STATUS ? status : null;
  const like = `%${q.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
  const rows = await sql`
    select r.id, r.no, r.token, r.status, r.name, r.phone, r.branch, r.pref_date, r.pref_time, r.comment, r.pets, r.total_text,
           r.final_price, r.final_time, r.internal_note, r.created_at,
           coalesce((select json_agg(p.id order by p.id) from request_photos p where p.request_id = r.id), '[]'::json) as photo_ids
    from requests r
    where (${st}::text is null or r.status = ${st})
      and (${q} = '' or r.name ilike ${like} or r.phone ilike ${like} or r.no::text = ${q} or r.pets::text ilike ${like})
    order by r.created_at desc limit 300`;
  const [{ fresh }] = await sql`select count(*)::int as fresh from requests where status = 'new'`;
  const items = rows.map((r) => ({ ...r, pets: fromJson<unknown[]>(r.pets, []), photo_ids: fromJson<number[]>(r.photo_ids, []) }));
  return Response.json({ items, fresh });
}
