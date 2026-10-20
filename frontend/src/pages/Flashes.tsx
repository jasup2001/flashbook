import { lazy, Suspense, useState } from 'react';
import { PageHeading } from '../components/PageHeading';
import { FlashCard } from '../features/flashes/FlashCard';
import flashes from '../data/flashes.json';

const FlashViewer = lazy(() => import('../features/flashes/FlashViewer'));

export function Flashes() {
  const [selected, setSelected] = useState<number | null>(null);
  return <>
    <PageHeading title="Flashes" />
    <div className="flash-grid">
      {flashes.map((flash, index) => <FlashCard key={flash.id} flash={flash} priority={index < 3} onOpen={() => setSelected(index)} />)}
    </div>
    {selected !== null && <Suspense fallback={<p className="viewer-pending" role="status">Opening preview…</p>}>
      <FlashViewer flashes={flashes} initialIndex={selected} onClose={() => setSelected(null)} />
    </Suspense>}
  </>;
}
