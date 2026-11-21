// Всё, что меняется под конкретный салон в коде: фото, тексты, фразы питомцев, 3D-модели.
// Название, телефон, часы, филиалы и прайс (услуги и цены по породам) владелец меняет сам в кабинете.
import { PRICE_SERVICES } from './price-data';
import type { Service } from './pricing';

export type Settings = { name: string; phone: string; hours: string; branches: string[]; heroTitle: string; heroText: string; catEnabled: boolean; phrasesEnabled: boolean };
// Данные с карточки Яндекс Карт (Лофтгрум, Беловежская ул., 85). На карточке виден только статус «до 22:00», полного графика нет.
// Владелец может поменять всё это в кабинете → «Салон».
// catEnabled: false — 3D-кошка под лицензией CC BY-NC (только некоммерческое использование), на рабочем сайте салона выключена.
export const DEFAULT_SETTINGS: Settings = {
  name: 'Лофтгрум', phone: '+7 993 591-24-68', hours: 'До 22:00, график уточняйте по телефону', branches: ['Москва, Беловежская ул., 85'],
  heroTitle: 'Груминг, после которого хочется обниматься',
  heroText: 'Стрижка, мытьё, вычес и гигиена для собак и кошек. Выберите породу, и сайт покажет цену по прайсу салона. Мастер подтвердит время.',
  catEnabled: false, phrasesEnabled: true,
};

// Фото услуг (public/photos). Услуги с фото показываются большими карточками, остальные — в прайсе списком.
const SERVICE_PHOTOS: Record<string, string> = {
  d5: '/photos/poodle-groomed.webp', // Комплекс стрижки, вычес, мытьё
  d4: '/photos/corgi-towel.webp', // Мытьё собаки
  d7: '/photos/yorkie-groomed.webp', // Гигиена без мытья
  c4: '/photos/cat-towel.webp', // Мытьё кота / кошки
};
// Порядок услуг на сайте (по id из lib/price-data.ts).
const ORDER = ['d5', 'd4', 'd7', 'c4', 'd6', 'd1', 'd2', 'd3', 'd8', 'c2', 'c3', 'c9', 'c5', 'c6', 'c7', 'c8', 'c1'];

/** Стартовый прайс: из файла салона + фото. Пока владелец не сохранял «Услуги и цены» в кабинете. */
export function defaultServices(): Service[] {
  const pos = (id: string) => { const i = ORDER.indexOf(id); return i < 0 ? 999 : i; };
  return [...PRICE_SERVICES].sort((a, b) => pos(a.id) - pos(b.id)).map((s) => ({ ...s, photo: SERVICE_PHOTOS[s.id] ?? s.photo, tiers: s.tiers.map((t) => ({ ...t, breeds: [...t.breeds] })) }));
}

export const GALLERY = [
  { photo: '/photos/grooming-room.webp', alt: 'Зал груминга: столы для стрижки и неоновая подсветка', caption: 'Зал груминга' },
  { photo: '/photos/corgi-undercoat.webp', alt: 'Корги за горой вычесанной шерсти', caption: 'После вычеса' },
  { photo: '/photos/lounge.webp', alt: 'Уголок с диваном и стеной фотографий собак', caption: 'Уголок для ожидания' },
  { photo: '/photos/corgi-after-bath.webp', alt: 'Корги в полотенце в ванне, на переднем плане вычесанная шерсть', caption: 'Вычес и мытьё' },
  { photo: '/photos/photo-wall.webp', alt: 'Решётка с фотографиями щенков', caption: 'Фотостена в салоне' },
];
// Все фото на сайте — фото салона, стоковых больше нет.
export const PHOTO_CREDIT = '';
// 3D-модели: положите файлы в public/models. См. README, раздел «3D-модели».
export const MODELS = {
  dog: { file: '/models/dog.glb', credit: '3D-модель «Shiba Inu Dog» — Ida Faber, Sketchfab, CC BY 4.0' },
  cat: { file: '/models/cat.glb', credit: '3D-модель «Cat» — Suushimi, Sketchfab, CC BY-NC 4.0' },
} as const;
export const PHRASES: Record<'dog' | 'cat', string[]> = {
  dog: ['Гав! Покрути меня пальцем', 'После мытья я пахну счастьем', 'Когти стучат по полу. Пора к мастеру!', 'Выбери мою породу ниже и узнай цену'],
  cat: ['Мрр. Только без фена, пожалуйста', 'Колтуны? Какие колтуны?', 'Я сама решу, когда красивая', 'Мяу. Записывай на субботу'],
};
/** Устарело: список пород теперь берётся из прайса. */
export const BREEDS: string[] = [];
export const PREF_TIMES = ['Неважно', 'Утром', 'Днём', 'Вечером'] as const;
export const STATUS = {
  new: { label: 'Новая', cls: 'b-new', step: 1, hint: 'Салон скоро посмотрит заявку и свяжется с вами.' },
  ask: { label: 'Нужно уточнение', cls: 'b-ask', step: 1, hint: 'Салон позвонит или напишет, чтобы уточнить детали.' },
  ok: { label: 'Подтверждена', cls: 'b-ok', step: 2, hint: 'Ждём вас в назначенное время.' },
  done: { label: 'Выполнена', cls: 'b-done', step: 4, hint: 'Спасибо, что выбрали нас!' },
  cancel: { label: 'Отменена', cls: 'b-cancel', step: 0, hint: 'Заявка отменена. Чтобы записаться снова, отправьте новую.' },
} as const;
export type Status = keyof typeof STATUS;
