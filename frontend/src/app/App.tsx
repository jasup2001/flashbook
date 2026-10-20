import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { Layout } from '../components/Layout';
import { Home } from '../pages/Home';
import { Flashes } from '../pages/Flashes';
import { Waitlist } from '../pages/Waitlist';
import { Placeholder } from '../pages/Placeholder';

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    const name = pathname.slice(1).toLowerCase();
    document.title = name ? `${name} — jasup2001` : 'jasup2001';
    window.scrollTo(0, 0);
    if (pathname !== '/') document.getElementById('content')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

export function App() {
  return <>
    <RouteEffects />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Layout />}>
        <Route path="flashes" element={<Flashes />} />
        <Route path="tattoos" element={<Placeholder title="tattoos" />} />
        <Route path="waitlist" element={<Waitlist />} />
        <Route path="other" element={<Placeholder title="other" note="new shih soon" />} />
        <Route path="admin" element={<Placeholder title="admin" eyebrow="coming soon" description="the admin panel is coming in a later stage." note="managing media and submissions will require authentication. the panel is not available yet." />} />
        <Route path="*" element={<Placeholder title="404" eyebrow="not found" description="this page doesn't exist." note="head back home or explore the flashbook." />} />
      </Route>
    </Routes>
  </>;
}
