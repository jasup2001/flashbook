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
    const name = pathname.slice(1);
    document.title = name ? `${name.charAt(0).toUpperCase()}${name.slice(1)} — JASUP2001` : 'JASUP2001';
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
        <Route path="tattoos" element={<Placeholder title="Tattoos" eyebrow="On skin" description="Tattoos, details and process." note="Photos and videos coming soon." />} />
        <Route path="waitlist" element={<Waitlist />} />
        <Route path="other" element={<Placeholder title="Other" eyebrow="Beyond tattooing" description="Space for other things." note="New projects will appear here in their own time." />} />
        <Route path="admin" element={<Placeholder title="Admin" eyebrow="Coming soon" description="The admin panel is coming in a later stage." note="Managing media and submissions will require authentication. The panel is not available yet." />} />
        <Route path="*" element={<Placeholder title="404" eyebrow="Not found" description="This page doesn't exist." note="Head back home or explore the flashbook." />} />
      </Route>
    </Routes>
  </>;
}
