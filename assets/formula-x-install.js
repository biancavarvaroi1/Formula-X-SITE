/* Phone installation: browser-owned confirmation, no page or account caching. */
(function () {
  'use strict';
  if (window.__fxInstallLoaded || window.top !== window.self) return;
  window.__fxInstallLoaded = true;

  var installPrompt = null;
  var busy = false;
  var entry;
  var dialog;
  var nativeButton;
  var status;
  var installed = false;
  var displayMode = window.matchMedia('(display-mode: standalone)');

  function isInstalled() {
    return installed || displayMode.matches || navigator.standalone === true;
  }

  function refresh() {
    if (entry) entry.hidden = isInstalled();
    if (nativeButton) {
      nativeButton.hidden = !installPrompt || isInstalled();
      nativeButton.disabled = busy;
    }
    if (isInstalled() && dialog && dialog.open) dialog.close();
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    installPrompt = event;
    refresh();
  });
  window.addEventListener('appinstalled', function () {
    installed = true;
    installPrompt = null;
    refresh();
  });
  if (displayMode.addEventListener) displayMode.addEventListener('change', refresh);
  window.addEventListener('pageshow', refresh);

  function showGuide() {
    if (isInstalled()) return;
    if (!dialog.open) dialog.showModal();
    refresh();
  }

  async function install() {
    if (busy || isInstalled()) return;
    if (!installPrompt) {
      showGuide();
      return;
    }
    var prompt = installPrompt;
    installPrompt = null; // A browser install event can only be used once.
    busy = true;
    refresh();
    try {
      await prompt.prompt();
      await prompt.userChoice;
      // Only appinstalled/display-mode confirms an installed app.
    } catch (error) {
      status.textContent = 'Instalarea directă nu este disponibilă acum. Poți folosi meniul browserului, urmând pașii de mai sus.';
      showGuide();
    } finally {
      busy = false;
      refresh();
    }
  }

  function mount() {
    if (isInstalled() || !document.body) return;
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /Android/i.test(ua);
    var embedded = /Instagram|FBAN|FBAV|; wv\)/i.test(ua);

    entry = document.createElement('div');
    entry.className = 'fx-install-entry';
    entry.innerHTML = '<button type="button" class="fx-install-open" aria-haspopup="dialog" aria-controls="fx-install-dialog"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4M12 6v7m-3-3 3 3 3-3"/></svg><span>Adaugă pe telefon</span></button><span class="fx-install-hint">Formula X, direct de pe ecranul tău.</span>';
    entry.querySelector('button').addEventListener('click', install);
    var hero = document.querySelector('.hero-left-content');
    if (hero) {
      var footer = hero.querySelector('.hero-footer-info');
      hero.insertBefore(entry, footer);
    } else {
      entry.classList.add('fx-install-footer');
      document.body.appendChild(entry);
    }

    dialog = document.createElement('dialog');
    dialog.id = 'fx-install-dialog';
    dialog.className = 'fx-install-dialog';
    dialog.setAttribute('aria-labelledby', 'fx-install-title');
    dialog.setAttribute('aria-describedby', 'fx-install-description');
    dialog.innerHTML = '<div class="fx-install-panel"><button type="button" class="fx-install-close" aria-label="Închide instrucțiunile" autofocus>×</button><img class="fx-install-logo" src="/assets/pwa/icon-192.png" alt="" width="64" height="64"><p class="fx-install-eyebrow">FORMULA X PE TELEFONUL TĂU</p><h2 id="fx-install-title">Pregătirea pentru BAC,<br>la o atingere distanță.</h2><p id="fx-install-description">Pune iconița Formula X pe ecranul principal și revino rapid la lecții, teste și contul tău.</p><p class="fx-install-browser-note" hidden></p><ol class="fx-install-steps"></ol><button type="button" class="fx-install-native" hidden>Instalează Formula X</button><p class="fx-install-status" role="status"></p><p class="fx-install-note">Adăugarea este gratuită. Ai nevoie de internet pentru a folosi platforma.</p></div>';

    var instructions = ios ? [
      'Deschide formula-x.ro în Safari.',
      'Apasă Partajare (pătratul cu săgeată în sus). În unele versiuni Safari, îl găsești în meniul „…”.',
      'Alege „Adăugați la ecranul principal”. Dacă lipsește, caută în „Editați acțiunile”.',
      'Dacă apare „Deschideți ca aplicație web”, activează opțiunea, apoi apasă „Adăugați”.'
    ] : android ? [
      'Deschide formula-x.ro în Chrome sau Samsung Internet.',
      'Deschide meniul browserului (⋮ sau ☰).',
      'Alege „Instalează aplicația” sau „Adaugă pe ecranul de pornire”, apoi confirmă.'
    ] : [
      'Pe telefon, deschide formula-x.ro în Safari (iPhone) sau Chrome (Android).',
      'Pe iPhone: Partajare → „Adăugați la ecranul principal”.',
      'Pe Android: meniul browserului → „Instalează aplicația” sau „Adaugă pe ecranul de pornire”.',
      'Pe calculator, poți folosi opțiunea de instalare din bara de adrese sau din meniul Chrome ori Edge, dacă este disponibilă.'
    ];
    var steps = dialog.querySelector('.fx-install-steps');
    instructions.forEach(function (instruction) {
      var item = document.createElement('li');
      item.textContent = instruction;
      steps.appendChild(item);
    });
    if (embedded) {
      var note = dialog.querySelector('.fx-install-browser-note');
      note.hidden = false;
      note.textContent = 'Ai deschis site-ul într-o altă aplicație. Folosește meniul ei pentru a-l deschide în Safari sau Chrome, apoi urmează pașii de mai jos.';
    }
    status = dialog.querySelector('.fx-install-status');
    nativeButton = dialog.querySelector('.fx-install-native');
    nativeButton.addEventListener('click', install);
    dialog.querySelector('.fx-install-close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    document.body.appendChild(dialog);
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
}());
