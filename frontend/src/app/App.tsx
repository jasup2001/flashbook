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
        <Route path="tattoos" element={<Placeholder title="Tattoos" eyebrow="Na skórze" description="Miejsce na tatuaże, detale i proces." note="Zdjęcia i filmy pojawią się tutaj w kolejnej odsłonie." />} />
        <Route path="waitlist" element={<Waitlist />} />
        <Route path="other" element={<Placeholder title="Other" eyebrow="Poza tatuażem" description="Przestrzeń na inne rzeczy." note="Nowe projekty pojawią się tutaj w swoim czasie." />} />
        <Route path="admin" element={<Placeholder title="Admin" eyebrow="W przygotowaniu" description="Panel pojawi się w kolejnym etapie." note="Zarządzanie mediami i zgłoszeniami wymaga uwierzytelniania. Na tym etapie panel jest niedostępny." />} />
        <Route path="*" element={<Placeholder title="404" eyebrow="Nie znaleziono" description="Ta strona nie istnieje." note="Wróć do strony głównej lub zajrzyj do flashbooka." />} />
      </Route>
    </Routes>
  </>;
}
