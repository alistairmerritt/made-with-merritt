// The Made with Merritt contact form, over Second Chair's own pages instead of sending people to the home page.
// It's the same form as the home page's (index.html and script.js at the site root), posting to the same address.
// Links to /?contact=1 open it; without this script they still go to the home page, which opens it there.
(() => {
  const ENDPOINT = 'https://formspree.io/f/xojraoga';
  const links = document.querySelectorAll('a[href="/?contact=1"]');
  if (!links.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'mwm-contact';
  overlay.innerHTML = `
    <div class="mwm-contact-modal" role="dialog" aria-modal="true" aria-labelledby="mwm-contact-h">
      <button type="button" class="mwm-contact-close" aria-label="Close">✕</button>
      <p class="mwm-contact-h" id="mwm-contact-h">Let’s chat</p>
      <p class="mwm-contact-desc">Whether it’s a project, a question, or an idea still taking shape, I’d love to hear from you.</p>
      <form class="mwm-contact-form">
        <input type="text" name="name" placeholder="Name" aria-label="Name" autocomplete="name" required>
        <input type="email" name="email" placeholder="Email" aria-label="Email" autocomplete="email" required>
        <textarea name="message" placeholder="Message" aria-label="Message" rows="4" required></textarea>
        <button type="submit" class="mwm-contact-send">Send message</button>
        <p class="mwm-contact-error" role="alert" hidden>That didn’t send. Please try again.</p>
      </form>
      <p class="mwm-contact-done" hidden>Thanks for getting in touch!<br>I’ll get back to you soon.</p>
    </div>`;
  document.body.append(overlay);

  const form = overlay.querySelector('form');
  const error = overlay.querySelector('.mwm-contact-error');
  let opener = null;

  const open = (from) => {
    opener = from;
    overlay.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => overlay.querySelector('input')?.focus({ preventScroll: true }), 50);
  };
  const close = () => {
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    document.documentElement.style.overflow = '';
    opener?.focus({ preventScroll: true });
  };

  links.forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;   // a new tab still gets the home page
    e.preventDefault();
    open(a);
  }));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.mwm-contact-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    const send = form.querySelector('.mwm-contact-send');
    send.disabled = true;
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      overlay.querySelectorAll('.mwm-contact-h, .mwm-contact-desc').forEach((el) => { el.hidden = true; });
      form.hidden = true;
      overlay.querySelector('.mwm-contact-done').hidden = false;
    } catch {
      error.hidden = false;
    } finally {
      send.disabled = false;
    }
  });
})();
