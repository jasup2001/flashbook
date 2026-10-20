import type { Flash } from './types';

export function FlashCard({ flash, onOpen, priority }: { flash: Flash; onOpen: () => void; priority: boolean }) {
  return <button className="flash-card" onClick={onOpen} aria-label={`Otwórz arkusz ${flash.number}: ${flash.id}`}>
    <span className="flash-card__image">
      <img src={flash.thumbnails[0].src}
        srcSet={flash.thumbnails.map(({ src, width }) => `${src} ${width}w`).join(', ')}
        sizes="(min-width: 1500px) 436px, (min-width: 960px) calc((100vw - 128px) / 3), (min-width: 560px) calc((100vw - 80px) / 2), calc(100vw - 40px)"
        width={flash.width} height={flash.height} alt={`Projekt tatuażu — ${flash.id}`}
        loading={priority ? 'eager' : 'lazy'} decoding="async" />
    </span>
    <span className="flash-card__caption"><span>Arkusz {flash.number}</span><span aria-hidden="true">↗</span></span>
  </button>;
}
