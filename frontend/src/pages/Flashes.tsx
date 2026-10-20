import { lazy, Suspense, useState } from 'react';
import { PageHeading } from '../components/PageHeading';
import { FlashCard } from '../features/flashes/FlashCard';
import flashes from '../data/flashes.json';

const FlashViewer = lazy(() => import('../features/flashes/FlashViewer'));

export function Flashes() {
  const [selected, setSelected] = useState<number | null>(null);
  return <>
    <PageHeading title="Flashes" eyebrow="Flashbook / archiwum">
      <p>{flashes.length} autorskich arkuszy.</p><p className="muted">Wybierz projekt. Przyjrzyj się detalom.</p>
    </PageHeading>
    <div className="gallery-meta"><span>Wszystkie projekty</span><span>{String(flashes.length).padStart(2, '0')} arkuszy</span></div>
    <div className="flash-grid">
      {flashes.map((flash, index) => <FlashCard key={flash.id} flash={flash} priority={index < 3} onOpen={() => setSelected(index)} />)}
    </div>
    {selected !== null && <Suspense fallback={<p className="viewer-pending" role="status">Otwieranie podglądu…</p>}>
      <FlashViewer flashes={flashes} initialIndex={selected} onClose={() => setSelected(null)} />
    </Suspense>}
  </>;
}
