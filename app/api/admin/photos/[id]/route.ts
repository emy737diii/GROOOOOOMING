import { sql } from '@/lib/db';
import { guardAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardAdmin(req); if (deny) return deny;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response('bad id', { status: 400 });
  const [p] = await sql`select mime, data from request_photos where id = ${id}`;
  if (!p) return new Response('not found', { status: 404 });
  const buf = p.data as Buffer;
  const body = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new Response(body, { headers: { 'Content-Type': p.mime as string, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}
