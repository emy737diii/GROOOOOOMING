import type { Metadata, Viewport } from 'next';
import Header from '@/components/Header';
import Stage from '@/components/Stage';
import Services from '@/components/Services';
import Booking from '@/components/Booking';
import { Contacts, Footer, Gallery, Steps } from '@/components/Sections';
import { getServices, getSettings } from '@/lib/settings';

// Данные салона, тарифы и услуги читаются из базы при каждом запросе: правки в кабинете видны сразу.
export const dynamic = 'force-dynamic';
export const viewport: Viewport = { themeColor: '#0B0910', colorScheme: 'dark' };
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: `${s.name} — груминг собак и кошек`, description: s.heroText };
}

export default async function Home() {
  const [s, services] = await Promise.all([getSettings(), getServices()]);
  const tel = 'tel:' + s.phone.replace(/[^\d+]/g, '');
  return (
    <>
      <Header name={s.name} />
      <main>
        <section className="hero"><div className="wrap">
          <div className="hero-copy">
            <h1 className="h1">{s.heroTitle}</h1>
            <p className="lead">{s.heroText}</p>
            <div className="cta"><a className="btn btn-irid" href="#calc">Рассчитать стоимость</a><a className="btn btn-glass" id="callBtn" href={tel}>Позвонить</a></div>
            <div className="tags"><span className="tag">★ 4,9 на Яндекс Картах · 20 оценок</span><span className="tag">Цена по породе онлайн</span><span className="tag">Заявка с фото питомца</span><span className="tag">Статус по личной ссылке</span></div>
          </div>
          <Stage catEnabled={s.catEnabled} phrasesEnabled={s.phrasesEnabled} />
        </div></section>
        <Services services={services} />
        <Gallery />
        <Booking services={services} branches={s.branches} />
        <Steps />
        <Contacts s={s} />
      </main>
      <Footer name={s.name} />
    </>
  );
}
