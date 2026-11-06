'use strict';
// Native dialogs provide modal semantics and make the background inert.
document.addEventListener('DOMContentLoaded', () => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const nav = $('[data-nav]');
  const toggle = $('[data-nav-toggle]');
  const navLinks = $$('[data-nav-link]');
  const sections = $$('[data-section]');
  const closeNav = (restore = false) => {
    const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
    if (restore && wasOpen) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('is-open', open);
  });
  document.addEventListener('click', e => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
  });
  document.addEventListener('focusin', e => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
  });
  navLinks.forEach(link => link.addEventListener('click', () => {
    closeNav();
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }));
  matchMedia('(min-width:768px)').addEventListener('change', e => { if (e.matches) closeNav(); });
  $$('[data-current-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  const header = $('[data-header]');
  const progress = $('[data-scroll-progress]');
  const back = $('[data-back-to-top]');
  let scheduled = false;
  const updateScroll = () => {
    scheduled = false;
    header.classList.toggle('is-scrolled', scrollY > 18);
    back.classList.toggle('is-visible', scrollY > 600);
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / max))})`;
    let active = '';
    sections.forEach(section => { if (section.getBoundingClientRect().top <= innerHeight * .4) active = section.id; });
    navLinks.forEach(link => {
      if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  addEventListener('resize', updateScroll);
  updateScroll();
  back.addEventListener('click', () => {
    $('.brand').focus({ preventScroll: true });
    scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' });
  });
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('is-pending'); observer.unobserve(entry.target); }
    }), { threshold: .05 });
    $$('.reveal').forEach(el => { el.classList.add('is-pending'); observer.observe(el); });
  }

  const lightbox = $('#image-dialog');
  const dialogs = $$('dialog');
  const stack = [];
  const triggers = new WeakMap();
  const openDialog = (dialog, trigger) => {
    if (!dialog || dialog.open) return;
    closeNav();
    triggers.set(dialog, trigger || document.activeElement);
    dialog.showModal();
    stack.push(dialog);
    document.body.classList.add('modal-open');
    $('[data-close-dialog]', dialog).focus({ preventScroll: true });
  };
  $$('[data-open-dialog]').forEach(button => button.addEventListener('click', () => {
    openDialog(document.getElementById(button.dataset.openDialog), button);
  }));
  dialogs.forEach(dialog => {
    $('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      const index = stack.indexOf(dialog);
      if (index !== -1) stack.splice(index, 1);
      document.body.classList.toggle('modal-open', stack.length > 0);
      if (dialog === lightbox) $('[data-lightbox-image]').removeAttribute('src');
      triggers.get(dialog)?.focus({ preventScroll: true });
    });
    // Both press and release must occur on the backdrop; dragging out won't close it.
    let outsidePress = false;
    const outside = e => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    dialog.addEventListener('pointerdown', e => { outsidePress = e.target === dialog && outside(e); });
    dialog.addEventListener('click', e => {
      if (outsidePress && e.target === dialog && outside(e)) dialog.close();
      outsidePress = false;
    });
    dialog.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const controls = $$('button:not(:disabled),a[href],input,textarea,[tabindex="0"]', dialog).filter(el => el.getClientRects().length);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });
  document.addEventListener('keydown', e => {
    // Native Escape/cancel closes only the topmost dialog, including nested image previews.
    if (e.key === 'Escape' && !stack.length) closeNav(true);
  });
  $$('.gallery').forEach(gallery => {
    const slides = $$('figure', gallery);
    const prev = $('[data-gallery-prev]', gallery), next = $('[data-gallery-next]', gallery);
    let index = 0;
    const render = () => {
      slides.forEach((slide, i) => { slide.hidden = i !== index; });
      $('[data-gallery-status]', gallery).textContent = `${index + 1} / ${slides.length}`;
      prev.disabled = index === 0; next.disabled = index === slides.length - 1;
    };
    $('.gallery__controls', gallery).hidden = false;
    prev.addEventListener('click', () => { index = Math.max(0, index - 1); render(); if (prev.disabled) next.focus(); });
    next.addEventListener('click', () => { index = Math.min(slides.length - 1, index + 1); render(); if (next.disabled) prev.focus(); });
    render();
  });
  $$('[data-lightbox]').forEach(button => button.addEventListener('click', () => {
    const img = $('[data-lightbox-image]');
    img.src = button.dataset.lightbox;
    img.alt = $('img', button).alt;
    $('#image-title').textContent = img.alt;
    openDialog(lightbox, button);
  }));
  const copy = $('[data-copy-email]'), status = $('[data-copy-status]');
  let timer;
  copy.addEventListener('click', async () => {
    const email = $('#email-address').textContent.trim();
    let success = false;
    try { await navigator.clipboard.writeText(email); success = true; }
    catch {
      const field = document.createElement('textarea');
      field.value = email; field.readOnly = true;
      field.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
      $('#email-dialog').append(field);
      field.select();
      try { success = document.execCommand('copy'); } catch { success = false; }
      field.remove(); copy.focus();
    }
    status.textContent = success ? 'Email copied' : 'Copy unavailable. Select the email address above to copy it.';
    clearTimeout(timer);
    timer = setTimeout(() => { status.textContent = ''; }, success ? 2500 : 7000);
  });
});
