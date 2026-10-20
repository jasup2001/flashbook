import { Navigation } from '../components/Navigation';

export function Home() {
  return <main className="home" aria-label="JASUP2001 — portfolio tatuażu">
    <div className="home__composition">
      <img className="home__logo" src="/media/logo2.png" alt="JASUP2001" width="1000" height="750" fetchPriority="high" />
      <Navigation home />
    </div>
  </main>;
}
