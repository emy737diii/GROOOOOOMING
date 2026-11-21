import { z } from 'zod';
import { PREF_TIMES, STATUS } from './content';

export const petSchema = z.object({
  species: z.enum(['dog', 'cat', 'other']),
  breed: z.string().trim().max(80),
  // id услуг из кабинета; есть ли они для этой породы, проверяет расчёт на сервере
  svcs: z.array(z.string().trim().min(1).max(40)).max(8).default([]).transform((l) => [...new Set(l)]),
  extra: z.array(z.enum(['mats', 'shed', 'nervous', 'senior'])).max(4),
  name: z.string().trim().max(40),
});
export const requestSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(60),
  phone: z.string().trim().max(20).refine((v) => v.replace(/\D/g, '').length >= 10, 'Укажите телефон'),
  branch: z.string().trim().max(120),
  prefDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')),
  prefTime: z.enum(PREF_TIMES),
  comment: z.string().trim().max(600),
  consent: z.literal(true, { errorMap: () => ({ message: 'Нужно согласие на обработку данных' }) }),
  pets: z.array(petSchema).min(1).max(6),
});
export type RequestInput = z.infer<typeof requestSchema>;

export const adminUpdateSchema = z.object({
  status: z.enum(Object.keys(STATUS) as [keyof typeof STATUS, ...(keyof typeof STATUS)[]]),
  finalPrice: z.string().trim().max(40),
  finalTime: z.string().max(40),
  internalNote: z.string().trim().max(1000),
});
export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(40),
  phone: z.string().trim().max(20),
  hours: z.string().trim().max(80),
  branches: z.array(z.string().trim().min(1).max(120)).min(1).max(10),
  heroTitle: z.string().trim().min(1).max(90),
  heroText: z.string().trim().max(240),
  catEnabled: z.boolean(),
  phrasesEnabled: z.boolean(),
});
const pos = z.number().positive().max(1_000_000);
export const tariffsSchema = z.object({ xs: pos, s: pos, m: pos, l: pos, xl: pos, mid: pos, long: pos, wire: pos, cat: pos, catLong: pos, hyg: pos, wash: pos, nails: pos, mats: pos, shed: pos, min: pos });
export const passwordSchema = z.object({ current: z.string().min(1), next: z.string().min(10, 'Минимум 10 символов').max(128) });

const tierSchema = z.object({
  price: z.number({ invalid_type_error: 'Укажите цену' }).positive('Цена должна быть больше нуля').max(1_000_000),
  from: z.boolean(),
  minutes: z.number({ invalid_type_error: 'Укажите длительность в минутах (0 — не указывать)' }).int().min(0).max(1440),
  minutesFrom: z.boolean(),
  breeds: z.array(z.string().trim().min(1).max(80)).min(1, 'В каждой цене должна быть хотя бы одна порода').max(400),
});
export const serviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  title: z.string().trim().min(1, 'У каждой услуги должно быть название').max(80, 'Название услуги — до 80 символов'),
  species: z.enum(['dog', 'cat']),
  text: z.string().trim().max(240, 'Описание — до 240 символов'),
  photo: z.string().trim().max(500).refine((v) => v === '' || v.startsWith('/') || v.startsWith('https://'), 'Фото: ссылка https://… или путь /photos/имя.webp'),
  tiers: z.array(tierSchema).min(1, 'У услуги должна быть хотя бы одна цена').max(40),
});
export const servicesSchema = z.array(serviceSchema).min(1, 'Нужна хотя бы одна услуга').max(60, 'До 60 услуг')
  .refine((l) => new Set(l.map((s) => s.id)).size === l.length, 'Услуги повторяются, обновите страницу');
