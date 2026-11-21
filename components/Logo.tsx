// Логотип салона: неоновая собака из фирменного знака + название справа с тёплым неоновым свечением.
// Файл картинки: public/brand/dog.webp (и dog@2x.webp для чётких экранов).
export default function Logo({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={'brand brand-' + size}>
      <img className="brand-dog" src="/brand/dog.webp" srcSet="/brand/dog.webp 1x, /brand/dog@2x.webp 2x" alt="" width={209} height={287} />
      <span className="brand-word">{name}</span>
    </span>
  );
}
