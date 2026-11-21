'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PREF_TIMES } from '@/lib/content';
import { LABELS, MIX_BREED, blankPet, breedsOf, calc, durationText, isKnownBreed, normBreed, priceFrom, priceText, rub, servicesForPet, svcLine, svcNames, tierFor, total, type Extra, type Pet, type PriceResult, type PricedPet, type Service, type Species, type Svc } from '@/lib/pricing';
import { useToast } from './useToast';

const DRAFT = 'grm.draft.v2';
type Form = { name: string; phone: string; branch: string; prefDate: string; prefTime: (typeof PREF_TIMES)[number]; comment: string };
const emptyForm = (branch: string): Form => ({ name: '', phone: '', branch, prefDate: '', prefTime: PREF_TIMES[0], comment: '' });
async function shrink(f: File): Promise<Blob> {
  // Уменьшаем до 1600 px и переводим в JPEG: 3 фото улезают в лимит запроса любого хостинга.
  const bmp = await createImageBitmap(f).catch(() => null);
  if (!bmp) return f;
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise<Blob>((res) => c.toBlob((b) => res(b ?? f), 'image/jpeg', 0.82));
}
const ANY = 'Любой, где свободнее';

function Chips<T extends string>({ items, value, onPick }: { items: Record<T, string>; value: T | null | T[]; onPick: (v: T) => void }) {
  return (
    <div className="chips">
      {(Object.keys(items) as T[]).map((k) => (
        <button type="button" key={k} className="chip" aria-pressed={Array.isArray(value) ? value.includes(k) : value === k} onClick={() => onPick(k)}>{items[k]}</button>
      ))}
    </div>
  );
}

export default function Booking({ services, branches }: { services: Service[]; branches: string[] }) {
  const { toast, node } = useToast();
  const [cur, setCur] = useState<Pet>(blankPet());
  const [cart, setCart] = useState<PricedPet[]>([]);
  const [form, setForm] = useState<Form>(emptyForm(branches[0] ?? ''));
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const idem = useRef<string | null>(null);

  // Черновик переживает перезагрузку страницы (кроме фото и согласия).
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) ?? 'null');
      if (d?.v === 2) { setCur({ ...blankPet(), ...d.cur }); setCart(d.cart ?? []); setForm({ ...emptyForm(branches[0] ?? ''), ...d.form }); }
    } catch { /* повреждённый черновик просто игнорируем */ }
    setLoaded(true);
  }, [branches]);
  useEffect(() => { if (loaded) localStorage.setItem(DRAFT, JSON.stringify({ v: 2, cur, cart, form })); }, [loaded, cur, cart, form]);

  // Только услуги, которые есть для выбранной породы.
  const prune = (p: Pet): Pet => { const ok = servicesForPet(services, p.species, p.breed).map((s) => s.id); return { ...p, svcs: p.svcs.filter((id) => ok.includes(id)) }; };
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ species: Species; svc: Svc }>).detail;
      setCur((c) => {
        if (c.species !== d.species) return { ...blankPet(d.species), name: c.name, svcs: [d.svc] };
        if (c.svcs.includes(d.svc)) return c;
        if (!servicesForPet(services, c.species, c.breed).some((s) => s.id === d.svc)) { toast('Для этой породы такой услуги нет в прайсе'); return c; }
        return { ...c, svcs: [...c.svcs, d.svc] };
      });
    };
    window.addEventListener('grm:pick', on);
    return () => window.removeEventListener('grm:pick', on);
  }, [services, toast]);

  const res = calc(cur, services);
  const sum = cart.length ? total(cart) : null;
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  const breeds = useMemo(() => (cur.species === 'other' ? [] : breedsOf(services, cur.species)), [services, cur.species]);
  const known = isKnownBreed(services, cur.species, cur.breed);
  const avail = servicesForPet(services, cur.species, cur.breed);
  const priced = (p: Pet, r: PriceResult): PricedPet => ({ ...p, svcName: p.species === 'other' ? undefined : svcNames(p, services), res: r });
  const setSpecies = (sp: Species) => setCur((c) => (c.species === sp ? c : { ...blankPet(sp), name: c.name }));
  const setBreed = (b: string) => setCur((c) => prune({ ...c, breed: b }));
  const toggleSvc = (id: string) => setCur((c) => ({ ...c, svcs: c.svcs.includes(id) ? c.svcs.filter((x) => x !== id) : [...c.svcs, id] }));
  const toggleExtra = (x: Extra) => setCur((c) => ({ ...c, extra: c.extra.includes(x) ? c.extra.filter((e) => e !== x) : [...c.extra, x] }));
  const hint = res
    ? (res.manual ? 'Точную цену назовёт мастер' : 'Можно добавить ещё питомца или оформить заявку')
    : !cur.breed.trim() ? 'Укажите породу и выберите услугу' : 'Выберите одну или несколько услуг';
  const addPet = () => {
    if (!res) { toast(hint); return false; }
    if (cart.length >= 6) { toast('В одной заявке до 6 питомцев'); return false; }
    setCart((l) => [...l, priced(cur, res)]); setCur(blankPet(cur.species)); return true;
  };
  const onFiles = (list: FileList | null) => {
    const ok = Array.from(list ?? []).filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 25 * 1024 * 1024);
    if (ok.length < (list?.length ?? 0)) toast('Подойдут JPEG, PNG или WebP до 25 МБ');
    if (ok.length > 3) toast('Можно до 3 фото, взяли первые 3');
    setFiles(ok.slice(0, 3));
  };

  async function submit() {
    if (sending) return;
    let pets = cart;
    if (res && cart.length < 6) { pets = [...cart, priced(cur, res)]; setCart(pets); setCur(blankPet(cur.species)); }
    if (!pets.length) { toast('Сначала выберите породу и услугу'); location.hash = 'calc'; return; }
    if (!form.name.trim()) { toast('Укажите имя'); return; }
    if (form.phone.replace(/\D/g, '').length < 10) { toast('Укажите телефон, чтобы салон мог связаться'); return; }
    if (!consent) { toast('Отметьте согласие на обработку данных'); return; }
    setSending(true);
    idem.current ??= (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)); // один ключ на все повторы: дубля заявки не будет
    const fd = new FormData();
    fd.append('payload', JSON.stringify({ ...form, consent: true, pets: pets.map((p) => ({ species: p.species, breed: p.breed, svcs: p.svcs, extra: p.extra, name: p.name })) }));
    for (const f of files) fd.append('photos', await shrink(f), 'photo.jpg');
    try {
      const r = await fetch('/api/requests', { method: 'POST', body: fd, headers: { 'Idempotency-Key': idem.current } });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { toast(data.error ?? 'Не удалось отправить. Попробуйте ещё раз.'); setSending(false); return; }
      localStorage.removeItem(DRAFT); idem.current = null;
      window.location.href = `/r/${data.token}`;
    } catch {
      toast('Нет связи с сервером. Заявка сохранена в черновике, попробуйте ещё раз.');
      setSending(false);
    }
  }

  const f = (k: keyof Form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const isMix = normBreed(cur.breed) === normBreed(MIX_BREED);
  return (
    <>
      <section id="calc"><div className="wrap">
        <div className="sec-head"><div><h2 className="h2">Рассчитать стоимость</h2><p className="muted">Цена по прайсу салона для вашей породы. Итог мастер подтвердит по фото или на месте.</p></div></div>
        <div className="calc">
          <div className="panel">
            <Chips items={LABELS.species as Record<Species, string>} value={cur.species} onPick={setSpecies} />
            <div className="grid2 group">
              <label className="field"><span>Кличка</span><input className="input" maxLength={40} placeholder="Например, Буся" value={cur.name} onChange={(e) => setCur((c) => ({ ...c, name: e.target.value }))} /></label>
              {cur.species !== 'other' && <label className="field"><span>Порода</span><input className="input" maxLength={80} list="breeds" placeholder="Начните вводить породу" value={cur.breed} onChange={(e) => setBreed(e.target.value)} /></label>}
            </div>
            <datalist id="breeds">{breeds.map((b) => <option key={b} value={b} />)}</datalist>
            {cur.species !== 'other' && <>
              <div className="chips" style={{ marginTop: 10 }}><button type="button" className="chip" aria-pressed={isMix} onClick={() => setBreed(isMix ? '' : MIX_BREED)}>Метис или не знаю породу</button></div>
              {cur.breed.trim() && !known && <p className="muted small">Этой породы нет в прайсе. Выберите услугу, а цену мастер назовёт после заявки.</p>}
              <div className="group"><span className="lbl">Услуги <span className="muted small">(можно несколько)</span></span>
                {avail.length ? <div className="chips">{avail.map((s) => {
                  const t = known ? tierFor(s, cur.breed) : null;
                  const p = priceFrom(s);
                  const note = t ? (t.from ? 'от ' : '') + rub(t.price) + (t.minutes ? ' · ' + durationText(t.minutes, t.minutesFrom) : '') : (p.from ? 'от ' : '') + rub(p.price);
                  return <button type="button" key={s.id} className="chip chip-svc" aria-pressed={cur.svcs.includes(s.id)} onClick={() => toggleSvc(s.id)}>{s.title}<small>{note}</small></button>;
                })}</div> : <p className="muted small">Для этого питомца услуги уточняйте по телефону.</p>}
              </div>
              <div className="group"><span className="lbl">Особенности</span><Chips items={LABELS.extra as Record<Extra, string>} value={cur.extra} onPick={toggleExtra} />
                <p className="muted small">Если что-то отмечено, мастер уточнит итоговую цену.</p></div>
            </>}
            {cur.species === 'other' && <div className="group"><p className="muted">Кролики, хорьки и другие животные считаются индивидуально. Опишите питомца в комментарии, мастер скажет, возьмётся ли и сколько это стоит.</p></div>}
            <div className="group"><button type="button" className="btn btn-glass" onClick={() => { if (addPet()) toast('Питомец добавлен. Опишите следующего'); }}>+ Добавить ещё питомца</button></div>
          </div>
          <aside className="summary" aria-live="polite">
            <div className="small" style={{ opacity: 0.75 }}>{cart.length ? `Питомец ${cart.length + 1}` : 'Текущий питомец'}{cur.name ? `: ${cur.name}` : ''}</div>
            <div className="total">{priceText(res)}</div>
            {!!res?.minutes && <div className="small" style={{ opacity: 0.85 }}>≈ {durationText(res.minutes)}</div>}
            <div className="small" style={{ opacity: 0.75 }}>{hint}</div>
            <div style={{ marginTop: 18 }}>{cart.map((p, i) => (
              <div className="cart-row" key={i}><div>{p.name || LABELS.species[p.species]}{p.breed ? `, ${p.breed}` : ''}<small>{svcLine(p)}</small></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b>{priceText(p.res)}</b><button type="button" className="x" aria-label="Убрать" onClick={() => setCart((l) => l.filter((_, j) => j !== i))}>×</button></div></div>
            ))}</div>
            {sum && <div className="cart-row"><b>Итого в заявке</b><b>{sum.text}</b></div>}
            <a className="btn btn-irid" href="#request" style={{ width: '100%', marginTop: 18 }} onClick={(e) => { if (!cart.length && !res) { e.preventDefault(); toast('Сначала выберите породу и услугу'); } }}>Оформить заявку</a>
            <p className="note">Цена фиксируется в заявке на момент отправки. Салон подтвердит итог.</p>
          </aside>
        </div>
      </div></section>
      <section id="request"><div className="wrap"><div className="panel" style={{ maxWidth: 780, margin: '0 auto' }}>
        <h2 className="h2">Заявка</h2><p className="muted">Салон свяжется с вами, подтвердит время и итоговую цену.</p>
        <div className="grid2 group"><label className="field"><span>Ваше имя</span><input className="input" autoComplete="name" maxLength={60} {...f('name')} /></label>
          <label className="field"><span>Телефон</span><input className="input" type="tel" autoComplete="tel" maxLength={20} placeholder="+7 900 000-00-00" {...f('phone')} /></label></div>
        <div className="grid2 group"><label className="field"><span>Филиал</span><select className="input" {...f('branch')}>{branches.map((b) => <option key={b}>{b}</option>)}<option value="">{ANY}</option></select></label>
          <label className="field"><span>Желаемая дата</span><input className="input" type="date" min={new Date().toISOString().slice(0, 10)} {...f('prefDate')} /></label></div>
        <div className="grid2 group"><label className="field"><span>Время</span><select className="input" {...f('prefTime')}>{PREF_TIMES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <p className="muted small" style={{ alignSelf: 'end', margin: '0 0 6px' }}>Это пожелание, а не запись. Точное время предложит салон.</p></div>
        <div className="group"><label className="drop"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => onFiles(e.target.files)} /><b>Добавить фото питомца</b><br /><span className="muted small">До 3 фото: JPEG, PNG или WebP. По ним мастер точнее оценит шерсть. Фото видит только салон.</span></label>
          {!!previews.length && <div className="thumbs">{previews.map((u) => <img key={u} src={u} alt="" />)}</div>}</div>
        <label className="field group"><span>Комментарий</span><textarea className="input" maxLength={600} placeholder="Например, боится фена" {...f('comment')} /></label>
        <label className="check group"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span className="muted">Соглашаюсь на обработку персональных данных по <a href="#policy">политике салона</a></span></label>
        <div className="group"><button type="button" className="btn btn-irid" style={{ width: '100%' }} disabled={sending} onClick={submit}>{sending ? 'Отправляем…' : 'Отправить заявку'}</button></div>
      </div></div></section>
      {node}
    </>
  );
}
