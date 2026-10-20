import { NavLink } from 'react-router';

const links = ['flashbook', 'tattoos', 'waitlist', 'other'];

export function Navigation({ home = false }: { home?: boolean }) {
  return <nav className={home ? 'navigation navigation--home' : 'navigation'} aria-label="main navigation">
    {links.map((name) => <NavLink key={name} to={`/${name}`}>{name}</NavLink>)}
  </nav>;
}
