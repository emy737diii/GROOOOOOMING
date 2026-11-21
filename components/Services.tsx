'use client';
import { durationRange, priceFrom, rub, type Service, type Species } from '@/lib/pricing';

// Карточки и прайс строятся из списка, который владелец ведёт в кабинете («Услуги и цены»).
export default function Services({ services }: { services: Service[] }) {
  const pick = (s: Service) => window.dispatchEvent(new CustomEvent('grm:pick', { detail: { species: s.species as Species, svc: s.id } }));
  const label = (s: Service) => { const p = priceFrom(s); return (p.from ? 'от ' : '') + rub(p.price); };
  const featured = services.filter((s) => s.photo);
  let wideDone = false;
  const cols: [string, Service[]][] = [['Собаки', services.filter((s) => s.species === 'dog')], ['Кошки', services.filter((s) => s.species === 'cat')]];
  return (
    <section id="services"><div className="wrap">
      <div className="sec-head"><div><h2 className="h2">Услуги и цены</h2><p className="muted">Цена зависит от породы. Выберите породу в расчёте, и сайт покажет точную стоимость по прайсу салона.</p></div><a className="btn btn-glass btn-sm" href="#calc">Рассчитать свою</a></div>
      {!!featured.length && <div className="bento">
        {featured.map((s, i) => {
          let size = i === 0 ? 'big' : '';
          if (!size && s.species === 'cat' && !wideDone) { size = 'wide'; wideDone = true; }
          const dur = durationRange(s);
          return (
            <a key={s.id} href="#calc" onClick={() => pick(s)} className={['svc', size].filter(Boolean).join(' ')}>
              <img loading="lazy" src={s.photo} alt={s.title} />
              <span className="price">{label(s)}</span>
              <span className="kind">{s.species === 'dog' ? 'Собаки' : 'Кошки'}</span>
              <h3 className="h3">{s.title}</h3>
              {s.text && <p>{s.text}</p>}
              {dur && <span className="meta">{dur}</span>}
            </a>
          );
        })}
      </div>}
      <div className="price-cols">
        {cols.filter(([, l]) => l.length).map(([title, list]) => (
          <div className="panel" key={title}>
            <h3 className="h3">{title}</h3>
            {list.map((s) => (
              <a key={s.id} href="#calc" className="price-row" onClick={() => pick(s)}>
                <span>{s.title}{durationRange(s) && <small>{durationRange(s)}</small>}</span>
                <b>{label(s)}</b>
              </a>
            ))}
          </div>
        ))}
      </div>
    </div></section>
  );
}
