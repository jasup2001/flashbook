import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import type { Flash } from './types';

export default function FlashViewer({ flashes, initialIndex, onClose }: { flashes: Flash[]; initialIndex: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState(1);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const scaleRef = useRef(1);
  const flash = flashes[index];
  const go = useCallback((direction: number) => {
    setIndex((current) => (current + direction + flashes.length) % flashes.length);
    setLoaded(false);
    setFailed(false);
    setScale(1);
    scaleRef.current = 1;
  }, [flashes.length]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>('button')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      element?.close();
      opener?.focus();
    };
  }, []);

  return createPortal(<dialog className="viewer" ref={dialog} aria-label="Podgląd arkusza" aria-describedby="viewer-help"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(event.key === 'ArrowRight' ? 1 : -1); }
    }}>
    <div className="viewer__header">
      <div aria-live="polite"><span className="eyebrow">Arkusz {flash.number}</span><span className="viewer__name">{flash.id}</span></div>
      <button className="text-button" onClick={onClose} aria-label="Zamknij podgląd">Zamknij <span aria-hidden="true">×</span></button>
    </div>
    <TransformWrapper key={flash.id} minScale={1} maxScale={6} centerOnInit
      doubleClick={{ mode: 'toggle', step: 1 }} wheel={{ step: 0.15 }}
      onTransformed={(_, state) => { scaleRef.current = state.scale; setScale(state.scale); }}>
      {({ zoomIn, zoomOut, resetTransform }) => <>
        <div className="viewer__stage"
          onTouchStartCapture={(event) => {
            touch.current = event.touches.length === 1 && scaleRef.current <= 1.01
              ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
          }}
          onTouchEndCapture={(event) => {
            if (touch.current && event.changedTouches.length === 1 && scaleRef.current <= 1.01) {
              const dx = event.changedTouches[0].clientX - touch.current.x;
              const dy = event.changedTouches[0].clientY - touch.current.y;
              if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
            }
            touch.current = null;
          }} onTouchCancel={() => { touch.current = null; }}>
          <TransformComponent wrapperClass="viewer__transform" contentClass="viewer__image-wrap">
            <img className="viewer__image" src={loaded ? flash.original : flash.thumbnails.at(-1)!.src} alt={`Arkusz ${flash.number} — ${flash.id}`} draggable={false} />
          </TransformComponent>
          {!loaded && !failed && <img key={flash.original} className="viewer__preload" src={flash.original} alt="" aria-hidden="true" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
          <span className="viewer__quality" role="status">{failed ? 'Nie udało się wczytać oryginału. Wyświetlamy podgląd.' : loaded ? 'Oryginalna jakość' : 'Wczytywanie oryginału…'}</span>
        </div>
        <div className="viewer__toolbar">
          <div className="viewer__paging"><button onClick={() => go(-1)} aria-label="Poprzedni arkusz">←</button><span aria-live="polite">{flash.number} / {flashes.length}</span><button onClick={() => go(1)} aria-label="Następny arkusz">→</button></div>
          <div className="viewer__zoom"><button onClick={() => zoomOut()} disabled={scale <= 1.01} aria-label="Pomniejsz">−</button><button onClick={() => resetTransform()} aria-label="Resetuj powiększenie">{Math.round(scale * 100)}%</button><button onClick={() => zoomIn()} disabled={scale >= 5.99} aria-label="Powiększ">+</button></div>
          <a href={flash.original} target="_blank" rel="noopener noreferrer" className="viewer__original">Otwórz oryginał ↗</a>
        </div>
      </>}
    </TransformWrapper>
    <p id="viewer-help" className="viewer__help">Uszczypnij lub kliknij dwukrotnie, aby powiększyć. Przesuń, aby zmienić arkusz. Klawiatura: ← → / Esc.</p>
  </dialog>, document.body);
}
