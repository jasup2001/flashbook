import { useState } from 'react';
import { PageHeading } from '../components/PageHeading';

export function Waitlist() {
  const [checked, setChecked] = useState(false);
  return <>
    <PageHeading title="Waitlist" eyebrow="Your next tattoo"><p>From paper to skin.</p></PageHeading>
    <div className="waitlist-layout">
      <div className="waitlist-intro"><h2>Something<br />in mind?</h2><p>Choose a flash or tell me about your idea. Start here.</p><p className="form-preview-note" id="preview-note">Form preview.<br />Bookings are not open yet. Nothing is sent or saved.</p></div>
      <form className="waitlist-form" aria-describedby="preview-note" onSubmit={(event) => { event.preventDefault(); setChecked(true); }} onChange={() => setChecked(false)}>
        <label>Your name<input name="name" autoComplete="given-name" required maxLength={100} placeholder="Your name" /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@email.com" /></label>
        <label>Your idea<textarea name="idea" rows={4} required maxLength={3000} placeholder="Sheet number, chosen design or a few words about your idea…" /></label>
        <div className="form-row"><label>Placement <span className="optional">(optional)</span><input name="placement" maxLength={100} placeholder="e.g. forearm" /></label><label>Size <span className="optional">(optional)</span><input name="size" maxLength={100} placeholder="e.g. 10 × 15 cm" /></label></div>
        <button className="submit-button" type="submit">Check form <span aria-hidden="true">↗</span></button>
        {checked && <p className="form-status" role="status">The form is valid. This is a preview — nothing has been sent or saved.</p>}
      </form>
    </div>
  </>;
}
