import { Link } from 'react-router';
import { PageHeading } from '../components/PageHeading';

export function Placeholder({ title, eyebrow, description, note, hideHeading = false }: { title: string; eyebrow?: string; description?: string; note?: string; hideHeading?: boolean }) {
  return <>
    {!hideHeading && <PageHeading title={title} eyebrow={eyebrow} />}
    <section className={`empty-state${hideHeading ? ' empty-state--no-heading' : ''}`} aria-label={hideHeading ? title : undefined}>{description && <h2>{description}</h2>}{note && <p>{note}</p>}<Link className="underlined-link" to="/flashbook">view flashbook <span aria-hidden="true">↗</span></Link></section>
  </>;
}
