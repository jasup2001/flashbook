import { useState } from 'react';
import { PageHeading } from '../components/PageHeading';

export function Waitlist() {
  const [checked, setChecked] = useState(false);
  return <>
    <PageHeading title="Waitlist" eyebrow="Twój następny tatuaż"><p>Od projektu do skóry.</p></PageHeading>
    <div className="waitlist-layout">
      <div className="waitlist-intro"><h2>Masz coś<br />na myśli?</h2><p>Wybierz flash lub opisz swój pomysł. To miejsce na pierwszy krok.</p><p className="form-preview-note" id="preview-note">Podgląd formularza.<br />Zapisy nie są jeszcze otwarte. Dane nie są wysyłane ani zapisywane.</p></div>
      <form className="waitlist-form" aria-describedby="preview-note" onSubmit={(event) => { event.preventDefault(); setChecked(true); }} onChange={() => setChecked(false)}>
        <label>Jak masz na imię?<input name="name" autoComplete="given-name" required maxLength={100} placeholder="Twoje imię" /></label>
        <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="twoj@email.com" /></label>
        <label>Twój pomysł<textarea name="idea" rows={4} required maxLength={3000} placeholder="Numer arkusza, wybrany motyw lub kilka słów o pomyśle…" /></label>
        <div className="form-row"><label>Miejsce na ciele <span className="optional">(opcjonalnie)</span><input name="placement" maxLength={100} placeholder="np. przedramię" /></label><label>Rozmiar <span className="optional">(opcjonalnie)</span><input name="size" maxLength={100} placeholder="np. 10 × 15 cm" /></label></div>
        <button className="submit-button" type="submit">Sprawdź formularz <span aria-hidden="true">↗</span></button>
        {checked && <p className="form-status" role="status">Formularz jest poprawny. To podgląd — dane nie zostały wysłane ani zapisane.</p>}
      </form>
    </div>
  </>;
}
