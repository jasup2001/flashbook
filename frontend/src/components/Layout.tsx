import { Link, Outlet } from 'react-router';
import { Navigation } from './Navigation';

export function Layout() {
  return <div className="site-shell">
    <a className="skip-link" href="#content">Przejdź do treści</a>
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label="JASUP2001 — strona główna">JASUP2001</Link>
      <Navigation />
    </header>
    <main id="content" tabIndex={-1}><Outlet /></main>
    <footer className="site-footer"><Link to="/">JASUP2001</Link><span>Independent tattoo projects</span><Link to="/waitlist">Waitlist ↗</Link></footer>
  </div>;
}
