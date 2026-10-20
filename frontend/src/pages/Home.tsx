import { Navigation } from '../components/Navigation';

export function Home() {
  return <main className="home" aria-label="jasup2001 — tattoo portfolio">
    <div className="home__composition">
      <img className="home__logo" src="/media/logo2.png" alt="jasup2001" width="1000" height="750" fetchPriority="high" />
      <Navigation home />
    </div>
  </main>;
}
