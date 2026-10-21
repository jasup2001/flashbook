import { lazy, Suspense, useState } from 'react';
import { PageHeading } from '../components/PageHeading';
import { FlashCard } from '../features/flashes/FlashCard';
import { numberDesigns } from '../features/flashes/numbering';
import { supabase } from '../lib/supabase';
import { publicFlashes } from '../features/admin/api';
import { useRemote } from '../features/admin/useRemote';
import { LoadState } from '../features/admin/controls';

const FlashViewer = lazy(() => import('../features/flashes/FlashViewer'));
const load = async () => supabase ? publicFlashes() : (await import('../data/flashes.json')).default;

export function Flashbook() {
  const [selected, setSelected] = useState<number | null>(null);
  const { data, error, reload } = useRemote(load, 300000);
  const flashes = numberDesigns(data ?? []);
  return <>
    <PageHeading title="flashbook" />
    {(error || !data) && <LoadState error={error} reload={reload} />}
    <div className="flash-grid">
      {flashes.map((flash, index) => <FlashCard key={flash.id} flash={flash} priority={index < 3} onOpen={() => setSelected(index)} />)}
    </div>
    {selected !== null && flashes.length > 0 && <Suspense fallback={<p className="viewer-pending" role="status">opening preview…</p>}>
      <FlashViewer flashes={flashes} initialIndex={selected} onClose={() => setSelected(null)} />
    </Suspense>}
  </>;
}
