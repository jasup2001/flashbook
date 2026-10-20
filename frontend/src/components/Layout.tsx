import { Link, Outlet } from 'react-router';
import { Navigation } from './Navigation';

export function Layout() {
  return <div className="site-shell">
    <a className="skip-link" href="#content">skip to content</a>
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label="jasup2001 — home"><img src="/media/favicon.png" width="28" height="28" alt="" /><span>jasup2001</span></Link>
      <Navigation />
    </header>
    <main id="content" tabIndex={-1}><Outlet /></main>
    <footer className="site-footer"><Link to="/">jasup2001</Link><Link to="/waitlist">waitlist ↗</Link></footer>
  </div>;
}
