import { Link } from 'react-router';
import { PageHeading } from '../components/PageHeading';

export function Placeholder({ title, eyebrow, description, note }: { title: string; eyebrow?: string; description?: string; note?: string }) {
  return <>
    <PageHeading title={title} eyebrow={eyebrow} />
    <section className="empty-state">{description && <h2>{description}</h2>}{note && <p>{note}</p>}<Link className="underlined-link" to="/flashbook">view flashbook <span aria-hidden="true">↗</span></Link></section>
  </>;
}
