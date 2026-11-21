import { fromJson, jsonb, sql } from './db';
import { DEFAULT_SETTINGS, defaultServices, type Settings } from './content';
import { DEFAULT_TARIFFS, type Service, type Tariffs } from './pricing';

// Если база ещё не подключена, сайт всё равно открывается с настройками по умолчанию.
export async function getSettings(): Promise<Settings> {
  try {
    const [row] = await sql`select data from settings where id = 1`;
    return { ...DEFAULT_SETTINGS, ...fromJson<Partial<Settings>>(row?.data, {}) };
  } catch (e) { console.error('База недоступна, настройки по умолчанию', (e as Error).message); return DEFAULT_SETTINGS; }
}
/** Устарело: расчёт теперь по породам. Оставлено для старых файлов проекта. */
export async function getTariffs(): Promise<Tariffs> {
  try {
    const [row] = await sql`select data from tariffs where id = 1`;
    return { ...DEFAULT_TARIFFS, ...fromJson<Partial<Tariffs>>(row?.data, {}) };
  } catch { return DEFAULT_TARIFFS; }
}
const isPriceList = (v: unknown): v is Service[] => Array.isArray(v) && v.length > 0 && v.every((s) => s && Array.isArray((s as Service).tiers));
/** Прайс из кабинета. Пока владелец его не сохранял — прайс салона из lib/price-data.ts. */
export async function getServices(): Promise<Service[]> {
  try {
    const [row] = await sql`select data from services where id = 1`;
    const data = fromJson<unknown>(row?.data, null);
    if (isPriceList(data)) return data;
  } catch { /* таблицы ещё нет или база недоступна: показываем стартовый прайс */ }
  return defaultServices();
}
export async function saveSettings(s: Settings) {
  await sql`insert into settings (id, data) values (1, ${jsonb(s)}::jsonb) on conflict (id) do update set data = excluded.data, updated_at = now()`;
}
export async function saveTariffs(t: Tariffs) {
  await sql`insert into tariffs (id, data) values (1, ${jsonb(t)}::jsonb) on conflict (id) do update set data = excluded.data, updated_at = now()`;
}
export async function saveServices(list: Service[]) {
  // Таблица создаётся сама, даже если после обновления забыли запустить npm run db:migrate.
  await sql`create table if not exists services (id int primary key default 1 check (id = 1), data jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now())`;
  await sql`insert into services (id, data) values (1, ${jsonb(list)}::jsonb) on conflict (id) do update set data = excluded.data, updated_at = now()`;
}
