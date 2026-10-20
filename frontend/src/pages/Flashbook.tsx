import { lazy, Suspense, useState } from 'react';
import { PageHeading } from '../components/PageHeading';
import { FlashCard } from '../features/flashes/FlashCard';
import localDesigns from '../data/flashes.json';
import { numberDesigns } from '../features/flashes/numbering';

const FlashViewer = lazy(() => import('../features/flashes/FlashViewer'));
const flashes = numberDesigns(localDesigns);

export function Flashbook() {
  const [selected, setSelected] = useState<number | null>(null);
  return <>
    <PageHeading title="flashbook" />
    <div className="flash-grid">
      {flashes.map((flash, index) => <FlashCard key={flash.id} flash={flash} priority={index < 3} onOpen={() => setSelected(index)} />)}
    </div>
    {selected !== null && <Suspense fallback={<p className="viewer-pending" role="status">opening preview…</p>}>
      <FlashViewer flashes={flashes} initialIndex={selected} onClose={() => setSelected(null)} />
    </Suspense>}
  </>;
}
