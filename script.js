// Configuration
const GITHUB_USERNAME = "CodeLeoX16"; // <- your GitHub username
const GITHUB_TOKEN = ""; // optional: "ghp_..." (keep secret, do NOT commit to public repo)

// Safe headers (token optional)
const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};

// DOM helpers
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));
const create = (tag, props = {}) => Object.assign(document.createElement(tag), props);

// Theme toggle
(function themeInit(){
  const rootClass = document.documentElement.classList;
  const saved = localStorage.getItem('theme');
  if (saved === 'light') rootClass.add('light');
  updateThemeIcon();
  qs('#theme-toggle').addEventListener('click', () => {
    rootClass.toggle('light');
    localStorage.setItem('theme', rootClass.contains('light') ? 'light' : 'dark');
    updateThemeIcon();
  });
  function updateThemeIcon(){
    const icon = qs('#theme-icon');
    if (!icon) return;
    icon.className = document.documentElement.classList.contains('light') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
})();

// Mobile menu
(function menuBehaviour(){
  const sidemenu = qs('#sidemenu');
  const toggle = qs('#menu-toggle');
  const closeBtn = qs('.menu-close');
  const overlay = qs('#nav-overlay');

  function openMenu(){
    sidemenu.classList.add('show');
    sidemenu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    if (overlay){
      overlay.classList.add('show');
      overlay.hidden = false;
    }
  }
  function closeMenu(){
    sidemenu.classList.remove('show');
    sidemenu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    if (overlay){
      overlay.classList.remove('show');
      overlay.hidden = true;
    }
  }

  toggle.addEventListener('click', openMenu);
  closeBtn && closeBtn.addEventListener('click', closeMenu);
  // close when clicking a link
  sidemenu.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && sidemenu.contains(link)) closeMenu();
  });
  // close with Escape
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // close when clicking on dimmed overlay
  if (overlay){
    overlay.addEventListener('click', closeMenu);
  }
})();

// Tabs
(function tabsInit(){
  const tabButtons = qsa('.tab-links');
  const panels = qsa('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = btn.dataset.target;
      tabButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      panels.forEach(p => { p.classList.remove('active'); p.hidden = true; });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');
      const panel = document.getElementById(targetId);
      if (panel) { panel.classList.add('active'); panel.hidden = false; }
    });
  });
})();

// Smooth scroll for in-page links
(function smoothScroll(){
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id === '#' || id === '#0') return;
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
})();

// Highlight active nav link on scroll
(function highlightNavOnScroll(){
  const links = qsa('#sidemenu a[href^="#"]');
  if (!links.length) return;

  const pairs = links
    .map(link => {
      const id = link.getAttribute('href');
      const section = id && id !== '#' ? qs(id) : null;
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (!pairs.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const match = pairs.find(p => p.section === entry.target);
      if (!match) return;
      links.forEach(l => l.classList.remove('active'));
      match.link.classList.add('active');
    });
  }, {
    threshold: 0.45,
    rootMargin: '-10% 0px -45% 0px'
  });

  pairs.forEach(p => observer.observe(p.section));
})();

// Contact form handling (Google Apps Script)
(function contactForm(){
  const form = document.forms['submit-to-google-sheet'];
  if (!form) return;
  const scriptURL = 'https://script.google.com/macros/s/AKfycbzaFfRR5HVZtJXKo36g9ktCJOwYU9FbZGtYSS5Nqzc-cOK1G6jEx28Bd-DVMoYLHE5q/exec';
  const msg = qs('#msg');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // honeypot
    if (form.company && form.company.value) {
      msg.textContent = "Spam blocked.";
      return;
    }
    const data = new FormData(form);
    fetch(scriptURL, { method: 'POST', body: data })
      .then(() => {
        msg.textContent = "Message sent — thank you!";
        form.reset();
        setTimeout(()=> msg.textContent = "", 5000);
      })
      .catch(() => {
        msg.textContent = "Failed to send message. Try again later.";
        setTimeout(()=> msg.textContent = "", 5000);
      });
  });
})();

// GitHub integration: fetch profile and repositories
(async function loadGitHubData(){
  if (!GITHUB_USERNAME) return;
  try {
    const userRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, { headers });
    if (!userRes.ok) throw new Error('Profile fetch failed');
    const user = await userRes.json();

    // Keep your custom hero text; don't override it with GitHub bio

    // Fetch repos (max 100)
    const reposRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`, { headers });
    if (!reposRes.ok) throw new Error('Repos fetch failed');
    const repos = await reposRes.json();

    // Filter forks out, sort by stars then recent, and pick top 8
    const top = repos.filter(r => !r.fork)
      .sort((a,b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.updated_at) - new Date(a.updated_at)))
      .slice(0, 8);

    // Render repo cards into #repos and also a combined list in #work-list (after static work) if desired
    const repoContainer = qs('#repos');
    const workList = qs('#work-list');

    top.forEach(r => {
      const article = create('article', { className: 'repo' });

      const title = create('h3'); 
      const a = create('a', { href: r.html_url, target: '_blank', rel: 'noopener noreferrer', textContent: r.name });
      title.appendChild(a);

      const desc = create('p', { textContent: r.description || '' });
      const meta = create('div', { className: 'meta', innerHTML: `<span>★ ${r.stargazers_count}</span><span>${r.language || ''}</span>` });

      article.appendChild(title);
      if (r.description) article.appendChild(desc);
      article.appendChild(meta);
      repoContainer.appendChild(article);

      // also add a visual card to portfolio (keeps static projects + dynamic ones)
      const card = create('article', { className: 'work' });
      const img = create('img', { src: r.homepage ? r.homepage + '/screenshot.png' : 'work-placeholder.png', alt: `${r.name} screenshot`, loading:'lazy' });
      const layer = create('div', { className: 'layer' });
      const h3 = create('h3', { textContent: r.name });
      const p = create('p', { textContent: r.description || '' });
      const link = create('a', { href: r.html_url, target: '_blank', rel:'noopener noreferrer', innerHTML: '<i class="fa-solid fa-up-right-from-square"></i>' });

      layer.appendChild(h3);
      if (p.textContent) layer.appendChild(p);
      layer.appendChild(link);
      card.appendChild(img);
      card.appendChild(layer);
      workList.appendChild(card);
    });

  } catch (err) {
    console.warn('GitHub integration error:', err);
    const repoContainer = qs('#repos');
    if (repoContainer) repoContainer.textContent = "Could not load GitHub repositories.";
  }
})();