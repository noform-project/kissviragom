/* KissVirágom Vendéglő – mintaoldal. Külső könyvtár nélkül. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motion = root.classList.contains('motion');

  reduceQuery.addEventListener?.('change', (e) => {
    motion = !e.matches;
    root.classList.toggle('motion', motion);
    if (!motion) document.querySelectorAll('[data-reveal], .daisy, .panel').forEach((el) => el.classList.add('is-in'));
  });

  /* ---------- Megjelenés görgetésre (IntersectionObserver) ---------- */
  const revealEls = document.querySelectorAll('[data-reveal], .daisy');
  if (motion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.25 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Étlap fülek (ARIA tablist) ---------- */
  const tabsWrap = document.querySelector('[data-tabs]');
  if (tabsWrap) {
    const tablist = tabsWrap.querySelector('[role="tablist"]');
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    const sheet = tabsWrap.querySelector('.sheet');
    const desktop = window.matchMedia('(min-width: 768px)');
    let current = 0;
    let sheetSeen = false;
    let timers = [];

    tablist.hidden = false;
    panels.forEach((panel, i) => {
      panel.tabIndex = 0;
      panel.hidden = i !== current;
      panel.querySelectorAll('.dish').forEach((dish, n) => dish.style.setProperty('--i', n));
    });

    const showDishes = (panel) => {
      if (!motion) { panel.classList.add('is-in'); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-in')));
    };

    if (motion && 'IntersectionObserver' in window) {
      const sheetIo = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        sheetSeen = true;
        showDishes(panels[current]);
        sheetIo.disconnect();
      }, { threshold: 0.2 });
      sheetIo.observe(sheet);
    } else {
      sheetSeen = true;
      panels[current].classList.add('is-in');
    }

    const centerTab = (tab) => {
      const listRect = tablist.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      const delta = tabRect.left + tabRect.width / 2 - (listRect.left + listRect.width / 2);
      tablist.scrollBy({ left: delta, behavior: motion ? 'smooth' : 'auto' });
    };

    const swap = (index) => {
      panels[current].hidden = true;
      panels[current].classList.remove('is-in');
      panels[index].hidden = false;
      current = index;
    };

    const clearFlip = () => {
      timers.forEach(clearTimeout);
      timers = [];
      sheet.classList.remove('flip-out-next', 'flip-out-prev', 'flip-in-next', 'flip-in-prev', 'is-entering', 'no-transition');
    };

    const select = (index, { focus = false } = {}) => {
      if (index === current) return;
      const dir = index > current ? 'next' : 'prev';

      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      });
      if (focus) tabs[index].focus({ preventScroll: true });
      centerTab(tabs[index]);

      if (!motion) {
        swap(index);
        panels[index].classList.add('is-in');
        return;
      }

      clearFlip();
      sheetSeen = true;
      sheet.classList.add(`flip-out-${dir}`);
      timers.push(setTimeout(() => {
        swap(index);
        sheet.classList.add('no-transition');
        sheet.classList.remove(`flip-out-${dir}`);
        sheet.classList.add(`flip-in-${dir}`);
        void sheet.offsetWidth; // újrarajzolás kényszerítése a kiinduló állapothoz
        sheet.classList.remove('no-transition');
        sheet.classList.add('is-entering');
        sheet.classList.remove(`flip-in-${dir}`);
        showDishes(panels[index]);
        timers.push(setTimeout(clearFlip, 420));
      }, desktop.matches ? 260 : 220));
    };

    tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));

    tablist.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      let next = null;
      if (e.key === 'ArrowRight') next = current === last ? 0 : current + 1;
      else if (e.key === 'ArrowLeft') next = current === 0 ? last : current - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = last;
      if (next === null) return;
      e.preventDefault();
      select(next, { focus: true });
    });

    // Swipe a lapon: balra húzva a következő, jobbra az előző kategória
    let startX = 0;
    let startY = 0;
    sheet.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    sheet.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0 && current < tabs.length - 1) select(current + 1);
      if (dx > 0 && current > 0) select(current - 1);
    }, { passive: true });
  }

  /* ---------- Lightbox ---------- */
  const dialog = document.getElementById('lightbox');
  if (dialog && typeof dialog.showModal === 'function') {
    const img = dialog.querySelector('.lightbox__img');
    const closeBtn = dialog.querySelector('.lightbox__close');
    let opener = null;

    document.querySelectorAll('[data-lightbox]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        opener = link;
        img.src = link.getAttribute('href');
        img.alt = link.dataset.alt || '';
        img.width = Number(link.dataset.w) || 960;
        img.height = Number(link.dataset.h) || 600;
        dialog.showModal();
        closeBtn.focus();
      });
    });

    closeBtn.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

    // A fókusz maradjon a lightboxban (egyetlen fókuszálható elem: a bezárás gomb)
    dialog.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(dialog.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // a böngésző saját fókusz-visszaállítása után adjuk vissza a megnyitó elemnek
    dialog.addEventListener('close', () => { if (opener) setTimeout(() => opener.focus(), 0); });
  }

  /* ---------- Gombok: érintésre is kirajzolódik az aláhúzás ---------- */
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('touchstart', () => {
      btn.classList.add('is-touched');
      setTimeout(() => btn.classList.remove('is-touched'), 700);
    }, { passive: true });
  });

  /* ---------- Lehulló szirmok (görgetéshez kötve, max. 2) ---------- */
  const petals = Array.from(document.querySelectorAll('.petal'));
  if (petals.length) {
    const setup = [
      { speed: 0.3, offset: 0, sway: 14, phase: 0 },
      { speed: 0.24, offset: 0.55, sway: 18, phase: 2.1 }
    ];
    let ticking = false;

    const update = () => {
      ticking = false;
      if (!motion) return;
      const vh = window.innerHeight;
      const travel = vh + 80;
      const y0 = window.scrollY;
      const visible = y0 > 140;
      // keskeny kijelzőn a szirom csak a szélen lengjen, ne takarja a szöveget
      const swayScale = window.innerWidth < 768 ? 0.3 : 1;
      petals.forEach((petal, k) => {
        const s = setup[k];
        const y = ((y0 * s.speed + s.offset * travel) % travel) - 40;
        const x = Math.sin(y / 70 + s.phase) * s.sway * swayScale;
        const r = Math.sin(y / 95 + s.phase) * 55 + 15;
        petal.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(1)}deg)`;
        petal.style.opacity = visible ? '0.9' : '0';
      });
    };

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }
})();
