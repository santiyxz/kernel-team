'use strict';

(function () {
  const nav = document.querySelector('.nav-shell');
  const menuBtn = document.querySelector('.menu-btn');
  const links = document.getElementById('nav-links');
  const year = document.getElementById('year');
  const progressBar = document.querySelector('[data-progress]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (year) year.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------- nav state */

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
      if (progressBar) {
        const room = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0;
        progressBar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
      }
      updateSpy();
    });
  }

  /* --------------------------------------------------------------- menu */

  function setMenu(open) {
    if (!menuBtn || !links) return;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    links.classList.toggle('is-open', open);
  }

  if (menuBtn && links) {
    menuBtn.addEventListener('click', () => {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    links.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuBtn.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
      if (event.target.closest('#nav-links, .menu-btn')) return;
      setMenu(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 820) setMenu(false);
    });
  }

  /* ------------------------------------------------------------- scrollspy */

  const spy = Array.from(document.querySelectorAll('[data-nav]'))
    .map((link) => {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#') || href.length < 2) return null;
      const section = document.getElementById(href.slice(1));
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  const sections = Array.from(document.querySelectorAll('main section[id]'));
  let activeSpy = null;
  function updateSpy() {
    if (!spy.length) return;
    let activeId = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 150) activeId = section.id;
    }
    // Sections without an anchor link (the Work teaser points to work.html) clear the
    // highlight rather than leaving the previous section marked as the reader's location.
    const current = activeId ? spy.find((row) => row.section.id === activeId) || null : null;
    if (current === activeSpy) return;
    activeSpy = current;
    spy.forEach((row) => {
      if (row === current) row.link.setAttribute('aria-current', 'location');
      else row.link.removeAttribute('aria-current');
    });
  }

  /* --------------------------------------------------------------- reveal */

  const targets = Array.from(document.querySelectorAll('[data-reveal]'));
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    Array.from(group.querySelectorAll('[data-reveal]')).slice(0, 8).forEach((node, index) => {
      node.style.transitionDelay = reduceMotion ? '0ms' : Math.min(index * 70, 420) + 'ms';
    });
  });

  if (targets.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      targets.forEach((node) => node.classList.add('is-in'));
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
      targets.forEach((node) => observer.observe(node));
    }
  }

  /* ------------------------------------------------------------- counters */

  function countUp(node) {
    const target = Number(node.getAttribute('data-count')) || 0;
    if (reduceMotion || target === 0) {
      node.textContent = String(target);
      return;
    }
    const duration = 1000;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(frame);
      else node.textContent = String(target);
    }
    requestAnimationFrame(frame);
  }

  const counters = Array.from(document.querySelectorAll('[data-count]'));
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(countUp);
    } else {
      const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          counterObserver.unobserve(entry.target);
        });
      }, { threshold: 0.6 });
      counters.forEach((node) => counterObserver.observe(node));
    }
  }

  /* ------------------------------------------------------------ spotlight */

  if (window.matchMedia('(hover: hover)').matches && !reduceMotion) {
    document.querySelectorAll('.spotlight').forEach((card) => {
      card.addEventListener('mousemove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (event.clientY - rect.top) + 'px');
      });
    });
  }

  /* ----------------------------------------------------------------- init */

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
