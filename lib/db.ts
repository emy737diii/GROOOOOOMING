import postgres from 'postgres';

const g = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };

// Одно подключение на процесс. Все запросы через tagged template: параметры экранируются автоматически.
export const sql = g.__sql ?? postgres(process.env.DATABASE_URL || 'postgres://localhost:5432/none', { max: 10, idle_timeout: 20, connect_timeout: 5 });
if (process.env.NODE_ENV !== 'production') g.__sql = sql;

/** Значение для колонки jsonb. Передаём объект через sql.json, иначе postgres.js кодирует строку второй раз. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jsonb = (v: unknown) => sql.json(v as any);
/** Читает jsonb надёжно: если в базе лежит строка с JSON (старые записи), разбирает её. */
export function fromJson<T>(v: unknown, fallback: T): T {
  let x = v;
  for (let i = 0; i < 2 && typeof x === 'string'; i++) { try { x = JSON.parse(x); } catch { return fallback; } }
  return (x ?? fallback) as T;
}
