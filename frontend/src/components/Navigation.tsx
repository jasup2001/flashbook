import { NavLink } from 'react-router';

const links = ['Flashes', 'Tattoos', 'Waitlist', 'Other'];

export function Navigation({ home = false }: { home?: boolean }) {
  return <nav className={home ? 'navigation navigation--home' : 'navigation'} aria-label="Nawigacja główna">
    {links.map((name) => <NavLink key={name} to={`/${name.toLowerCase()}`}>{name}</NavLink>)}
  </nav>;
}
