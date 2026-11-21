import type { Metadata } from 'next';
import { fromJson, sql } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { STATUS, type Status } from '@/lib/content';
import { petLine, priceText, svcLine, type PricedPet } from '@/lib/pricing';
import StatusActions from '@/components/StatusActions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Статус заявки', robots: { index: false, follow: false } };
const TZ = process.env.SALON_TIMEZONE || 'Europe/Moscow';

export default async function StatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [s, rows] = await Promise.all([
    getSettings(),
    token.length <= 64 ? sql`select no, status, name, branch, pref_date, pref_time, pets, total_text, final_price, final_time from requests where token = ${token}` : Promise.resolve([]),
  ]);
  const r = rows[0];
  const head = (
    <header className="top scrolled"><div className="wrap"><a className="logo" href="/"><i />{s.name}</a><a className="btn btn-glass btn-sm" href="/" style={{ marginLeft: 'auto' }}>На сайт</a></div></header>
  );
  if (!r) return (<>{head}<section><div className="wrap"><div className="panel" style={{ maxWidth: 720, margin: '0 auto' }}><h1 className="h2">Заявка не найдена</h1><p className="muted">Проверьте ссылку. Если вопрос срочный, позвоните в салон: {s.phone}</p></div></div></section></>);
  const st = STATUS[r.status as Status];
  const date = r.pref_date ? new Date(r.pref_date).toLocaleDateString('ru-RU', { timeZone: 'UTC' }) : '';
  const pref = [date, r.pref_time !== 'Неважно' ? String(r.pref_time).toLowerCase() : ''].filter(Boolean).join(', ') || 'не указано';
  const kv: [string, string][] = [['Имя', r.name], ['Филиал', r.branch || 'любой'], ['Пожелание', pref], ['Предварительно', r.total_text]];
  if (r.final_price) kv.push(['Итоговая цена', r.final_price]);
  if (r.final_time) kv.push(['Время визита', new Date(r.final_time).toLocaleString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })]);
  return (
    <>{head}
      <section><div className="wrap"><div className="panel" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><h1 className="h2">Заявка № {r.no}</h1><span className={'badge ' + st.cls}>{st.label}</span></div>
        <div className="track">{[1, 2, 3, 4].map((n) => <i key={n} className={n <= st.step ? 'on' : ''} />)}</div>
        <p className="muted">{st.hint}</p>
        <dl className="kv group">{kv.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <h2 className="h3 group">Питомцы</h2>
        {fromJson<PricedPet[]>(r.pets, []).map((p, i) => (
          <div className="cart-row" key={i} style={{ borderColor: 'var(--line)' }}><div>{petLine(p)}<small className="muted" style={{ opacity: 1 }}>{svcLine(p)}</small></div><b>{priceText(p.res)}</b></div>
        ))}
        <StatusActions token={token} canCancel={['new', 'ask', 'ok'].includes(r.status)} />
      </div></div></section>
    </>
  );
}
