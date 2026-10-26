import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { Layout } from '../components/Layout';
import { Home } from '../pages/Home';
import { Placeholder } from '../pages/Placeholder';
const Flashbook = lazy(() => import('../pages/Flashbook').then(module => ({ default: module.Flashbook })));
const Waitlist = lazy(() => import('../pages/Waitlist').then(module => ({ default: module.Waitlist })));
const Tattoos = lazy(() => import('../pages/Tattoos').then(module => ({ default: module.Tattoos })));
const Admin = lazy(() => import('../pages/Admin'));

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    const name = pathname.slice(1).replace(/\/+$/, '').toLowerCase();
    document.title = name || 'jasup2001.site';
    window.scrollTo(0, 0);
    if (pathname !== '/') document.getElementById('content')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

export function App() {
  return <>
    <RouteEffects />
    <Suspense fallback={<p className="viewer-pending" role="status">loading…</p>}><Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Layout />}>
        <Route path="flashbook" element={<Flashbook />} />
        <Route path="flashes" element={<Navigate to="/flashbook" replace />} />
        <Route path="tattoos" element={<Tattoos />} />
        <Route path="waitlist" element={<Waitlist />} />
        <Route path="other" element={<Placeholder title="other" note="new shi soon" hideHeading />} />
        <Route path="admin" element={<Suspense fallback={<p role="status">loading…</p>}><Admin /></Suspense>} />
        <Route path="*" element={<Placeholder title="404" eyebrow="not found" description="this page doesn't exist." note="head back home or explore the flashbook." />} />
      </Route>
    </Routes></Suspense>
  </>;
}
