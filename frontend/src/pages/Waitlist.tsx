import { useState } from 'react';
import { PageHeading } from '../components/PageHeading';

export function Waitlist() {
  const [checked, setChecked] = useState(false);
  return <>
    <PageHeading title="waitlist" />
    <div className="waitlist-layout">
      <form className="waitlist-form" onSubmit={(event) => { event.preventDefault(); setChecked(true); }} onChange={() => setChecked(false)}>
        <label>your instagram nickname<input name="instagram" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={100} placeholder="@your_nickname" /></label>
        <label>email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@email.com" /></label>
        <label>your idea<textarea name="idea" rows={4} required maxLength={3000} placeholder="design number, chosen design or a few words about your idea…" /></label>
        <div className="form-row"><label>placement <span className="optional">(optional)</span><input name="placement" maxLength={100} placeholder="e.g. forearm" /></label><label>size <span className="optional">(optional)</span><input name="size" maxLength={100} placeholder="e.g. 10 × 15 cm" /></label></div>
        <button className="submit-button" type="submit">check form <span aria-hidden="true">↗</span></button>
        {checked && <p className="form-status" role="status">the form is valid. this is a preview — nothing has been sent or saved.</p>}
      </form>
    </div>
  </>;
}
