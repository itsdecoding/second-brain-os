/* Second Brain OS — interface
   Vanilla JS. No framework, no build step, no network. */
(function () {
  'use strict';

  var RM = window.RM, S = RM.store, sel = RM.sel, esc = RM.esc;
  var app = document.getElementById('app');
  var overlayRoot = document.getElementById('overlay-root');
  var toastRoot = document.getElementById('toast-root');

  var route = { view: 'dashboard', id: null, tab: 'today' };
  var focusAfter = null;
  var searchVal = '';
  var rv = { step: 0, answers: {} };
  var paletteSel = 0;
  var storageBlocked = false;
  var lastViewKey = null;
  var navDir = 1;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var themeMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function applyTheme(theme) {
    var d = S.get ? S.get() : null;
    var cur = theme || (d && d.settings && d.settings.theme) || 'system';
    if (['system', 'light', 'dark'].indexOf(cur) === -1) cur = 'system';

    document.documentElement.setAttribute('data-theme', cur);

    var isDark = cur === 'dark' || (cur === 'system' && !!themeMedia && themeMedia.matches);
    // Every dark override in the stylesheet keys off this class, so a buyer who
    // forces Dark on a light OS still gets the dark pass, and vice versa.
    document.documentElement.classList.toggle('theme-dark', isDark);

    // The accent has to be re-tuned when the surface under it changes.
    var accent = d && d.settings && d.settings.accent;
    if (accent) applyAccent(accent);

    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#141413' : '#fbfbfa');
    }
  }

  if (themeMedia) {
    var onThemeMediaChange = function () {
      var d = S.get ? S.get() : null;
      var cur = (d && d.settings && d.settings.theme) || 'system';
      if (cur === 'system') {
        applyTheme('system');
      }
    };
    if (themeMedia.addEventListener) {
      themeMedia.addEventListener('change', onThemeMediaChange);
    } else if (themeMedia.addListener) {
      themeMedia.addListener(onThemeMediaChange);
    }
  }

  /* ------------------------------------------------------------ icons */

  var P = {
    brain: '<path d="M9.5 2A4.5 4.5 0 0 0 5 6.5a4.4 4.4 0 0 0 .5 2 4.5 4.5 0 0 0-1.5 3.5 4.4 4.4 0 0 0 1 2.8A4.5 4.5 0 0 0 7 19.5h2.5V2z"/><path d="M14.5 2A4.5 4.5 0 0 1 19 6.5a4.4 4.4 0 0 1-.5 2 4.5 4.5 0 0 1 1.5 3.5 4.4 4.4 0 0 1-1 2.8A4.5 4.5 0 0 1 17 19.5h-2.5V2z"/><path d="M12 4v16"/>',
    home: '<path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 4h13l3.5 8v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    checkSquare: '<path d="M9 11.5l2.5 2.5L20 5.5"/><path d="M20 12.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7L11 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/><path d="M8 7h8M8 11h8"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3v5h-5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7.9V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-.9l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 .9-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.6V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7.9l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 .9 2.7H21a2 2 0 1 1 0 4h-.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.4-4.4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 21h16"/>',
    upload: '<path d="M12 21V9M7 13l5-5 5 5"/><path d="M4 3h16"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    cmd: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'
  };

  function ico(name, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + (P[name] || '') + '</svg>';
  }

  /* ------------------------------------------------------------ nav model */

  var NAV = [
    { v: 'dashboard', label: 'Today', icon: 'home' },
        { v: 'inbox', label: 'Inbox', icon: 'inbox', count: function (d) { return d.inbox.length; } },
    { v: 'tasks', label: 'Tasks', icon: 'checkSquare', count: function (d) { return sel.openTasks().length; } },
    { v: 'projects', label: 'Projects', icon: 'folder', count: function (d) { return d.projects.filter(function (p) { return p.status !== 'done'; }).length; } },
    { v: 'notes', label: 'Notes', icon: 'file' },
    { v: 'journal', label: 'Journal', icon: 'book' },
    { v: 'review', label: 'Weekly review', icon: 'refresh' }
  ];

  var TITLES = {
    dashboard: ['Today', 'One screen. Everything that matters right now.'],
    inbox: ['Inbox', 'Capture first. Decide later.'],
    tasks: ['Tasks', 'Grouped by when it matters.'],
    projects: ['Projects', 'Outcomes with a finish line.'],
    project: ['Project', ''],
    notes: ['Notes', 'Thinking that outlives the moment.'],
    note: ['Note', ''],
    journal: ['Journal', 'A short daily record.'],
    review: ['Weekly review', 'Five questions, once a week.'],
    settings: ['Settings', 'Your data, your call.']
  };

  /* ------------------------------------------------------------ render */

  function render() {
    var d = S.get();
    applyTheme(d.settings.theme);
    document.documentElement.dataset.density = d.settings.density || 'comfortable';

    var scrim = sidebarOpen() ? '<div class="sidebar-scrim" data-act="close-sidebar"></div>' : '';

    // Entrance animation only when the destination actually changes.
    // Patch re-renders (search typing, toggles) must stay perfectly still.
    var key = route.view + '|' + (route.id || '') + '|' + (route.view === 'tasks' ? route.tab : '');
    var isNewView = key !== lastViewKey;
    lastViewKey = key;

    app.innerHTML =
      sidebar(d) +
      scrim +
      '<div class="main">' + topbar(d) +
      (storageBlocked ? storageBanner() : '') +
      '<main class="content' + (isNewView && !reduceMotion ? ' enter ' + (navDir < 0 ? 'back' : 'forward') : '') +
      '" id="main" tabindex="-1">' + view(d) + '</main></div>' +
      bottomNav(d);

    if (isNewView) countUp();

    if (window.Brain3D) window.Brain3D.detach();

    if (focusAfter) {
      var el = document.querySelector(focusAfter);
      if (el) {
        el.focus();
        if (el.setSelectionRange && el.value != null) {
          try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { }
        }
      }
      focusAfter = null;
    }
  }

  // Derive a soft tint from any accent the user picks, so custom accents
  // never fall back to a mismatched green wash.
  function accentRGB(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return null;
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  // t = 0 keeps the colour, t = 1 is white
  function towardWhite(c, t) { return Math.round(c + (255 - c) * t); }

  function isDarkTheme() {
    return document.documentElement.classList.contains('theme-dark');
  }

  function softOf(hex) {
    var c = accentRGB(hex);
    if (!c) return isDarkTheme() ? 'rgba(62, 132, 112, .22)' : '#e9f1ed';
    // On a dark surface a 90%-white wash becomes a glaring pale chip, so the
    // dark pass uses a translucent tint of the accent instead.
    if (isDarkTheme()) return 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', .22)';
    return 'rgb(' + towardWhite(c[0], .9) + ',' + towardWhite(c[1], .9) + ',' + towardWhite(c[2], .9) + ')';
  }

  // The same green that reads well on paper is 2.5:1 on near-black. Lift it in
  // the dark pass and flip the ink on filled buttons to dark so labels still pass.
  function accentFor(hex) {
    var c = accentRGB(hex);
    if (!c || !isDarkTheme()) return hex;
    return 'rgb(' + towardWhite(c[0], .3) + ', ' + towardWhite(c[1], .3) + ', ' + towardWhite(c[2], .3) + ')';
  }

  function applyAccent(hex) {
    // A malformed stored accent must never blank the UI: fall back to the brand green.
    var safe = accentRGB(hex) ? hex : '#2f5d50';
    var root = document.documentElement;
    root.style.setProperty('--accent', accentFor(safe));
    root.style.setProperty('--accent-soft', softOf(safe));
    root.style.setProperty('--accent-ink', isDarkTheme() ? '#0b1210' : '#ffffff');
  }

  function countUp() {
    if (reduceMotion) return;
    var els = document.querySelectorAll('[data-count]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        var target = Number(el.getAttribute('data-count')) || 0;
        if (!target) { el.textContent = '0'; return; }
        var t0 = 0;
        var dur = 620;
        var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
        el.textContent = '0';
        requestAnimationFrame(function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          el.textContent = String(Math.round(ease(p) * target));
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = String(target);
        });
      })(els[i]);
    }
  }

  function storageBanner() {
    return '<div class="warn-banner" role="alert">' +
      ico('spark') +
      '<div><b>This browser is not saving anything.</b> Private windows and some file:// setups block storage. ' +
      'Open the hosted version, or hit <button class="link-btn" data-act="go" data-view="settings">Settings → Export</button> before you close.</div>' +
      '</div>';
  }

  function sidebarOpen() {
    return app.dataset.sidebar === 'open';
  }

  function currentView() {
    return route.view === 'project' ? 'projects'
      : route.view === 'note' ? 'notes'
        : route.view;
  }

  function sidebar(d) {
    var cur = currentView();
    var items = NAV.map(function (n) {
      var c = n.count ? n.count(d) : 0;
      return '<button class="nav-item" data-act="go" data-view="' + n.v + '"' +
        (cur === n.v ? ' aria-current="page"' : '') + '>' +
        ico(n.icon) + '<span>' + n.label + '</span>' +
        (c ? '<span class="count">' + c + '</span>' : '') + '</button>';
    }).join('');

    var reviewBadge = sel.reviewDue() ? '<span class="pill pill-accent">due</span>' : '';

    return '<aside class="sidebar" id="sidebar" aria-label="Main navigation">' +
      '<div class="brand">' +
      '<div class="brand-mark">SB</div>' +
      '<div class="brand-text"><span class="brand-name">Second Brain OS</span><span class="brand-sub">Rewrite Minds</span></div>' +
      '</div>' +
      '<nav class="nav-group">' + items + '</nav>' +
      '<div class="nav-group">' +
      '<div class="nav-label">System</div>' +
      '<button class="nav-item" data-act="go" data-view="review"' + (cur === 'review' ? ' aria-current="page"' : '') + '>' +
      ico('refresh') + '<span>Review queue</span>' + reviewBadge + '</button>' +
      '<button class="nav-item" data-act="go" data-view="settings"' + (cur === 'settings' ? ' aria-current="page"' : '') + '>' +
      ico('settings') + '<span>Settings</span></button>' +
      '</div>' +
      '<div class="sidebar-foot">' +
      '<div class="storage-note">Saved <b>locally on this device</b>.<br>' +
      'Streak <b>' + (d.streak.current || 0) + ' days</b>' +
      (d.lastReview ? ' · reviewed ' + esc(RM.fmtWhen(d.lastReview)) : ' · never reviewed') +
      '</div>' +
      '<button class="nav-item" data-act="palette">' + ico('cmd') + '<span>Command</span><span class="count">⌘K</span></button>' +
      '</div>' +
      '</aside>';
  }

  function topbar(d) {
    var t = TITLES[route.view] || ['', ''];
    var title = route.view === 'project' || route.view === 'note' ? t[0] : t[0];
    var sub = route.view === 'project' || route.view === 'note' ? '' : t[1];

    return '<header class="topbar">' +
      '<button class="menu-btn" data-act="open-sidebar" aria-label="Open navigation">' + ico('menu') + '</button>' +
      '<div class="topbar-title">' + esc(title) +
      (sub ? '<span class="topbar-sub">' + esc(sub) + '</span>' : '') + '</div>' +
      '<div class="topbar-spacer"></div>' +
      '<div class="searchbar">' + ico('search') +
      '<input id="global-search" type="search" placeholder="Search everything" value="' + esc(searchVal) + '" ' +
      'aria-label="Search" autocomplete="off">' +
      '<span class="kbd">/</span></div>' +
      '</header>';
  }

  function bottomNav(d) {
    var cur = currentView();
    var items = [
      { v: 'dashboard', label: 'Today', icon: 'home' },
      { v: 'tasks', label: 'Tasks', icon: 'checkSquare' },
      { v: 'notes', label: 'Notes', icon: 'file' },
      { v: 'inbox', label: 'Inbox', icon: 'inbox' },
      { v: '_more', label: 'More', icon: 'menu' }
    ];
    return '<nav class="bottom-nav" aria-label="Quick navigation">' + items.map(function (n) {
      return '<button data-act="' + (n.v === '_more' ? 'open-sidebar' : 'go') + '"' +
        (n.v !== '_more' ? ' data-view="' + n.v + '"' : '') +
        (cur === n.v ? ' aria-current="page"' : '') + '>' +
        ico(n.icon) + '<span>' + n.label + '</span></button>';
    }).join('') + '</nav>';
  }

  /* ------------------------------------------------------------ router */

  function view(d) {
    switch (route.view) {
      case 'dashboard': return viewDashboard(d);
        case 'inbox': return viewInbox(d);
      case 'tasks': return viewTasks(d);
      case 'projects': return viewProjects(d);
      case 'project': return viewProject(d);
      case 'notes': return viewNotes(d);
      case 'note': return viewNote(d);
      case 'journal': return viewJournal(d);
      case 'review': return viewReview(d);
      case 'settings': return viewSettings(d);
      default: return viewDashboard(d);
    }
  }

  function go(v, id, tab) {
    var prevView = route.view;
    // Detail → list reads as "going back", everything else reads as forward.
    navDir = ((prevView === 'project' && v === 'projects') ||
      (prevView === 'note' && v === 'notes')) ? -1 : 1;
    route.view = v;
    route.id = id || null;
    if (v === 'tasks') {
      route.tab = tab || (prevView === 'tasks' ? route.tab : 'today') || 'today';
    }
    if (v === 'review' && rv.step >= RV_STEPS.length) { rv.step = 0; rv.answers = {}; }
    app.dataset.sidebar = 'closed';
    // Keep the hash in sync on every protocol, not just http(s). On file://
    // the palette already wrote hashes, so a reload could deep-link into a
    // stale view when normal navigation refused to update it.
    try { history.replaceState(null, '', '#' + v + (id ? '/' + id : '')); }
    catch (e) {
      // Some file:// contexts refuse replaceState; a plain hash assignment
      // still keeps deep links honest at the cost of a history entry.
      try { location.hash = '#' + v + (id ? '/' + id : ''); } catch (e2) { }
    }
    render();
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------ parts */

  function pageHead(title, sub, actions) {
    return '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + esc(title) + '</h1>' +
      (sub ? '<p class="page-sub">' + sub + '</p>' : '') +
      '</div>' + (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
  }

  function captureBar(placeholder) {
    return '<form class="capture" data-form="capture">' +
      ico('plus') +
      '<input name="text" placeholder="' + esc(placeholder || 'Get it out of your head…') + '" ' +
      'aria-label="Quick capture" autocomplete="off" enterkeyhint="done">' +
      '<button class="btn btn-primary btn-sm" type="submit">Capture</button>' +
      '</form>';
  }

  function taskRow(t, i) {
    var proj = t.projectId ? S.get().projects.find(function (p) { return p.id === t.projectId; }) : null;
    var overdue = t.due && !t.done && t.due < RM.todayStr();
    var meta = [];
    if (t.due) meta.push('<span class="' + (overdue ? 'pill pill-danger' : '') + '">' + esc(RM.relDay(t.due)) + '</span>');
    if (proj) meta.push('<span class="pill">' + esc(proj.name) + '</span>');
    if (t.priority && t.priority < 3) meta.push('<span class="pill p' + t.priority + '"><i class="dot"></i>' + (t.priority === 1 ? 'High' : 'Medium') + '</span>');

    return '<div class="row' + (t.done ? ' done' : '') + '" data-act="edit-task" data-id="' + t.id + '"' +
      ' data-stag style="--i:' + (i || 0) + '">' +
      '<button class="check" role="checkbox" aria-checked="' + (t.done ? 'true' : 'false') + '" ' +
      'aria-label="' + (t.done ? 'Mark incomplete' : 'Mark complete') + '" ' +
      'data-act="toggle-task" data-id="' + t.id + '">' + ico('check') + '</button>' +
      '<div class="row-main"><div class="row-title">' + esc(t.title) + '</div>' +
      (meta.length ? '<div class="row-meta">' + meta.join('') + '</div>' : '') + '</div>' +
      '<div class="row-actions">' +
      '<button class="btn btn-ghost btn-icon btn-sm" data-act="del-task" data-id="' + t.id + '" aria-label="Delete task">' + ico('trash') + '</button>' +
      '</div></div>';
  }

  function notesPreview(notes, limit) {
    return '<div class="notes-grid">' + notes.slice(0, limit || notes.length).map(function (n, i) {
      return '<article class="card note-card" data-act="open-note" data-id="' + n.id + '" tabindex="0" role="button"' +
        ' data-stag style="--i:' + i + '">' +
        '<div class="note-title">' + (n.pinned ? '📌 ' : '') + esc(n.title || 'Untitled') + '</div>' +
        '<div class="note-body">' + esc((n.body || '').replace(/\n+/g, ' ')).slice(0, 180) + '</div>' +
        '<div class="note-foot">' + esc(RM.fmtWhen(n.updatedAt || n.createdAt)) +
        ((n.tags || []).slice(0, 2).map(function (t) { return '<span class="pill">' + esc(t) + '</span>'; }).join('')) +
        '</div></article>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------ dashboard */

  function viewDashboard(d) {
    var due = sel.tasksDueToday();
    var week = sel.tasksThisWeek();
    var hour = new Date().getHours();
    var who = (d.settings.name || '').trim();
    var greet = (hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') +
      (who ? ', ' + who : '') + '.';
    var recent = d.notes.slice().sort(function (a, b) { return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); });

    var out = pageHead(greet, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
      '<button class="btn btn-primary" data-act="new-task">' + ico('plus') + ' New task</button>');

    out += '<div class="section">' + captureBar() + '</div>';

    if (sel.reviewDue()) {
      out += '<div class="section"><div class="card card-pad" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
        '<div style="flex:1 1 220px"><h2 style="font-size:15px">Weekly review is due</h2>' +
        '<p class="small muted" style="margin-top:3px">' +
        (d.lastReview ? 'Last one was ' + esc(RM.fmtWhen(d.lastReview)) + '.' : 'You have not run one yet.') +
        ' Ten minutes keeps the whole system honest.</p></div>' +
        '<button class="btn btn-primary" data-act="go" data-view="review">Start review</button></div></div>';
    }

    out += '<div class="section"><div class="stat-grid">' +
      stat(sel.openTasks().length, 'Open tasks', true, 'stat-open-tasks') +
      stat(due.length, 'Due today', false, 'stat-due-today') +
      stat(d.inbox.length, 'In inbox', false, 'stat-inbox') +
      stat(d.streak.current || 0, 'Day streak', true, 'stat-streak') +
      '</div></div>';

    out += '<div class="section"><div class="section-head"><span class="section-title">Today</span>' +
      '<span class="spacer"></span><button class="link-btn small" data-act="go" data-view="tasks">All tasks</button></div>' +
      (due.length ? '<div class="rows">' + due.map(taskRow).join('') + '</div>'
        : '<div class="empty"><b>Nothing due today.</b>Pick one thing that would make the day count.</div>') +
      '</div>';

    if (week.length) {
      out += '<div class="section"><div class="section-head"><span class="section-title">Next seven days</span></div>' +
        '<div class="rows">' + week.slice(0, 6).map(taskRow).join('') + '</div></div>';
    }

    if (recent.length) {
      out += '<div class="section"><div class="section-head"><span class="section-title">Recent notes</span>' +
        '<span class="spacer"></span><button class="link-btn small" data-act="go" data-view="notes">All notes</button></div>' +
        notesPreview(recent, 3) + '</div>';
    }

    return out;
  }

  function stat(n, label, hot, act) {
    // No aria-label here: the accessible name comes from the visible number +
    // label, so screen readers and the visual text can never disagree.
    var attrs = ' class="stat' + (hot ? ' hot' : '') + '"';
    if (act) {
      attrs += ' role="button" tabindex="0" style="cursor:pointer" data-act="' + act + '"';
    }
    return '<div' + attrs + '><div class="stat-num" data-count="' + n + '">' + n + '</div>' +
      '<div class="stat-label">' + esc(label) + '</div></div>';
  }

  /* ------------------------------------------------------------ inbox */

  function viewInbox(d) {
    var out = pageHead('Inbox', 'Everything you captured, before you decided what it is.', '');
    out += '<div class="section">' + captureBar('Capture an idea, a task, a link…') + '</div>';

    if (!d.inbox.length) {
      return out + '<div class="empty"><b>Inbox zero.</b>Nothing waiting. That is the point.</div>';
    }

    out += '<div class="rows">' + d.inbox.slice().reverse().map(function (i, n) {
      return '<div class="row inbox-row" data-stag style="--i:' + n + '"><div class="row-main">' +
        '<div class="row-title">' + esc(i.text) + '</div>' +
        '<div class="row-meta"><span>' + esc(RM.fmtWhen(i.createdAt)) + '</span></div></div>' +
        '<div class="row-actions" style="opacity:1">' +
        '<button class="btn btn-sm" data-act="inbox-task" data-id="' + i.id + '">Task</button>' +
        '<button class="btn btn-sm" data-act="inbox-note" data-id="' + i.id + '">Note</button>' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-act="inbox-del" data-id="' + i.id + '" aria-label="Delete">' + ico('trash') + '</button>' +
        '</div></div>';
    }).join('') + '</div>';

    return out;
  }

  /* ------------------------------------------------------------ tasks */

  function viewTasks(d) {
    var tab = route.tab || 'today';
    var list, all = d.tasks.slice();

    if (tab === 'today') {
      list = sel.tasksDueToday().sort(sortTasks);
    } else if (tab === 'week') {
      list = sel.tasksThisWeek().sort(sortTasks);
    } else if (tab === 'open') {
      list = sel.openTasks().sort(sortTasks);
    } else if (tab === 'done') {
      list = all.filter(function (t) { return t.done; })
        .sort(function (a, b) { return (b.completedAt || 0) - (a.completedAt || 0); });
    } else {
      list = all.sort(sortTasks);
    }

    var qt = searchVal.trim().toLowerCase();
    if (qt) {
      list = list.filter(function (t) {
        return (t.title + ' ' + (t.notes || '')).toLowerCase().indexOf(qt) > -1;
      });
    }

    var out = pageHead('Tasks', 'Grouped by when it matters.',
      '<button class="btn btn-primary" data-act="new-task">' + ico('plus') + ' New</button>');

    out += '<div class="tabs" role="tablist">' +
      tabBtn('today', 'Today', sel.tasksDueToday().length, tab) +
      tabBtn('week', 'Upcoming', sel.tasksThisWeek().length, tab) +
      tabBtn('open', 'All open', sel.openTasks().length, tab) +
      tabBtn('done', 'Done', all.filter(function (t) { return t.done; }).length, tab) +
      '</div>';

    if (!list.length) {
      out += '<div class="empty"><b>Nothing here.</b>' +
        (tab === 'done' ? 'Complete something and watch it land here.' : 'Add a task, or capture one in the bar above.') +
        '</div>';
    } else {
      out += '<div class="rows">' + list.map(taskRow).join('') + '</div>';
    }

    if (tab === 'done' && list.length > 1) {
      out += '<div style="margin-top:14px"><button class="btn btn-sm" data-act="clear-done">Clear completed</button></div>';
    }
    return out;
  }

  function tabBtn(id, label, n, cur) {
    return '<button class="tab" role="tab" data-act="tab" data-tab="' + id + '" aria-selected="' + (cur === id) + '">' +
      label + '<span class="n">' + n + '</span></button>';
  }

  function sortTasks(a, b) {
    var pa = a.priority || 3, pb = b.priority || 3;
    if (pa !== pb) return pa - pb;
    var da = a.due || '9999', db = b.due || '9999';
    if (da !== db) return da < db ? -1 : 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  }

  /* ------------------------------------------------------------ projects */

  function viewProjects(d) {
    var qp = searchVal.trim().toLowerCase();
    function match(p) {
      return !qp || (p.name + ' ' + (p.outcome || '') + ' ' + (p.area || '')).toLowerCase().indexOf(qp) > -1;
    }
    var active = d.projects.filter(function (p) { return p.status !== 'done' && match(p); });
    var done = d.projects.filter(function (p) { return p.status === 'done' && match(p); });

    var out = pageHead('Projects', 'Outcomes with a finish line.',
      '<button class="btn btn-primary" data-act="new-project">' + ico('plus') + ' New</button>');

    if (!d.projects.length) {
      return out + '<div class="empty"><b>No projects yet.</b>A project is any outcome that needs more than one step.</div>';
    }

    out += '<div class="section"><div class="section-head"><span class="section-title">Active · ' + active.length + '</span></div>' +
      '<div class="grid-2">' + active.map(projectCard).join('') + '</div></div>';

    if (done.length) {
      out += '<div class="section"><div class="section-head"><span class="section-title">Completed</span></div>' +
        '<div class="grid-2">' + done.map(projectCard).join('') + '</div></div>';
    }
    return out;
  }

  function projectCard(p, i) {
    var prog = sel.projectProgress(p.id);
    var n = sel.tasksFor(p.id).length;
    return '<div class="card project-card" data-act="open-project" data-id="' + p.id + '" tabindex="0" role="button"' +
      ' data-stag style="--i:' + (i || 0) + '">' +
      '<div class="project-top"><div class="project-name">' + esc(p.name) + '</div>' +
      '<span class="pill' + (p.status === 'done' ? ' pill-accent' : '') + '">' + esc(p.area || 'General') + '</span></div>' +
      (p.outcome ? '<div class="project-outcome">' + esc(p.outcome) + '</div>' : '') +
      '<div class="progress"><span style="width:' + prog + '%"></span></div>' +
      '<div class="project-foot"><span>' + prog + '% · ' + n + ' task' + (n === 1 ? '' : 's') + '</span>' +
      '<span class="spacer"></span>' +
      (p.deadline ? '<span>' + esc(RM.relDay(p.deadline)) + '</span>' : '') +
      '</div></div>';
  }

  function viewProject(d) {
    var p = d.projects.find(function (x) { return x.id === route.id; });
    if (!p) return '<div class="empty">That project no longer exists.</div>';

    var tasks = sel.tasksFor(p.id);
    var prog = sel.projectProgress(p.id);
    var open = tasks.filter(function (t) { return !t.done; });
    var closed = tasks.filter(function (t) { return t.done; });
    var qp = searchVal.trim().toLowerCase();
    if (qp) open = open.filter(function (t) { return t.title.toLowerCase().indexOf(qp) > -1; });

    var out = '<div class="page-head"><div class="page-head-text">' +
      '<button class="link-btn small" data-act="go" data-view="projects">← Projects</button>' +
      '<h1 class="page-title" style="margin-top:6px">' + esc(p.name) + '</h1>' +
      (p.outcome ? '<p class="page-sub">' + esc(p.outcome) + '</p>' : '') + '</div>' +
      '<div class="page-actions">' +
      '<button class="btn btn-sm" data-act="edit-project" data-id="' + p.id + '">' + ico('edit') + ' Edit</button>' +
      '</div></div>';

    out += '<div class="card card-pad section" style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">' +
      '<div><div class="stat-num">' + prog + '%</div><div class="stat-label">Complete</div></div>' +
      '<div><div class="stat-num">' + open.length + '</div><div class="stat-label">Open</div></div>' +
      '<div><div class="stat-num">' + closed.length + '</div><div class="stat-label">Done</div></div>' +
      '<div><div class="stat-num" style="font-size:15px">' + esc(p.area || '—') + '</div><div class="stat-label">Area</div></div>' +
      '<div class="spacer"></div>' +
      (p.deadline ? '<span class="pill">' + esc(RM.relDay(p.deadline)) + '</span>' : '') +
      '</div>';

    out += '<div class="section">' + captureBar('Add a task to this project…').replace('data-form="capture"', 'data-form="capture-project"') + '</div>';

    out += '<div class="section"><div class="section-head"><span class="section-title">Open tasks</span></div>' +
      (open.length ? '<div class="rows">' + open.sort(sortTasks).map(taskRow).join('') + '</div>'
        : '<div class="empty"><b>No open tasks.</b>Add the very next step — not the whole plan.</div>') + '</div>';

    if (closed.length) {
      out += '<div class="section"><div class="section-head"><span class="section-title">Completed</span></div>' +
        '<div class="rows">' + closed.slice(0, 8).map(taskRow).join('') + '</div></div>';
    }

    out += '<div class="section"><button class="btn btn-sm" data-act="toggle-project-done" data-id="' + p.id + '">' +
      (p.status === 'done' ? 'Reopen project' : 'Mark project complete') + '</button></div>';

    return out;
  }

  /* ------------------------------------------------------------ notes */

  function viewNotes(d) {
    var q = searchVal.trim().toLowerCase();
    var notes = d.notes.slice().sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
    });
    if (q) {
      notes = notes.filter(function (n) {
        return (n.title + ' ' + n.body + ' ' + (n.tags || []).join(' ')).toLowerCase().indexOf(q) > -1;
      });
    }

    var out = pageHead('Notes', 'Thinking that outlives the moment.',
      '<button class="btn btn-primary" data-act="new-note">' + ico('plus') + ' New</button>');

    if (!notes.length) {
      return out + '<div class="empty"><b>' + (q ? 'Nothing matched.' : 'No notes yet.') + '</b>' +
        (q ? 'Try a different word.' : 'Notes are where half-formed thinking is allowed to stay half-formed.') + '</div>';
    }

    out += notesPreview(notes);
    return out;
  }

  function viewNote(d) {
    var n = d.notes.find(function (x) { return x.id === route.id; });
    if (!n) return '<div class="empty">That note no longer exists.</div>';

    return '<div class="page-head"><div class="page-head-text">' +
      '<button class="link-btn small" data-act="go" data-view="notes">← Notes</button></div>' +
      '<div class="page-actions">' +
      '<button class="btn btn-sm" data-act="pin-note" data-id="' + n.id + '">' + (n.pinned ? 'Unpin' : 'Pin') + '</button>' +
      '<button class="btn btn-sm btn-danger" data-act="del-note" data-id="' + n.id + '">' + ico('trash') + ' Delete</button>' +
      '</div></div>' +
      '<div class="editor">' +
      '<input class="editor-title" data-note-title="' + n.id + '" value="' + esc(n.title) + '" placeholder="Untitled" aria-label="Note title">' +
      '<div class="editor-meta"><span>Edited ' + esc(RM.fmtWhen(n.updatedAt || n.createdAt)) + '</span>' +
      '<span class="spacer"></span>' +
      '<input class="tag-input" data-note-tags="' + n.id + '" value="' + esc((n.tags || []).join(', ')) + '" placeholder="tags, comma separated" aria-label="Tags">' +
      '</div>' +
      '<textarea class="editor-body" data-note-body="' + n.id + '" placeholder="Start writing…">' + esc(n.body) + '</textarea>' +
      '</div>';
  }

  /* ------------------------------------------------------------ journal */

  function viewJournal(d) {
    var today = RM.todayStr();
    var entry = d.journal.find(function (j) { return j.date === today; });
    var past = d.journal.filter(function (j) { return j.date !== today; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });

    var out = pageHead('Journal', 'A short daily record of what actually happened.',
      '<button class="btn btn-sm" data-act="go" data-view="settings">' + ico('settings') + '</button>');

    out += '<div class="card card-pad section">' +
      '<div class="hstack wrap" style="margin-bottom:12px">' +
      '<span class="pill pill-accent">' + esc(RM.fmtDate(today)) + '</span>' +
      '<span class="spacer"></span>' +
      '<div class="mood" role="group" aria-label="Mood">' +
      ['low', 'ok', 'good', 'great'].map(function (m, i) {
        var emo = ['😕', '😐', '🙂', '🔥'][i];
        return '<button class="mood-btn" data-act="mood" data-mood="' + m + '" aria-pressed="' +
          ((entry && entry.mood) === m) + '" title="' + m + '">' + emo + '</button>';
      }).join('') +
      '</div></div>' +
      '<textarea class="review-input" data-journal-body placeholder="Three lines is enough. What happened, what did you notice, what is next?">' +
      esc(entry ? entry.body : '') + '</textarea>' +
      '</div>';

    if (!past.length) {
      return out + '<div class="empty"><b>No past entries yet.</b>Start with today — future you will read it.</div>';
    }

    out += '<div class="section-head"><span class="section-title">Previous entries</span></div>' +
      past.slice(0, 20).map(function (j) {
        var emo = { low: '😕', ok: '😐', good: '🙂', great: '🔥' }[j.mood] || '';
        return '<div class="card journal-entry">' +
          '<div class="journal-head"><span class="journal-date">' + esc(RM.fmtDate(j.date)) + '</span>' +
          (emo ? '<span>' + emo + '</span>' : '') + '</div>' +
          '<div class="journal-body">' + esc(j.body) + '</div></div>';
      }).join('');

    return out;
  }

  /* ------------------------------------------------------------ review */

  var RV_STEPS = [
    { key: 'inbox', q: 'Clear the inbox', help: 'Anything still sitting there? Decide now: task, note, or delete.', placeholder: 'Optional note to yourself about what you cleared…' },
    { key: 'wins', q: 'What worked this week?', help: 'Three things, however small. Evidence beats motivation.', placeholder: '1.\n2.\n3.' },
    { key: 'drag', q: 'What dragged?', help: 'Name it plainly. Not a story about it — just the thing.', placeholder: 'The thing that kept slipping was…' },
    { key: 'drop', q: 'What are you dropping?', help: 'Every system dies from too much, not too little. What leaves the list?', placeholder: 'I am removing…' },
    { key: 'next', q: 'One outcome for next week', help: 'Not five. One. Everything else is optional by default.', placeholder: 'By next Sunday I will have…' }
  ];

  function viewReview(d) {
    if (rv.step >= RV_STEPS.length) return reviewDone(d);

    var s = RV_STEPS[rv.step];
    var out = pageHead('Weekly review', 'Once a week. Step ' + (rv.step + 1) + ' of ' + RV_STEPS.length + '.');

    out += '<div class="steps">' + RV_STEPS.map(function (_, i) {
      return '<span class="step-dot' + (i <= rv.step ? ' on' : '') + '"></span>';
    }).join('') + '</div>';

    out += '<div class="card review-step">' +
      '<div class="review-q">' + esc(s.q) + '</div>' +
      '<div class="review-help">' + esc(s.help) + '</div>' +
      '<textarea class="review-input" data-review-input="' + s.key + '" placeholder="' + esc(s.placeholder) + '">' +
      esc(rv.answers[s.key] || '') + '</textarea>' +
      '<div class="review-nav">' +
      (rv.step > 0 ? '<button class="btn" data-act="review-back">Back</button>' : '') +
      '<span class="spacer"></span>' +
      '<button class="btn btn-primary" data-act="review-next">' +
      (rv.step === RV_STEPS.length - 1 ? 'Finish review' : 'Next') + '</button>' +
      '</div></div>';

    if (d.lastReview) {
      out += '<p class="small muted" style="margin-top:14px">Previous review: ' + esc(RM.fmtWhen(d.lastReview)) + '</p>';
    }
    return out;
  }

  function reviewDone(d) {
    var last = (d.reviews || []).slice().sort(function (a, b) { return b.at - a.at; })[0];
    return pageHead('Review complete', 'That is the whole discipline. See you in seven days.',
      '<button class="btn btn-primary" data-act="go" data-view="dashboard">Back to today</button>') +
      (last ? '<div class="card card-pad"><div class="section-title" style="margin-bottom:10px">' +
        esc(RM.fmtDate(RM.todayStr(last.at))) + '</div>' +
        RV_STEPS.map(function (s) {
          return '<div style="margin-bottom:12px"><div class="small" style="font-weight:600">' + esc(s.q) + '</div>' +
            '<div class="small muted" style="white-space:pre-wrap">' + esc(last.answers[s.key] || '—') + '</div></div>';
        }).join('') + '</div>' : '');
  }

  /* ------------------------------------------------------------ settings */

  function viewSettings(d) {
    var ok = S.storageAvailable();
    var out = pageHead('Settings', 'Your data lives on this device. Nothing is uploaded, ever.');

    out += '<div class="section"><div class="section-head"><span class="section-title">Data</span><span class="section-line"></span></div>' +
      '<div class="card card-pad">' +
      '<div class="hstack wrap" style="gap:10px">' +
      '<button class="btn" data-act="export">' + ico('download') + ' Export backup</button>' +
      '<button class="btn" data-act="import">' + ico('upload') + ' Import backup</button>' +
      '<span class="spacer"></span>' +
      '<span class="pill ' + (ok ? 'pill-accent' : 'pill-danger') + '">' + (ok ? 'Storage working' : 'Storage blocked') + '</span>' +
      '</div>' +
      '<p class="small muted" style="margin-top:10px">Export writes a single JSON file with every task, project, note, journal entry and review. Import replaces everything currently stored. Do this before switching devices.</p>' +
      '<input type="file" id="import-file" accept="application/json,.json" style="display:none">' +
      '</div></div>';

    out += '<div class="section"><div class="section-head"><span class="section-title">Profile</span><span class="section-line"></span></div>' +
      '<div class="card card-pad">' +
      '<div class="field"><label for="set-name">Name in your greeting</label>' +
      '<input class="input" id="set-name" data-act="set-name" maxlength="24" autocomplete="given-name" ' +
      'placeholder="Optional — leave blank for a plain hello" value="' + esc(d.settings.name || '') + '"></div>' +
      '</div></div>';

    var curTheme = d.settings.theme || 'system';

    out += '<div class="section"><div class="section-head"><span class="section-title">Appearance</span><span class="section-line"></span></div>' +
      '<div class="card card-pad">' +
      '<div class="field-row">' +
      '<div class="field"><label for="set-theme">Theme</label>' +
      '<select class="select" id="set-theme" data-act="set-theme">' +
      '<option value="system"' + (curTheme === 'system' ? ' selected' : '') + '>System (Auto)</option>' +
      '<option value="light"' + (curTheme === 'light' ? ' selected' : '') + '>Light (Paper)</option>' +
      '<option value="dark"' + (curTheme === 'dark' ? ' selected' : '') + '>Dark (Night)</option>' +
      '</select></div>' +
      '<div class="field"><label for="set-accent">Accent</label>' +
      '<select class="select" id="set-accent" data-act="set-accent">' +
      [['#2f5d50', 'Forest'], ['#2b4c7e', 'Ink blue'], ['#7a3e2f', 'Cedar'], ['#4a3f6b', 'Plum'], ['#3f3f3f', 'Graphite']]
        .map(function (c) {
          return '<option value="' + c[0] + '"' + (d.settings.accent === c[0] ? ' selected' : '') + '>' + c[1] + '</option>';
        }).join('') +
      '</select></div>' +
      '<div class="field"><label for="set-density">Density</label>' +
      '<select class="select" id="set-density" data-act="set-density">' +
      '<option value="comfortable"' + (d.settings.density !== 'compact' ? ' selected' : '') + '>Comfortable</option>' +
      '<option value="compact"' + (d.settings.density === 'compact' ? ' selected' : '') + '>Compact</option>' +
      '</select></div></div>' +
      '<div class="set-toggle">' +
      '<div><div class="set-toggle-t">Launch animation</div>' +
      '<div class="set-toggle-d">Plays each time you open the app. Turn it off if you want straight in.</div></div>' +
      '<div class="set-toggle-ctl">' +
      '<button class="btn btn-sm" data-act="intro-play">Play</button>' +
      '<label class="switch"><input type="checkbox" data-act="set-intro"' +
      (d.settings.intro === false ? '' : ' checked') + ' aria-label="Play the launch animation"><span></span></label>' +
      '</div></div></div></div>';

    out += '<div class="section"><div class="section-head"><span class="section-title">Keyboard</span><span class="section-line"></span></div>' +
      '<div class="card card-pad"><div class="hstack wrap" style="gap:16px;font-size:12.5px;color:var(--text-2)">' +
      [['⌘K / Ctrl K', 'Command palette'], ['N', 'New task'], ['C', 'Focus capture'], ['/', 'Search'], ['Esc', 'Close'], ['?', 'This list']]
        .map(function (k) {
          return '<span class="hstack" style="gap:6px"><span class="kbd">' + k[0] + '</span>' + k[1] + '</span>';
        }).join('') +
      '</div></div></div>';

    out += '<div class="section"><div class="section-head"><span class="section-title">Danger zone</span><span class="section-line"></span></div>' +
      '<div class="danger-zone">' +
      '<div class="hstack wrap" style="gap:10px">' +
      '<button class="btn btn-sm" data-act="load-sample">Load example data</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-danger btn-sm" data-act="reset">Erase everything</button>' +
      '</div>' +
      '<p class="small muted" style="margin-top:9px">Erasing cannot be undone. Export first if there is anything worth keeping.</p>' +
      '</div></div>';

    out += '<p class="small muted" style="text-align:center;margin-top:26px">Second Brain OS · Rewrite Minds · v1.2</p>';
    return out;
  }

  /* ------------------------------------------------------------ toast */

  function toast(msg, kind, ms) {
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    toastRoot.appendChild(el);
    // Keep the stack to three; older ones leave immediately.
    while (toastRoot.children.length > 3) toastRoot.firstChild.remove();
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 240);
    }, ms || 2200);
  }

  /* ------------------------------------------------------------ modals */

  var pendingConfirm = null;
  var closeTimer = null;

  function openModal(html, wide) {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    overlayRoot.innerHTML = '<div class="overlay" data-overlay="1">' +
      '<div class="modal' + (wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
    var first = overlayRoot.querySelector('[autofocus], input, textarea, select');
    if (first) setTimeout(function () { first.focus(); }, 30);
  }

  function closeModal() {
    var ov = overlayRoot.querySelector('.overlay');
    var finish = function () {
      closeTimer = null;
      overlayRoot.innerHTML = '';
      pendingConfirm = null;
    };
    if (ov && !reduceMotion) {
      if (ov.dataset.closing) return;
      ov.dataset.closing = '1';
      ov.classList.add('closing');
      closeTimer = setTimeout(finish, 210);
    } else {
      finish();
    }
  }

  function modalShell(title, sub, body, foot) {
    return '<div class="modal-head"><div class="modal-title">' + esc(title) + '</div>' +
      (sub ? '<div class="modal-sub">' + esc(sub) + '</div>' : '') + '</div>' +
      '<div class="modal-body">' + body + '</div>' +
      '<div class="modal-foot">' + foot + '</div>';
  }

  function taskModal(id) {
    var d = S.get();
    var t = id ? d.tasks.find(function (x) { return x.id === id; }) : null;
    var projects = d.projects.filter(function (p) { return p.status !== 'done'; });

    var body =
      '<form data-form="task">' +
      '<input type="hidden" name="id" value="' + (t ? t.id : '') + '">' +
      '<div class="field"><label for="t-title">What needs doing</label>' +
      '<input class="input" id="t-title" name="title" value="' + esc(t ? t.title : '') + '" placeholder="One clear action" required autofocus></div>' +
      '<div class="field-row">' +
      '<div class="field"><label for="t-due">Due</label>' +
      '<input class="input" id="t-due" type="date" name="due" value="' + (t && t.due ? t.due : '') + '"></div>' +
      '<div class="field"><label for="t-priority">Priority</label>' +
      '<select class="select" id="t-priority" name="priority">' +
      '<option value="1"' + (t && t.priority === 1 ? ' selected' : '') + '>High</option>' +
      '<option value="2"' + (t && t.priority === 2 ? ' selected' : '') + '>Medium</option>' +
      '<option value="3"' + (!t || t.priority === 3 ? ' selected' : '') + '>Low</option>' +
      '</select></div></div>' +
      '<div class="field-row">' +
      '<div class="field"><label for="t-project">Project</label>' +
      '<select class="select" id="t-project" name="projectId">' +
      '<option value="">None</option>' +
      projects.map(function (p) {
        return '<option value="' + p.id + '"' + (t && t.projectId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label for="t-area">Area</label>' +
      '<select class="select" id="t-area" name="area">' +
      '<option value="">None</option>' +
      RM.AREAS.map(function (a) {
        return '<option value="' + a + '"' + (t && t.area === a ? ' selected' : '') + '>' + a + '</option>';
      }).join('') +
      '</select></div></div>' +
      '<div class="field"><label for="t-notes">Notes</label>' +
      '<textarea class="textarea" id="t-notes" name="notes" placeholder="Optional context">' + esc(t ? t.notes : '') + '</textarea></div>' +
      '</form>';

    var foot = (t ? '<button class="btn btn-danger btn-sm" data-act="modal-del-task" data-id="' + t.id + '">Delete</button>' : '') +
      '<span class="spacer"></span>' +
      '<button class="btn" data-act="close-modal">Cancel</button>' +
      '<button class="btn btn-primary" data-act="submit-task">' + (t ? 'Save changes' : 'Add task') + '</button>';

    openModal(modalShell(t ? 'Edit task' : 'New task', t ? '' : 'One action, one line. If it needs three, make it a project.', body, foot));
  }

  function projectModal(id) {
    var d = S.get();
    var p = id ? d.projects.find(function (x) { return x.id === id; }) : null;

    var body = '<form data-form="project">' +
      '<input type="hidden" name="id" value="' + (p ? p.id : '') + '">' +
      '<div class="field"><label for="p-name">Name</label>' +
      '<input class="input" id="p-name" name="name" value="' + esc(p ? p.name : '') + '" placeholder="Launch the new store" required autofocus></div>' +
      '<div class="field"><label for="p-outcome">Finish line</label>' +
      '<textarea class="textarea" id="p-outcome" name="outcome" placeholder="What is true when this is done?">' + esc(p ? p.outcome : '') + '</textarea></div>' +
      '<div class="field-row">' +
      '<div class="field"><label for="p-area">Area</label>' +
      '<select class="select" id="p-area" name="area">' +
      RM.AREAS.map(function (a) {
        return '<option value="' + a + '"' + (p && p.area === a ? ' selected' : '') + '>' + a + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label for="p-deadline">Deadline</label>' +
      '<input class="input" id="p-deadline" type="date" name="deadline" value="' + (p && p.deadline ? p.deadline : '') + '"></div></div>' +
      '</form>';

    var foot = (p ? '<button class="btn btn-danger btn-sm" data-act="modal-del-project" data-id="' + p.id + '">Delete</button>' : '') +
      '<span class="spacer"></span>' +
      '<button class="btn" data-act="close-modal">Cancel</button>' +
      '<button class="btn btn-primary" data-act="submit-project">' + (p ? 'Save' : 'Create project') + '</button>';

    openModal(modalShell(p ? 'Edit project' : 'New project', 'A project is an outcome with more than one step.',
      body, foot));
  }

  function confirmAction(title, text, label, fn) {
    pendingConfirm = fn;
    openModal(modalShell(title, '', '<p class="small" style="color:var(--text-2);line-height:1.6">' + esc(text) + '</p>',
      '<button class="btn" data-act="close-modal">Cancel</button>' +
      '<button class="btn btn-danger" data-act="confirm-yes">' + esc(label) + '</button>'));
  }

  /* ------------------------------------------------------------ onboarding */

  var onb = null;
  var onbBusy = false;

  var ONB_ACCENTS = [
    ['#2f5d50', 'Forest'],
    ['#2b4c7e', 'Ink'],
    ['#7a3e2f', 'Cedar'],
    ['#4a3f6b', 'Plum'],
    ['#3f3f3f', 'Graphite']
  ];

  var ONB_STEP_COUNT = 4;
  var ONB_LABELS = ['Today', 'Rules', 'You', 'Start'];

  function onbRail() {
    return '<ol class="onb-rail" aria-hidden="true">' +
      ONB_LABELS.map(function (label, i) {
        return '<li class="onb-node" data-node="' + i + '">' +
          '<span class="onb-node-d"><b class="onb-node-n">' + (i + 1) + '</b>' +
          '<span class="onb-node-ck">' + ico('check') + '</span></span>' +
          '<span class="onb-node-t">' + label + '</span></li>';
      }).join('') +
      '</ol>';
  }

  function onbRailSet(s) {
    var nodes = overlayRoot.querySelectorAll('.onb-node');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('done', i < s);
      nodes[i].classList.toggle('cur', i === s);
    }
  }

  function openOnboarding() {
    var d = S.get();
    onb = {
      step: 0,
      name: d.settings.name || '',
      accent: d.settings.accent || '#2f5d50',
      seed: 'sample'
    };
    paintOnboarding('fwd');
  }

  function paintOnboarding(dir) {
    if (!onb) return;
    // The shared brain canvas lives in whichever step owns it. Release it
    // before the step markup is replaced, or the old render loop keeps going.
    if (window.Brain3D) window.Brain3D.detach();
    var s = onb.step;
    var body = '';

    if (s === 0) {
      body =
        '<div class="onb-step poster">' +
        '<div class="poster-stage">' +
        '<div class="poster-art" aria-hidden="true">' +
        '<div class="poster-ghost">SECOND BRAIN</div>' +
        '<div class="art" data-brain-host="poster">' +
        '<div class="art-fallback" aria-hidden="true"></div></div>' +
        '<div class="mini mini-a">' +
        '<div class="mini-row"><span class="mini-check"></span><span class="mini-t">Draft the pricing page</span></div>' +
        '<div class="mini-meta"><span class="mini-pill">Today</span><span>Work</span></div>' +
        '</div>' +
        '<div class="mini mini-b">' +
        '<div class="mini-t">Launch Second Brain OS</div>' +
        '<div class="mini-bar"><i></i></div>' +
        '<div class="mini-meta"><span>3 of 5 tasks</span><span class="mini-dot"></span><span>Business</span></div>' +
        '</div>' +
        '<div class="mini-toast">Captured</div>' +
        '</div>' +
        '</div>' +
        '<div class="poster-copy">' +
        '<div class="onb-eyebrow">Second Brain OS</div>' +
        '<h1 class="onb-huge" id="onb-heading">Your head is not a <em>filing cabinet</em>.</h1>' +
        '<p class="onb-lede">Every task, idea and half-thought lands in one place first — then gets decided once, properly. ' +
        'No account. No cloud. Nothing leaves this device.</p>' +
        '<div class="poster-chips" aria-hidden="true">' +
        '<span class="chip on">Capture</span><span class="chip">Decide</span>' +
        '<span class="chip">Focus</span><span class="chip">Review</span>' +
        '</div>' +
        '</div>' +
        '</div>';
    } else if (s === 1) {
      body =
        '<div class="onb-step">' +
        '<div class="onb-eyebrow">The system</div>' +
        '<h1 class="onb-huge" id="onb-heading">Four rules. That is the whole thing.</h1>' +
        '<div class="onb-rules">' +
        [
          ['Capture everything', 'One bar at the top. If it is in your head, it goes there — no sorting required yet.'],
          ['Empty the inbox every morning', 'Decide: task, project, note, or delete. Nothing stays undecided.'],
          ['Work from Today, never the inbox', 'The inbox is a doorway, not a room.'],
          ['Review every seven days', 'Five questions. Ten minutes. The system will remind you.']
        ].map(function (r, i) {
          return '<div class="onb-rule" style="--i:' + i + '">' +
            '<span class="onb-rule-n">' + (i + 1) + '</span>' +
            '<div><div class="onb-rule-t">' + r[0] + '</div>' +
            '<div class="onb-rule-d">' + r[1] + '</div></div></div>';
        }).join('') +
        '</div></div>';
    } else if (s === 2) {
      body =
        '<div class="onb-step">' +
        '<div class="onb-eyebrow">Make it yours</div>' +
        '<h1 class="onb-huge" id="onb-heading">Two seconds of setup.</h1>' +
        '<div class="onb-personalise">' +
        '<div>' +
        '<div class="onb-field">' +
        '<label class="onb-label" for="onb-name">What should it call you?</label>' +
        '<input class="onb-input" id="onb-name" maxlength="24" autocomplete="given-name" ' +
        'placeholder="First name" value="' + esc(onb.name) + '">' +
        '</div>' +
        '<div class="onb-field">' +
        '<span class="onb-label">Accent colour</span>' +
        '<div class="onb-swatches" role="group" aria-label="Accent colour">' +
        ONB_ACCENTS.map(function (a) {
          return '<button class="onb-swatch" data-act="onb-accent" data-color="' + a[0] + '" ' +
            'style="background:' + a[0] + '" title="' + a[1] + '" aria-label="' + a[1] + '" ' +
            'aria-pressed="' + (onb.accent === a[0] ? 'true' : 'false') + '"></button>';
        }).join('') +
        '</div></div>' +
        '<p class="onb-hint">Both are optional, and both change later in Settings.</p>' +
        '</div>' +
        '<div class="onb-preview" aria-hidden="true">' +
        '<div class="pv">' +
        '<div class="pv-top"><span class="pv-dot"></span><span class="pv-dot"></span><span class="pv-dot"></span></div>' +
        '<div class="pv-greet">Good evening<span id="onb-pv-name"></span>.</div>' +
        '<div class="pv-sub">' + esc(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })) + '</div>' +
        '<div class="pv-stats">' +
        '<div class="pv-stat"><b>3</b><span>OPEN</span></div>' +
        '<div class="pv-stat"><b>2</b><span>TODAY</span></div>' +
        '<div class="pv-stat"><b>1</b><span>INBOX</span></div>' +
        '</div>' +
        '<div class="pv-capture"><span>Get it out of your head…</span><i>Capture</i></div>' +
        '</div></div>' +
        '</div></div>';
    } else {
      body =
        '<div class="onb-step">' +
        '<div class="onb-eyebrow">Last step</div>' +
        '<h1 class="onb-huge" id="onb-heading">Start with a running system, or a blank page.</h1>' +
        '<div class="onb-choices">' +
        choice('sample', 'Show me a filled-in system',
          'Projects, tasks, notes, a journal and a finished review. Everything is editable, and you can erase it in one click.') +
        choice('empty', 'Start with a clean slate',
          'Nothing in it but the four rules. Best if you are migrating from another app and want a fresh start.') +
        '</div></div>';
    }

    var nextLabel = s === 0 ? 'Begin' : s === 1 ? 'Got it' : s === 2 ? 'Continue'
      : (onb.seed === 'sample' ? 'Open the example' : 'Enter Second Brain OS');

    /* The shell is built once. Only the body swaps, so the buttons never jump
       and the pressed state survives the step change. */
    if (!overlayRoot.querySelector('.onb')) {
      overlayRoot.innerHTML =
        '<div class="onb" id="onb" role="dialog" aria-modal="true" aria-labelledby="onb-heading">' +
        '<div class="onb-panel">' +
        '<div class="onb-top">' +
        '<div class="onb-brand"><div class="onb-mark">SB</div>' +
        '<div class="onb-brand-t"><span class="onb-brand-n">Second Brain OS</span>' +
        '<span class="onb-brand-s">Rewrite Minds</span></div></div>' +
        '<button class="onb-skip" data-act="onb-skip">Skip the tour</button>' +
        '</div>' +
        '<div class="onb-body"></div>' +
        '<div class="onb-foot">' +
        onbRail() +
        '<div class="onb-foot-row">' +
        '<button class="onb-back" data-act="onb-back" aria-label="Back">' + ico('back') + '<span class="onb-back-t">Back</span></button>' +
        '<button class="onb-next" data-act="onb-next"></button>' +
        '</div>' +
        '</div>' +
        '</div></div>';
    }

    var skipEl = overlayRoot.querySelector('.onb-skip');
    if (skipEl) skipEl.hidden = s >= 3;

    var backEl = overlayRoot.querySelector('.onb-back');
    if (backEl) backEl.hidden = s === 0;

    var nextEl = overlayRoot.querySelector('.onb-next');
    if (nextEl) nextEl.innerHTML = nextLabel + ico('right');

    onbRailSet(s);

    var bodyEl = overlayRoot.querySelector('.onb-body');
    var stepEl;

    function mountStep() {
      bodyEl.innerHTML = body;
      stepEl = overlayRoot.querySelector('.onb-step');
      if (stepEl && dir === 'back') stepEl.classList.add('dir-back');
      if (stepEl && !dir) stepEl.classList.add('static');
      if (s === 0) {
        setTimeout(function () {
          if (window.Brain3D && document.querySelector('.poster-art [data-brain-host]')) {
            window.Brain3D.attach(document.querySelector('.poster-art [data-brain-host]'), { mode: 'poster' });
          }
        }, 30);
      }
      if (s === 2) {
        var nameInput = document.getElementById('onb-name');
        if (nameInput) {
          nameInput.addEventListener('input', function () {
            onb.name = nameInput.value;
            var pv = document.getElementById('onb-pv-name');
            var trimmed = onb.name.trim();
            if (pv) pv.textContent = trimmed ? ', ' + trimmed : '';
          });
          nameInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); onbNext(); }
          });
          setTimeout(function () {
            if (!reduceMotion) nameInput.focus();
          }, 120);
        }
      }
    }

    // Let the outgoing step fall away before the new one arrives. Without this
    // the click reads as a glitch: the button you pressed vanishes instantly.
    var oldStep = bodyEl.querySelector('.onb-step');
    if (oldStep && dir && !reduceMotion && !onbBusy) {
      onbBusy = true;
      oldStep.classList.add(dir === 'back' ? 'out-back' : 'out-fwd');
      setTimeout(function () { onbBusy = false; mountStep(); }, 150);
    } else {
      mountStep();
    }
  }

  function choice(seed, title, desc) {
    var on = onb.seed === seed;
    return '<button class="onb-choice" data-act="onb-seed" data-seed="' + seed + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
      '<div class="onb-choice-t"><span class="tick">' + ico('check') + '</span>' + title + '</div>' +
      '<div class="onb-choice-d">' + desc + '</div></button>';
  }

  function onbNext() {
    if (!onb || onbBusy) return;
    if (onb.step < ONB_STEP_COUNT - 1) {
      onb.step++;
      paintOnboarding('fwd');
    } else {
      finishOnboarding();
    }
  }

  function onbBack() {
    if (!onb || onbBusy) return;
    onb.step = Math.max(0, onb.step - 1);
    paintOnboarding('back');
  }

  function onbSkip() {
    if (!onb || onbBusy) return;
    onb.step = 3;
    onb.seed = 'empty';
    paintOnboarding('fwd');
  }

  function finishOnboarding() {
    if (!onb) return;
    var name = (onb.name || '').trim();
    var accent = onb.accent;
    var seed = onb.seed;

    if (seed === 'sample') S.loadSample();
    S.commit(function (d) {
      d.onboarded = true;
      d.settings.name = name;
      d.settings.accent = accent;
    });

    var el = document.getElementById('onb');
    onb = null;
    if (el && !reduceMotion) {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.remove(); }, 320);
    } else {
      overlayRoot.innerHTML = '';
    }

    navDir = 1;
    lastViewKey = null;
    go('dashboard');
    toast(seed === 'sample'
      ? 'Example loaded — erase it any time in Settings'
      : 'Clean slate. Start by capturing one thing.', 'ok', seed === 'sample' ? 3600 : 2800);
  }

  /* ------------------------------------------------------------ palette */

  function paletteCommands() {
    var d = S.get();
    var cmds = [
      { label: 'Go to Today', hint: 'nav', icon: 'home', run: function () { go('dashboard'); } },
      { label: 'Go to Inbox', hint: 'nav', icon: 'inbox', run: function () { go('inbox'); } },
      { label: 'Go to Tasks', hint: 'nav', icon: 'checkSquare', run: function () { go('tasks'); } },
      { label: 'Go to Projects', hint: 'nav', icon: 'folder', run: function () { go('projects'); } },
      { label: 'Go to Notes', hint: 'nav', icon: 'file', run: function () { go('notes'); } },
      { label: 'Go to Journal', hint: 'nav', icon: 'book', run: function () { go('journal'); } },
      { label: 'Go to Weekly review', hint: 'nav', icon: 'refresh', run: function () { go('review'); } },
      { label: 'Go to Settings', hint: 'nav', icon: 'settings', run: function () { go('settings'); } },
      { label: 'New task', hint: 'N', icon: 'plus', run: function () { taskModal(); } },
      { label: 'New project', hint: '', icon: 'folder', run: function () { projectModal(); } },
      { label: 'New note', hint: '', icon: 'file', run: function () { createNote(); } },
      { label: 'Set theme: System (Auto)', hint: '', icon: 'spark', run: function () { S.commit(function (d) { d.settings.theme = 'system'; }); applyTheme('system'); render(); toast('Theme: System', 'ok'); } },
      { label: 'Set theme: Light (Paper)', hint: '', icon: 'spark', run: function () { S.commit(function (d) { d.settings.theme = 'light'; }); applyTheme('light'); render(); toast('Theme: Light', 'ok'); } },
      { label: 'Set theme: Dark (Night)', hint: '', icon: 'spark', run: function () { S.commit(function (d) { d.settings.theme = 'dark'; }); applyTheme('dark'); render(); toast('Theme: Dark', 'ok'); } },
      { label: 'Export backup', hint: '', icon: 'download', run: function () { S.exportData(); toast('Backup downloaded', 'ok'); } }
    ];
    d.projects.filter(function (p) { return p.status !== 'done'; }).forEach(function (p) {
      cmds.push({ label: 'Project · ' + p.name, hint: 'open', icon: 'folder', run: function () { go('project', p.id); } });
    });
    d.notes.slice(0, 12).forEach(function (n) {
      cmds.push({ label: 'Note · ' + (n.title || 'Untitled'), hint: 'open', icon: 'file', run: function () { go('note', n.id); } });
    });
    return cmds;
  }

  function openPalette() {
    var cmds = paletteCommands();
    paletteSel = 0;

    overlayRoot.innerHTML = '<div class="overlay" data-overlay="1"><div class="modal palette" role="dialog" aria-modal="true">' +
      '<input class="palette-input" id="palette-input" placeholder="Type a command, project or note…" autocomplete="off" aria-label="Command palette">' +
      '<div class="palette-list" id="palette-list"></div></div></div>';

    var input = document.getElementById('palette-input');
    var list = document.getElementById('palette-list');

    function paint() {
      var q = input.value.trim().toLowerCase();
      var filtered = q ? cmds.filter(function (c) { return c.label.toLowerCase().indexOf(q) > -1; }) : cmds;
      if (!filtered.length) {
        list.innerHTML = '<div class="palette-empty">Nothing matches that.</div>';
        return;
      }
      paletteSel = Math.min(paletteSel, filtered.length - 1);
      list.innerHTML = filtered.map(function (c, i) {
        return '<button class="palette-item' + (i === paletteSel ? ' sel' : '') + '" data-idx="' + i + '">' +
          ico(c.icon) + '<span>' + esc(c.label) + '</span>' +
          (c.hint ? '<span class="hint">' + esc(c.hint) + '</span>' : '') + '</button>';
      }).join('');
      list._filtered = filtered;
    }

    input.addEventListener('input', function () { paletteSel = 0; paint(); });

    input.addEventListener('keydown', function (e) {
      var filtered = list._filtered || cmds;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        paletteSel = Math.min(paletteSel + 1, filtered.length - 1);
        paint();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        paletteSel = Math.max(paletteSel - 1, 0);
        paint();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var pick = filtered[paletteSel];
        if (pick) { closeModal(); pick.run(); }
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });

    list.addEventListener('click', function (e) {
      var b = e.target.closest('.palette-item');
      if (!b) return;
      var pick = (list._filtered || cmds)[Number(b.dataset.idx)];
      if (pick) { closeModal(); pick.run(); }
    });

    paint();
    setTimeout(function () { input.focus(); }, 20);
  }

  /* ------------------------------------------------------------ actions */

  function createNote() {
    var n = { id: RM.uid(), title: '', body: '', tags: [], pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
    S.commit(function (d) { d.notes.unshift(n); }, 'note');
    focusAfter = '.editor-title';
    go('note', n.id);
  }

  function saveTaskFromForm(form) {
    var f = new FormData(form);
    var id = f.get('id');
    var payload = {
      title: (f.get('title') || '').trim(),
      due: f.get('due') || null,
      priority: Number(f.get('priority') || 3),
      projectId: f.get('projectId') || null,
      area: f.get('area') || null,
      notes: (f.get('notes') || '').trim()
    };
    if (!payload.title) { toast('Give it a title first', 'err'); return; }

    S.commit(function (d) {
      if (id) {
        var t = d.tasks.find(function (x) { return x.id === id; });
        if (t) Object.assign(t, payload);
      } else {
        d.tasks.push(Object.assign({ id: RM.uid(), done: false, createdAt: Date.now() }, payload));
      }
    }, 'task');

    closeModal();
    toast(id ? 'Task updated' : 'Task added', 'ok');
    render();
  }

  function saveProjectFromForm(form) {
    var f = new FormData(form);
    var id = f.get('id');
    var payload = {
      name: (f.get('name') || '').trim(),
      outcome: (f.get('outcome') || '').trim(),
      area: f.get('area') || 'Personal',
      deadline: f.get('deadline') || null
    };
    if (!payload.name) { toast('Give it a name first', 'err'); return; }

    S.commit(function (d) {
      if (id) {
        var p = d.projects.find(function (x) { return x.id === id; });
        if (p) Object.assign(p, payload);
      } else {
        d.projects.push(Object.assign({ id: RM.uid(), status: 'active', createdAt: Date.now() }, payload));
      }
    }, 'project');

    closeModal();
    toast(id ? 'Project updated' : 'Project created', 'ok');
    render();
  }

  function toggleTask(id) {
    var nowDone = false;
    S.commit(function (d) {
      var t = d.tasks.find(function (x) { return x.id === id; });
      if (!t) return;
      t.done = !t.done;
      t.completedAt = t.done ? Date.now() : null;
      if (t.done) S.touchStreak();
      nowDone = t.done;
    }, 'task');
    render();

    if (nowDone) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([16, 40, 24]); } catch (e) { }
      }
      toast('Task completed', 'ok', 1800);
      if (!reduceMotion) {
        var row = document.querySelector('.row[data-id="' + id + '"]');
        if (row) {
          row.classList.add('just-done');
          var chk = row.querySelector('.check');
          if (chk) chk.classList.add('pop');
        }
      }
    }
  }

  function pulseCapture() {
    if (reduceMotion) return;
    var el = document.querySelector('.capture');
    if (!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
    setTimeout(function () { el.classList.remove('pulse'); }, 620);
  }

  function bumpInbox() {
    if (reduceMotion) return;
    var el = document.querySelector('.nav-item[data-view="inbox"] .count');
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  /* ------------------------------------------------------------ events */

  document.addEventListener('click', function (e) {
    var overlay = e.target.closest('[data-overlay]');
    if (overlay && e.target === overlay) { closeModal(); return; }

    var el = e.target.closest('[data-act]');
    if (!el) return;

    var act = el.dataset.act;
    var id = el.dataset.id;

    switch (act) {
      case 'go': go(el.dataset.view, el.dataset.id, el.dataset.tab); break;
      case 'stat-open-tasks': go('tasks', null, 'open'); break;
      case 'stat-due-today': go('tasks', null, 'today'); break;
      case 'stat-inbox': go('inbox'); break;
      case 'stat-streak': go('journal'); break;
      case 'open-sidebar': app.dataset.sidebar = 'open'; render(); break;
      case 'close-sidebar': app.dataset.sidebar = 'closed'; render(); break;
      case 'palette': openPalette(); break;
      case 'intro-play': playIntro(null, true); break;
      case 'close-modal': closeModal(); break;
      case 'confirm-yes':
        var fn = pendingConfirm;
        closeModal();
        if (fn) fn();
        break;

      case 'new-task': taskModal(); break;
      case 'edit-task': taskModal(id); break;
      case 'toggle-task': toggleTask(id); break;
      case 'del-task':
        confirmAction('Delete task?', 'This cannot be undone.', 'Delete', function () {
          S.commit(function (d) { d.tasks = d.tasks.filter(function (t) { return t.id !== id; }); });
          toast('Task deleted'); render();
        });
        break;
      case 'submit-task':
        var tf = document.querySelector('form[data-form="task"]');
        if (tf) saveTaskFromForm(tf);
        break;
      case 'modal-del-task':
        confirmAction('Delete task?', 'This cannot be undone.', 'Delete', function () {
          S.commit(function (d) { d.tasks = d.tasks.filter(function (t) { return t.id !== id; }); });
          toast('Task deleted'); render();
        });
        break;

      case 'tab': route.tab = el.dataset.tab; render(); break;
      case 'clear-done':
        confirmAction('Clear completed tasks?', 'Every task marked done will be removed permanently.', 'Clear', function () {
          S.commit(function (d) { d.tasks = d.tasks.filter(function (t) { return !t.done; }); });
          toast('Completed tasks cleared', 'ok'); render();
        });
        break;

      case 'new-project': projectModal(); break;
      case 'open-project': go('project', id); break;
      case 'edit-project': projectModal(id); break;
      case 'submit-project':
        var pf = document.querySelector('form[data-form="project"]');
        if (pf) saveProjectFromForm(pf);
        break;
      case 'toggle-project-done':
        S.commit(function (d) {
          var p = d.projects.find(function (x) { return x.id === id; });
          if (p) p.status = p.status === 'done' ? 'active' : 'done';
        });
        toast('Project updated', 'ok'); render();
        break;
      case 'modal-del-project':
        confirmAction('Delete project?', 'The project goes, but its tasks stay and become unassigned.', 'Delete', function () {
          S.commit(function (d) {
            d.projects = d.projects.filter(function (p) { return p.id !== id; });
            d.tasks.forEach(function (t) { if (t.projectId === id) t.projectId = null; });
          });
          closeModal(); go('projects'); toast('Project deleted');
        });
        break;

      case 'inbox-task':
        S.commit(function (d) {
          var i = d.inbox.find(function (x) { return x.id === id; });
          if (!i) return;
          d.tasks.push({ id: RM.uid(), title: i.text, done: false, due: null, priority: 3, projectId: null, area: null, notes: '', createdAt: Date.now() });
          d.inbox = d.inbox.filter(function (x) { return x.id !== id; });
        });
        toast('Moved to tasks', 'ok'); render();
        break;
      case 'inbox-note':
        S.commit(function (d) {
          var i = d.inbox.find(function (x) { return x.id === id; });
          if (!i) return;
          d.notes.unshift({ id: RM.uid(), title: i.text.slice(0, 60), body: i.text, tags: [], pinned: false, createdAt: Date.now(), updatedAt: Date.now() });
          d.inbox = d.inbox.filter(function (x) { return x.id !== id; });
        });
        toast('Moved to notes', 'ok'); render();
        break;
      case 'inbox-del':
        S.commit(function (d) { d.inbox = d.inbox.filter(function (x) { return x.id !== id; }); });
        render();
        break;

      case 'new-note': createNote(); break;
      case 'open-note': go('note', id); break;
      case 'pin-note':
        S.commit(function (d) {
          var n = d.notes.find(function (x) { return x.id === id; });
          if (n) { n.pinned = !n.pinned; n.updatedAt = Date.now(); }
        });
        render();
        break;
      case 'del-note':
        confirmAction('Delete note?', 'The note is gone permanently.', 'Delete', function () {
          S.commit(function (d) { d.notes = d.notes.filter(function (n) { return n.id !== id; }); });
          go('notes'); toast('Note deleted');
        });
        break;

      case 'mood': setMood(el.dataset.mood); break;

      case 'review-next': reviewNext(); break;
      case 'review-back': rv.step = Math.max(0, rv.step - 1); render(); break;

      case 'export': S.exportData(); toast('Backup downloaded', 'ok'); break;
      case 'import':
        var inp = document.getElementById('import-file');
        if (inp) inp.click();
        break;
      case 'reset':
        confirmAction('Erase everything?', 'Every task, project, note and journal entry will be deleted. Export a backup first if you need one.', 'Erase everything', function () {
          S.reset(); go('dashboard'); toast('Everything erased');
        });
        break;
      case 'load-sample':
        confirmAction('Load example data?', 'This replaces everything currently stored.', 'Load examples', function () {
          S.loadSample(); go('dashboard'); toast('Example data loaded', 'ok');
        });
        break;

      case 'onb-next': onbNext(); break;
      case 'onb-back': onbBack(); break;
      case 'onb-skip': onbSkip(); break;
      case 'onb-seed':
        if (!onb) break;
        onb.seed = el.dataset.seed;
        paintOnboarding(null);
        break;
      case 'onb-accent':
        if (!onb) break;
        onb.accent = el.dataset.color;
        applyAccent(onb.accent);
        // Repaint only the swatches — repainting the step would steal focus
        // from the name field mid-typing.
        Array.prototype.forEach.call(document.querySelectorAll('.onb-swatch'), function (s) {
          s.setAttribute('aria-pressed', s.dataset.color === onb.accent ? 'true' : 'false');
        });
        break;
    }
  });

  /* ------------------------------------------------------------ forms */

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();

    var kind = form.dataset.form;

    // Modal forms (task / project) submit through the same path as their buttons.
    if (kind === 'task') { saveTaskFromForm(form); return; }
    if (kind === 'project') { saveProjectFromForm(form); return; }

    var input = form.querySelector('input[name="text"]');
    var text = input ? input.value.trim() : '';
    if (!text) return;

    if (kind === 'capture') {
      S.commit(function (d) { d.inbox.push({ id: RM.uid(), text: text, createdAt: Date.now() }); }, 'inbox');
      toast('Captured', 'ok');
      focusAfter = '.capture input';
      render();
      pulseCapture();
      bumpInbox();
    } else if (kind === 'capture-project') {
      var pid = route.id;
      S.commit(function (d) {
        d.tasks.push({ id: RM.uid(), title: text, done: false, due: null, priority: 3, projectId: pid, area: null, notes: '', createdAt: Date.now() });
        S.touchStreak();
      }, 'task');
      toast('Task added to project', 'ok');
      focusAfter = '.capture input';
      render();
    }
  });

  /* ------------------------------------------------------------ live inputs */

  var saveSoon = RM.debounce(function () { S.save(); }, 260);

  document.addEventListener('input', function (e) {
    var t = e.target;

    if (t.id === 'global-search') {
      searchVal = t.value;
      if (['notes', 'tasks', 'projects'].indexOf(route.view) > -1) {
        focusAfter = '#global-search';
        render();
      }
      return;
    }

    if (t.dataset.noteTitle) {
      var n1 = S.get().notes.find(function (x) { return x.id === t.dataset.noteTitle; });
      if (n1) { n1.title = t.value; n1.updatedAt = Date.now(); saveSoon(); }
      return;
    }
    if (t.dataset.noteBody) {
      var n2 = S.get().notes.find(function (x) { return x.id === t.dataset.noteBody; });
      if (n2) { n2.body = t.value; n2.updatedAt = Date.now(); saveSoon(); }
      return;
    }
    if (t.dataset.noteTags) {
      var n3 = S.get().notes.find(function (x) { return x.id === t.dataset.noteTags; });
      if (n3) {
        n3.tags = t.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        n3.updatedAt = Date.now(); saveSoon();
      }
      return;
    }
    if (t.hasAttribute('data-journal-body')) {
      upsertJournal(function (j) { j.body = t.value; });
      return;
    }
    if (t.hasAttribute('data-review-input')) {
      rv.answers[t.dataset.reviewInput] = t.value;
      return;
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;

    if (t.id === 'import-file' && t.files && t.files[0]) {
      S.importData(t.files[0], function (err) {
        if (err) { toast('Could not read that backup', 'err'); return; }
        closeModal(); go('dashboard');
        toast('Backup restored', 'ok', 2800);
      });
      return;
    }
    if (t.dataset.act === 'set-theme') {
      S.commit(function (d) { d.settings.theme = t.value; });
      applyTheme(t.value);
      render();
      toast('Theme updated', 'ok', 1400);
      return;
    }
    if (t.dataset.act === 'set-density') {
      S.commit(function (d) { d.settings.density = t.value; }); render();
      return;
    }
    if (t.dataset.act === 'set-accent') {
      S.commit(function (d) { d.settings.accent = t.value; }); render();
      return;
    }
    if (t.dataset.act === 'set-name') {
      S.commit(function (d) { d.settings.name = (t.value || '').trim(); }); render();
      return;
    }
    if (t.dataset.act === 'set-intro') {
      S.commit(function (d) { d.settings.intro = !!t.checked; });
      return;
    }
  });

  function upsertJournal(mut) {
    var d = S.get();
    var today = RM.todayStr();
    var j = d.journal.find(function (x) { return x.date === today; });
    if (!j) {
      j = { id: RM.uid(), date: today, mood: null, energy: 3, body: '', createdAt: Date.now() };
      d.journal.push(j);
    }
    mut(j);
    saveSoon();
  }

  function setMood(mood) {
    upsertJournal(function (j) { j.mood = j.mood === mood ? null : mood; });
    S.touchStreak();
    render();
  }

  function reviewNext() {
    if (rv.step < RV_STEPS.length - 1) {
      rv.step += 1;
      render();
      return;
    }
    S.commit(function (d) {
      d.reviews = d.reviews || [];
      d.reviews.push({ at: Date.now(), answers: Object.assign({}, rv.answers) });
      d.lastReview = Date.now();
      S.touchStreak();
    }, 'review');
    rv.step = RV_STEPS.length;
    render();
    toast('Review saved. Well done.', 'ok', 2600);
  }

  /* ------------------------------------------------------------ keyboard */

  document.addEventListener('keydown', function (e) {
    if (introUp) return;
    var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

    if (onb) {
      if (e.key === 'Escape') { e.preventDefault(); onbBack(); return; }
      if (e.key === 'Enter' && document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); onbNext(); return;
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.key === 'Escape') {
      if (overlayRoot.innerHTML) { closeModal(); return; }
      if (app.dataset.sidebar === 'open') { app.dataset.sidebar = 'closed'; render(); return; }
      if (inField) { document.activeElement.blur(); return; }
    }
    if (inField) return;

    if (e.key === 'n') { e.preventDefault(); taskModal(); }
    else if (e.key === 'c') {
      e.preventDefault();
      var cap = document.querySelector('.capture input');
      if (cap) cap.focus();
      else go('inbox');
    } else if (e.key === '/') {
      e.preventDefault();
      var s = document.getElementById('global-search');
      if (s) s.focus();
    } else if (e.key === '?') {
      e.preventDefault();
      go('settings');
    }
  });

  // Row/card activation by keyboard
  app.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var target = e.target.closest('[role="button"], .row[data-act]');
    if (!target || target.tagName === 'BUTTON') return;
    e.preventDefault();
    target.click();
  });

  /* ------------------------------------------------------------ launch intro */

  var INTRO_MS = 3400;
  var introUp = false;

  /* The centerpiece: a glass brain, drawn in SVG so it ships in the same 50 KB
     and scales to any viewport. `k` keeps gradient ids unique per instance. */
  function brainSVG(k) {
    var body = 'bh-body-' + k, ridge = 'bh-ridge-' + k, gloss = 'bh-gloss-' + k,
      shade = 'bh-shade-' + k, mass = 'bh-mass-' + k, clip = 'bh-clip-' + k;
    return '<svg class="brain" viewBox="0 0 440 360" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<linearGradient id="' + body + '" x1=".34" y1="0" x2=".62" y2="1">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".34" stop-color="#f6faf7"/>' +
      '<stop offset=".6" stop-color="#dfe9e3"/><stop offset=".83" stop-color="#c4d3ca"/>' +
      '<stop offset="1" stop-color="#adbfb4"/></linearGradient>' +
      '<linearGradient id="' + ridge + '" x1=".15" y1="0" x2=".8" y2="1">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#fbfdfc"/>' +
      '<stop offset="1" stop-color="#dfe8e2"/></linearGradient>' +
      '<radialGradient id="' + gloss + '" cx=".24" cy=".1" r=".58">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".38" stop-color="#ffffff" stop-opacity=".62"/>' +
      '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + shade + '" cx=".5" cy="1.06" r=".66">' +
      '<stop offset="0" stop-color="#24483d" stop-opacity=".2"/>' +
      '<stop offset=".55" stop-color="#24483d" stop-opacity=".06"/>' +
      '<stop offset="1" stop-color="#24483d" stop-opacity="0"/></radialGradient>' +
      '<path id="' + mass + '" d="M74 200 C62 176 64 140 80 112 C100 76 140 58 186 54 ' +
      'C236 50 288 60 322 82 C354 102 376 132 388 164 C398 190 396 216 384 236 ' +
      'C396 248 404 268 398 288 C392 306 372 316 350 314 C326 312 306 300 292 286 ' +
      'C274 270 258 268 244 274 C216 286 184 280 158 268 C128 254 100 234 74 200 Z"/>' +
      '<clipPath id="' + clip + '"><use href="#' + mass + '"/></clipPath>' +
      '</defs>' +
      '<g clip-path="url(#' + clip + ')">' +
      '<use href="#' + mass + '" fill="url(#' + body + ')"/>' +
      '<g fill="none" stroke="url(#' + ridge + ')" stroke-linecap="round" ' +
      'filter="drop-shadow(0 2.2px 2.2px rgba(47,93,80,.32))">' +
      '<path stroke-width="22" d="M100 130 C112 96 140 76 176 66"/>' +
      '<path stroke-width="20" d="M170 62 C212 54 256 58 290 72"/>' +
      '<path stroke-width="20" d="M294 80 C324 94 350 116 364 144"/>' +
      '<path stroke-width="18" d="M374 162 C384 184 386 206 378 226"/>' +
      '<path stroke-width="20" d="M78 168 C88 142 104 122 128 108"/>' +
      '<path stroke-width="18" d="M74 204 C82 178 96 158 118 142"/>' +
      '<path stroke-width="16" d="M104 108 C116 92 132 82 152 76"/>' +
      '<path stroke-width="20" d="M108 238 C134 208 170 188 210 180"/>' +
      '<path stroke-width="20" d="M146 264 C176 238 214 222 252 216"/>' +
      '<path stroke-width="18" d="M190 282 C218 266 250 256 282 254"/>' +
      '<path stroke-width="18" d="M100 244 C124 226 150 212 180 204"/>' +
      '<path stroke-width="16" d="M120 262 C142 250 166 240 192 234"/>' +
      '<path stroke-width="18" d="M208 214 C232 198 260 190 288 190"/>' +
      '<path stroke-width="17" d="M226 242 C250 228 278 220 306 220"/>' +
      '<path stroke-width="19" d="M200 112 C236 98 276 96 308 104"/>' +
      '<path stroke-width="19" d="M224 142 C260 128 298 128 328 140"/>' +
      '<path stroke-width="18" d="M246 172 C280 160 316 162 344 176"/>' +
      '<path stroke-width="18" d="M264 202 C296 192 330 194 356 208"/>' +
      '<path stroke-width="17" d="M280 232 C308 224 338 226 360 240"/>' +
      '<path stroke-width="15" d="M132 152 C126 176 126 198 134 218"/>' +
      '<path stroke-width="14" d="M180 94 C172 118 170 142 178 164"/>' +
      '<path stroke-width="14" d="M270 72 C264 94 264 114 272 134"/>' +
      '<path stroke-width="13" d="M338 118 C332 140 332 160 340 180"/>' +
      '<path stroke-width="14" d="M80 226 C110 240 146 250 186 252"/>' +
      '<path stroke-width="10" d="M306 274 C328 266 352 268 370 280"/>' +
      '<path stroke-width="10" d="M302 292 C324 284 352 286 370 298"/>' +
      '<path stroke-width="9" d="M308 308 C328 302 348 304 362 312"/>' +
      '</g>' +
      '<g fill="none" stroke-linecap="round">' +
      '<path d="M300 262 C316 258 330 260 342 268" stroke="#a8bab1" stroke-width="4" opacity=".5"/>' +
      '<path d="M300 263.5 C316 259.5 330 261.5 342 269.5" stroke="#ffffff" stroke-width="1.6" opacity=".85"/>' +
      '</g>' +
      '<g filter="blur(4px)" opacity=".95">' +
      '<ellipse cx="146" cy="98" rx="58" ry="18" transform="rotate(-24 146 98)" fill="#ffffff"/>' +
      '<ellipse cx="244" cy="78" rx="38" ry="10" transform="rotate(-12 244 78)" fill="#ffffff" opacity=".85"/>' +
      '</g>' +
      '<rect width="440" height="360" fill="url(#' + shade + ')"/>' +
      '<rect width="440" height="360" fill="url(#' + gloss + ')"/>' +
      '</g>' +
      '<use href="#' + mass + '" fill="none" stroke="#ffffff" stroke-width="2.2" opacity=".95"/>' +
      '</svg>';
  }

  function playIntro(done, force) {
    var d = S.get();
    if (!force && (d.settings.intro === false || reduceMotion)) { if (done) done(); return; }
    if (reduceMotion) { if (done) done(); return; }

    function showSplash() {
      introUp = true;

      var el = document.createElement('div');
      el.className = 'intro';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML =
        '<div class="intro-inner">' +
        '<div class="intro-stack">' +
        '<div class="intro-word"><span><i>SECOND BRAIN</i></span></div>' +
        '<div class="art intro-art" data-brain-host="intro">' +
        '<div class="art-fallback" aria-hidden="true"></div></div>' +
        '</div>' +
        '<div class="intro-tag">Rewrite Minds</div>' +
        '<div class="intro-bar"><i></i></div>' +
        '</div>';

      document.body.appendChild(el);
      document.body.classList.add('introing');

      var introInstance = null;
      if (window.Brain3D) {
        introInstance = { detach: function () { window.Brain3D.detach(); } };
        window.Brain3D.attach(document.querySelector('.intro-art[data-brain-host]'), { mode: 'intro' });
      }

      var finished = false;
      var timer = null;
      var openedAt = Date.now();

      function finish() {
        if (finished) return;
        finished = true;
        if (introInstance && introInstance.destroy) {
          introInstance.destroy();
          introInstance = null;
        }
        if (timer) clearTimeout(timer);
        introUp = false;
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerdown', onPointer, true);
        document.body.classList.remove('introing');
        el.classList.add('out');
        setTimeout(function () {
          if (el.parentNode) el.remove();
        }, 300);
        if (done) done();
      }
      function onKey(e) {
        // Ignore modifier-only presses so Cmd+K etc. don't count as a skip.
        if (e.key === 'Meta' || e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        finish();
      }
      function onPointer(e) {
        if (Date.now() - openedAt < 350) return;
        if (e.target && (e.target.closest('.intro-art') || e.target.closest('#intro-brain-canvas') || e.target.closest('.art'))) return;
        finish();
      }

      document.addEventListener('keydown', onKey, true);
      document.addEventListener('pointerdown', onPointer, true);
      timer = setTimeout(finish, 5000);
    }

    // The splash does not wait for the 3D engine: the type is the moment, and
    // the chrome fades in on top whenever the model finishes parsing.
    showSplash();
  }

  /* ------------------------------------------------------------ boot */

  function boot() {
    var d = S.init();
    storageBlocked = !S.storageAvailable();
    applyTheme(d.settings.theme);

    // Honour deep links: #inbox, #note/<id>, #project/<id>
    var h = location.hash.replace('#', '');
    if (h) {
      var parts = h.split('/');
      if (parts[0] && TITLES[parts[0]]) {
        route.view = parts[0];
        route.id = parts[1] || null;
      }
    }

    app.dataset.sidebar = 'closed';
    render();

    playIntro(function () {
      if (!d.onboarded) openOnboarding();
    });

    if (!S.storageAvailable()) {
      setTimeout(function () {
        toast('This browser is blocking local storage. Export a backup before closing.', 'err', 7000);
      }, 900);
    }

    // Service workers need https. Skip localhost so development is never cache-trapped.
    var isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !isLocalHost) {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        if (reg) reg.update();
      }).catch(function () { /* offline-only use is fine */ });
    }

    // Keep the URL hash in sync so back/forward behaves sanely when hosted.
    window.addEventListener('hashchange', function () {
      var h = location.hash.replace('#', '');
      if (!h) return;
      var parts = h.split('/');
      if (parts[0] && TITLES[parts[0]]) {
        route.view = parts[0];
        route.id = parts[1] || null;
        render();
      }
    });
  }

  /* Let the command palette reuse the app's real theme pipeline instead of
     toggling an attribute that the stylesheet does not key off. */
  window.RM = window.RM || {};
  window.RM.ui = { applyTheme: applyTheme, applyAccent: applyAccent, render: render, go: go };

  boot();

})();
