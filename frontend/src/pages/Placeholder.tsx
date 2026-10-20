import { Link } from 'react-router';
import { PageHeading } from '../components/PageHeading';

export function Placeholder({ title, eyebrow, description, note }: { title: string; eyebrow: string; description: string; note: string }) {
  return <>
    <PageHeading title={title} eyebrow={eyebrow} />
    <section className="empty-state"><span className="empty-state__mark" aria-hidden="true">↗</span><h2>{description}</h2><p>{note}</p><Link className="underlined-link" to="/flashes">View flashes <span aria-hidden="true">↗</span></Link></section>
  </>;
}
