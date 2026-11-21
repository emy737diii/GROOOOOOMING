// Расчёт цены по ПОРОДЕ (прайс салона). Один и тот же код работает в браузере (показ) и на сервере (снимок цены в заявке).
export type Species = 'dog' | 'cat' | 'other';
export type Size = 'xs' | 's' | 'm' | 'l' | 'xl';
export type Coat = 'short' | 'mid' | 'long' | 'wire';
/** id услуги из кабинета */
export type Svc = string;
export type Extra = 'mats' | 'shed' | 'nervous' | 'senior';
// size, coat и svc остались только для чтения старых заявок. Новые заявки хранят список услуг в svcs.
export interface Pet { species: Species; breed: string; svcs: Svc[]; extra: Extra[]; name: string; size?: Size | null; coat?: Coat | null; svc?: Svc | null; svcName?: string }
export interface PriceResult { manual: boolean; price: number; minutes?: number }
export interface PricedPet extends Pet { res: PriceResult }

/** Одна строка прайса: цена и длительность для списка пород. from — цена «от». */
export type Tier = { price: number; from: boolean; minutes: number; minutesFrom: boolean; breeds: string[] };
/** Услуга из кабинета владельца: название, для кого, описание, фото и цены по породам. */
export type Service = { id: string; title: string; species: 'dog' | 'cat'; text: string; photo: string; tiers: Tier[] };

// Старые тарифы (вес × шерсть) больше не участвуют в расчёте. Тип оставлен, чтобы не ломать старые файлы проекта.
export type Tariffs = { xs: number; s: number; m: number; l: number; xl: number; mid: number; long: number; wire: number; cat: number; catLong: number; hyg: number; wash: number; nails: number; mats: number; shed: number; min: number };
export const DEFAULT_TARIFFS: Tariffs = { xs: 2000, s: 2500, m: 3300, l: 4200, xl: 5200, mid: 1.15, long: 1.3, wire: 1.4, cat: 2800, catLong: 1.2, hyg: 0.5, wash: 0.6, nails: 400, mats: 600, shed: 400, min: 1000 };
export const TARIFF_FIELDS: [keyof Tariffs, string][] = [];

export const LABELS = {
  species: { dog: 'собака', cat: 'кошка', other: 'другое животное' } as Record<Species, string>,
  size: { xs: 'до 5 кг', s: '5–10 кг', m: '10–25 кг', l: '25–40 кг', xl: 'от 40 кг' } as Record<Size, string>,
  coat: { short: 'Короткая', mid: 'Средняя', long: 'Длинная', wire: 'Жёсткая, тримминг' } as Record<Coat, string>,
  svc: { full: 'Комплекс', hyg: 'Гигиена', wash: 'Мытьё и сушка', nails: 'Только когти' } as Record<string, string>,
  extra: { mats: 'Колтуны', shed: 'Сильная линька', nervous: 'Нервничает', senior: 'Пожилой' } as Record<Extra, string>,
};
export const MIX_BREED = 'Метис';

export function blankPet(species: Species = 'dog'): Pet {
  return { species, breed: '', svcs: [], extra: [], name: '' };
}

/** Сравнение пород без учёта регистра, буквы ё и лишних пробелов. «Метис / не знаю» = «Метис». */
export const normBreed = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const key = (breed: string) => { const n = normBreed(breed); return n.startsWith('метис') ? 'метис' : n; };

export const ofSpecies = (list: Service[], sp: Species) => list.filter((s) => s.species === sp);
/** Все породы вида из прайса, по алфавиту, «Метис» первым. */
export function breedsOf(list: Service[], sp: Species): string[] {
  const m = new Map<string, string>();
  for (const s of ofSpecies(list, sp)) for (const t of s.tiers) for (const b of t.breeds) if (b.trim() && !m.has(key(b))) m.set(key(b), b.trim());
  return [...m.values()].sort((a, b) => (key(a) === 'метис' ? -1 : key(b) === 'метис' ? 1 : a.localeCompare(b, 'ru')));
}
export const isKnownBreed = (list: Service[], sp: Species, breed: string) => !!breed.trim() && ofSpecies(list, sp).some((s) => !!tierFor(s, breed));
export function tierFor(s: Service, breed: string): Tier | null {
  const k = key(breed);
  if (!k) return null;
  return s.tiers.find((t) => t.breeds.some((b) => key(b) === k)) ?? null;
}
/** Услуги, которые можно выбрать: для известной породы — только те, где она есть в прайсе; иначе все услуги вида. */
export function servicesForPet(list: Service[], sp: Species, breed: string): Service[] {
  const all = ofSpecies(list, sp);
  return isKnownBreed(list, sp, breed) ? all.filter((s) => !!tierFor(s, breed)) : all;
}
const pickedIds = (p: Pet) => (p.svcs?.length ? p.svcs : p.svc ? [p.svc] : []);
export const svcNames = (p: Pet, list: Service[]) => pickedIds(p).map((id) => list.find((s) => s.id === id)?.title ?? id).join(' + ');

/**
 * null — ещё не всё выбрано (порода, услуга) или услуга недоступна для этой породы.
 * price = 0 — цена только вручную (порода не из прайса, другое животное). Никогда не показываем как «бесплатно».
 * Особенности (колтуны, линька, нервничает, пожилой) делают цену «от»: итог уточнит мастер.
 */
export function calc(p: Pet, services: Service[]): PriceResult | null {
  if (p.species === 'other') return { manual: true, price: 0 };
  const ids = pickedIds(p);
  if (!p.breed.trim() || !ids.length) return null;
  const chosen: Service[] = [];
  for (const id of ids) { const s = services.find((x) => x.id === id && x.species === p.species); if (!s) return null; chosen.push(s); }
  if (!isKnownBreed(services, p.species, p.breed)) return { manual: true, price: 0 };
  let price = 0, minutes = 0, manual = p.extra.length > 0;
  for (const s of chosen) {
    const t = tierFor(s, p.breed);
    if (!t) return null;
    price += t.price; minutes += t.minutes;
    if (t.from) manual = true;
  }
  return { manual, price, minutes };
}

/** Минимальная цена услуги для карточки на сайте. */
export function priceFrom(s: Service): { from: boolean; price: number } {
  const prices = s.tiers.map((t) => t.price);
  const min = Math.min(...prices);
  return { from: s.tiers.length > 1 || s.tiers.some((t) => t.from), price: Number.isFinite(min) ? min : 0 };
}
/** «1 ч 15 мин». 0 — длительность не указана. */
export function durationText(m: number, from = false): string {
  if (!m || m <= 0) return '';
  const h = Math.floor(m / 60), mm = m % 60;
  return (from ? 'от ' : '') + [h ? `${h} ч` : '', mm ? `${mm} мин` : ''].filter(Boolean).join(' ');
}
export function durationRange(s: Service): string {
  const list = s.tiers.map((t) => t.minutes).filter((m) => m > 0);
  if (!list.length) return '';
  const a = Math.min(...list), b = Math.max(...list);
  return a === b ? durationText(a) : `${durationText(a)} – ${durationText(b)}`;
}

export const rub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')}\u00a0₽`;
export function priceText(r: PriceResult | null): string {
  if (!r) return '—';
  if (!r.price) return 'Цена уточняется';
  return (r.manual ? 'от ' : '') + rub(r.price);
}
export function total(list: PricedPet[]) {
  let sum = 0, manual = false, any = false;
  for (const p of list) { if (p.res.price) { sum += p.res.price; any = true; } else manual = true; if (p.res.manual) manual = true; }
  return { min: sum, manual, text: any ? (manual ? 'от ' : '') + rub(sum) : 'Цена уточняется' };
}
export function petLine(p: Pet): string {
  const d: string[] = [LABELS.species[p.species]];
  if (p.breed) d.push(p.breed);
  if (p.species === 'dog' && p.size) d.push(LABELS.size[p.size]);
  if (p.coat) d.push('шерсть ' + LABELS.coat[p.coat].toLowerCase());
  if (p.extra.length) d.push(p.extra.map((x) => LABELS.extra[x].toLowerCase()).join(', '));
  return `${p.name || 'Без клички'}: ${d.join(', ')}`;
}
export function svcLine(p: PricedPet): string {
  if (p.species === 'other') return 'Оценка вручную';
  // Название сохраняется в заявке: если услугу потом удалят или переименуют, старая заявка покажет то, что выбрал клиент.
  const name = p.svcName || (p.svc ? LABELS.svc[p.svc] || p.svc : '') || (p.svcs ?? []).join(', ') || 'Услуга';
  return name + (p.res.manual ? ', цену уточнит мастер' : '');
}
