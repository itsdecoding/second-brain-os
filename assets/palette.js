/* Second Brain OS — Command Palette (Cmd+K / Ctrl+K)
   Ultra-responsive overlay for navigation, quick actions, and full-text search. */
(function () {
  'use strict';

  var isOpen = false;
  var selectedIndex = 0;
  var filteredItems = [];

  /* ------------------------------------------------------------ icons */
  var SVG_ICONS = {
    brain: '<path d="M9.5 2A4.5 4.5 0 0 0 5 6.5a4.4 4.4 0 0 0 .5 2 4.5 4.5 0 0 0-1.5 3.5 4.4 4.4 0 0 0 1 2.8A4.5 4.5 0 0 0 7 19.5h2.5V2z"/><path d="M14.5 2A4.5 4.5 0 0 1 19 6.5a4.4 4.4 0 0 1-.5 2 4.5 4.5 0 0 1 1.5 3.5 4.4 4.4 0 0 1-1 2.8A4.5 4.5 0 0 1 17 19.5h-2.5V2z"/><path d="M12 4v16"/>',
    search: '<path d="M21 21l-4.4-4.4"/><circle cx="11" cy="11" r="7.5"/>',
    home: '<path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    checkSquare: '<path d="M9 11.5l2.5 2.5L20 5.5"/><path d="M20 12.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 4h13l3.5 8v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7L11 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/><path d="M8 7h8M8 11h8"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3v5h-5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7.9V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-.9l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 .9-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.6V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7.9l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 .9 2.7H21a2 2 0 1 1 0 4h-.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 21h16"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };

  function svg(name, cls) {
    var p = SVG_ICONS[name] || '';
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + p + '</svg>';
  }

  function esc(s) {
    if (window.RM && typeof window.RM.esc === 'function') return window.RM.esc(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------ toast */
  function showToast(msg, kind, ms) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 240);
    }, ms || 2200);
  }

  /* ------------------------------------------------------------ actions */
  function navigateTo(view, id) {
    closePalette();
    // Use the app router directly. Writing location.hash here meant file://
    // users could reload into a view they had already navigated away from.
    if (window.RM && window.RM.ui && typeof window.RM.ui.go === 'function') {
      window.RM.ui.go(view, id);
      return;
    }
    var hash = '#' + view + (id ? '/' + id : '');
    if (location.hash === hash) {
      var trigger = document.createElement('button');
      trigger.style.display = 'none';
      if (view === 'project') {
        trigger.dataset.act = 'open-project';
        trigger.dataset.id = id;
      } else if (view === 'note') {
        trigger.dataset.act = 'open-note';
        trigger.dataset.id = id;
      } else {
        trigger.dataset.act = 'go';
        trigger.dataset.view = view;
      }
      document.body.appendChild(trigger);
      trigger.click();
      trigger.remove();
    } else {
      location.hash = hash;
    }
  }

  function openNewTask() {
    closePalette();
    setTimeout(function () {
      var trigger = document.createElement('button');
      trigger.style.display = 'none';
      trigger.dataset.act = 'new-task';
      document.body.appendChild(trigger);
      trigger.click();
      trigger.remove();
    }, 50);
  }

  function openEditTask(taskId) {
    closePalette();
    setTimeout(function () {
      var trigger = document.createElement('button');
      trigger.style.display = 'none';
      trigger.dataset.act = 'edit-task';
      trigger.dataset.id = taskId;
      document.body.appendChild(trigger);
      trigger.click();
      trigger.remove();
    }, 50);
  }

  function quickCapture() {
    closePalette();
    setTimeout(function () {
      var cap = document.querySelector('.capture input');
      if (cap) {
        cap.focus();
        cap.select();
      } else {
        navigateTo('dashboard');
        setTimeout(function () {
          var cap2 = document.querySelector('.capture input');
          if (cap2) { cap2.focus(); cap2.select(); }
        }, 100);
      }
    }, 60);
  }

  function startReview() {
    closePalette();
    navigateTo('review');
  }

  function toggleTheme() {
    closePalette();
    var cur = document.documentElement.getAttribute('data-theme');
    var isDark = false;
    if (cur === 'dark') {
      isDark = true;
    } else if (cur === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    var nextTheme = isDark ? 'light' : 'dark';

    if (window.RM && window.RM.store) {
      window.RM.store.commit(function (d) {
        d.settings = d.settings || {};
        d.settings.theme = nextTheme;
      });
    }

    // Go through the app's pipeline so .theme-dark, --accent and the meta
    // theme-color all move with the theme. Setting data-theme alone left the
    // dark stylesheet (keyed off .theme-dark) on the old theme.
    if (window.RM && window.RM.ui && window.RM.ui.applyTheme) {
      window.RM.ui.applyTheme(nextTheme);
      window.RM.ui.render();
    } else {
      document.documentElement.setAttribute('data-theme', nextTheme);
      document.documentElement.classList.toggle('theme-dark', nextTheme === 'dark');
    }

    var themeSelect = document.querySelector('select[data-act="set-theme"], select[name="theme"]');
    if (themeSelect) themeSelect.value = nextTheme;

    showToast('Theme switched to ' + (nextTheme === 'dark' ? 'Dark (Night)' : 'Light (Paper)'), 'ok');
  }

  function exportBackup() {
    closePalette();
    if (window.RM && window.RM.store && typeof window.RM.store.exportData === 'function') {
      window.RM.store.exportData();
      showToast('Backup downloaded', 'ok');
    } else {
      showToast('Export failed: store not ready', 'err');
    }
  }

  /* ------------------------------------------------------------ data registry */
  function getRegistry() {
    var S = window.RM && window.RM.store ? window.RM.store : null;
    var d = S ? S.get() : { tasks: [], projects: [], notes: [] };

    var navItems = [
      { id: 'nav-dashboard', category: 'Navigation', title: 'Today', subtitle: 'One screen. Everything that matters right now.', badge: 'View', shortcut: '#dashboard', icon: 'home', keywords: 'today dashboard home day daily', run: function () { navigateTo('dashboard'); } },
      { id: 'nav-tasks', category: 'Navigation', title: 'Tasks', subtitle: 'Grouped by when it matters.', badge: 'View', shortcut: '#tasks', icon: 'checkSquare', keywords: 'tasks todo action items list', run: function () { navigateTo('tasks'); } },
      { id: 'nav-inbox', category: 'Navigation', title: 'Inbox', subtitle: 'Capture first. Decide later.', badge: 'View', shortcut: '#inbox', icon: 'inbox', keywords: 'inbox capture raw dump triage collect', run: function () { navigateTo('inbox'); } },
      { id: 'nav-projects', category: 'Navigation', title: 'Projects', subtitle: 'Outcomes with a finish line.', badge: 'View', shortcut: '#projects', icon: 'folder', keywords: 'projects outcomes goals milestones', run: function () { navigateTo('projects'); } },
      { id: 'nav-notes', category: 'Navigation', title: 'Notes', subtitle: 'Thinking that outlives the moment.', badge: 'View', shortcut: '#notes', icon: 'file', keywords: 'notes docs ideas reference knowledge thoughts', run: function () { navigateTo('notes'); } },
      { id: 'nav-journal', category: 'Navigation', title: 'Journal', subtitle: 'A short daily record.', badge: 'View', shortcut: '#journal', icon: 'book', keywords: 'journal diary log reflection mood daily', run: function () { navigateTo('journal'); } },
      { id: 'nav-review', category: 'Navigation', title: 'Weekly Review', subtitle: 'Five questions, once a week.', badge: 'View', shortcut: '#review', icon: 'refresh', keywords: 'review weekly reflection questions alignment', run: function () { navigateTo('review'); } },
      { id: 'nav-settings', category: 'Navigation', title: 'Settings', subtitle: 'Your data, your call.', badge: 'View', shortcut: '#settings', icon: 'settings', keywords: 'settings preferences theme backup configuration export import', run: function () { navigateTo('settings'); } }
    ];

    var actionItems = [
      { id: 'act-new-task', category: 'Quick Actions', title: '+ New Task', subtitle: 'Create a new task with due date & priority', badge: 'Action', shortcut: 'N', icon: 'plus', keywords: 'new task add task create task todo item', run: function () { openNewTask(); } },
      { id: 'act-quick-capture', category: 'Quick Actions', title: 'Quick Capture', subtitle: 'Instantly drop an unprocessed idea into Inbox', badge: 'Action', shortcut: 'C', icon: 'spark', keywords: 'quick capture inbox record idea memo draft', run: function () { quickCapture(); } },
      { id: 'act-start-review', category: 'Quick Actions', title: 'Start Review', subtitle: 'Run the weekly clarity reflection', badge: 'Action', shortcut: 'R', icon: 'refresh', keywords: 'start review weekly clarity alignment reflection', run: function () { startReview(); } },
      { id: 'act-toggle-theme', category: 'Quick Actions', title: 'Toggle Theme', subtitle: 'Switch between light and dark appearance', badge: 'Action', shortcut: 'T', icon: 'moon', keywords: 'toggle theme appearance dark light mode night', run: function () { toggleTheme(); } },
      { id: 'act-export-backup', category: 'Quick Actions', title: 'Export Backup', subtitle: 'Download complete offline database as JSON', badge: 'Action', shortcut: 'E', icon: 'download', keywords: 'export backup download save json database offline', run: function () { exportBackup(); } }
    ];

    var taskItems = (d.tasks || []).map(function (t) {
      var proj = t.projectId ? (d.projects || []).find(function (p) { return p.id === t.projectId; }) : null;
      var subParts = [];
      if (proj) subParts.push(proj.name);
      if (t.due) subParts.push(window.RM && window.RM.relDay ? window.RM.relDay(t.due) : t.due);
      if (t.done) subParts.push('Completed');
      else if (t.priority === 1) subParts.push('High Priority');
      else if (t.priority === 2) subParts.push('Medium Priority');

      var badge = t.done ? 'Done' : (t.priority === 1 ? 'High' : (t.due ? 'Due' : 'Task'));

      return {
        id: 'task-' + t.id,
        category: 'Tasks',
        title: t.title,
        subtitle: subParts.join(' · ') || (t.notes ? t.notes.slice(0, 50) : 'Task'),
        badge: badge,
        shortcut: '',
        icon: t.done ? 'check' : 'checkSquare',
        keywords: t.title + ' ' + (t.notes || '') + ' ' + (proj ? proj.name : '') + ' task',
        run: function () { openEditTask(t.id); }
      };
    });

    var projectItems = (d.projects || []).map(function (p) {
      var sub = (p.area ? p.area + ' · ' : '') + (p.outcome || (p.deadline ? 'Due ' + (window.RM && window.RM.relDay ? window.RM.relDay(p.deadline) : p.deadline) : 'Project'));
      return {
        id: 'proj-' + p.id,
        category: 'Projects',
        title: p.name,
        subtitle: sub,
        badge: p.status === 'done' ? 'Done' : (p.area || 'Project'),
        shortcut: '',
        icon: 'folder',
        keywords: p.name + ' ' + (p.outcome || '') + ' ' + (p.area || '') + ' project',
        run: function () { navigateTo('project', p.id); }
      };
    });

    var noteItems = (d.notes || []).map(function (n) {
      var tags = (n.tags && n.tags.length) ? '#' + n.tags.join(' #') + ' · ' : '';
      var bodyPreview = (n.body || '').replace(/\n+/g, ' ').slice(0, 65);
      return {
        id: 'note-' + n.id,
        category: 'Notes',
        title: n.title || 'Untitled note',
        subtitle: tags + (bodyPreview || 'Empty note'),
        badge: n.pinned ? '📌 Pinned' : 'Note',
        shortcut: '',
        icon: 'file',
        keywords: (n.title || '') + ' ' + (n.body || '') + ' ' + (n.tags ? n.tags.join(' ') : '') + ' note',
        run: function () { navigateTo('note', n.id); }
      };
    });

    return {
      nav: navItems,
      actions: actionItems,
      tasks: taskItems,
      projects: projectItems,
      notes: noteItems
    };
  }

  /* ------------------------------------------------------------ search logic */
  function searchItems(query) {
    var reg = getRegistry();
    var q = (query || '').trim().toLowerCase();

    if (!q) {
      // Empty query default view: Actions, Navigation, followed by open tasks and active projects/notes
      var openTasks = reg.tasks.filter(function (t) { return t.badge !== 'Done'; }).slice(0, 4);
      var activeProjects = reg.projects.filter(function (p) { return p.badge !== 'Done'; }).slice(0, 3);
      var recentNotes = reg.notes.slice(0, 3);
      return [].concat(reg.actions, reg.nav, openTasks, activeProjects, recentNotes);
    }

    var tokens = q.split(/\s+/).filter(Boolean);
    function matches(item) {
      var fullStr = (item.title + ' ' + item.subtitle + ' ' + item.keywords + ' ' + item.category + ' ' + item.badge).toLowerCase();
      for (var i = 0; i < tokens.length; i++) {
        if (fullStr.indexOf(tokens[i]) === -1) return false;
      }
      return true;
    }

    var resActions = reg.actions.filter(matches);
    var resNav = reg.nav.filter(matches);
    var resTasks = reg.tasks.filter(matches);
    var resProjects = reg.projects.filter(matches);
    var resNotes = reg.notes.filter(matches);

    return [].concat(resActions, resNav, resTasks, resProjects, resNotes);
  }

  /* ------------------------------------------------------------ styles */
  function injectStyles() {
    if (document.getElementById('cmd-palette-styles')) return;
    var style = document.createElement('style');
    style.id = 'cmd-palette-styles';
    style.textContent = [
      '.cmd-palette-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(18, 18, 16, 0.48); backdrop-filter: blur(12px) saturate(140%); -webkit-backdrop-filter: blur(12px) saturate(140%); display: flex; justify-content: center; align-items: flex-start; padding: clamp(40px, 12vh, 100px) 16px 20px; animation: cmdFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1); overscroll-behavior: contain; }',
      '.cmd-palette-backdrop.closing { animation: cmdFadeOut 0.14s cubic-bezier(0.16, 1, 0.3, 1) forwards; }',
      '.cmd-palette-modal { width: 100%; max-width: 580px; background: var(--surface, #ffffff); color: var(--text, #37352f); border: 1px solid var(--border-strong, #dcdcd7); border-radius: var(--r-lg, 14px); box-shadow: 0 24px 60px -12px rgba(20, 20, 18, 0.28), 0 0 0 1px rgba(20, 20, 18, 0.04); overflow: hidden; display: flex; flex-direction: column; animation: cmdSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1); max-height: 82vh; }',
      '.cmd-palette-modal.closing { animation: cmdSlideUp 0.14s cubic-bezier(0.16, 1, 0.3, 1) forwards; }',
      '.cmd-palette-header { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border, #e9e9e6); background: transparent; position: relative; }',
      '.cmd-palette-icon { width: 18px; height: 18px; color: var(--text-3, #6e6d68); flex-shrink: 0; }',
      '.cmd-palette-input { flex: 1; border: 0; outline: 0; background: transparent; font-size: 15.5px; font-weight: 450; color: var(--text, #37352f); font-family: inherit; margin: 0; padding: 0; }',
      '.cmd-palette-input::placeholder { color: var(--text-3, #6e6d68); }',
      '.cmd-palette-clear { border: 0; background: transparent; cursor: pointer; color: var(--text-3, #6e6d68); padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; opacity: 0.7; }',
      '.cmd-palette-clear:hover { opacity: 1; }',
      '.cmd-palette-close-badge { font-size: 10px; font-family: var(--mono, monospace); color: var(--text-3, #6e6d68); background: var(--surface-2, #f7f7f5); border: 1px solid var(--border, #e9e9e6); padding: 2px 6px; border-radius: 4px; line-height: 1.2; user-select: none; }',
      '.cmd-palette-list { max-height: min(52vh, 460px); overflow-y: auto; padding: 8px 6px; overscroll-behavior: contain; scroll-behavior: smooth; }',
      '.cmd-palette-group { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3, #6e6d68); padding: 8px 12px 4px; user-select: none; }',
      '.cmd-palette-item { display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 12px; border: 0; background: transparent; border-radius: var(--r-sm, 7px); cursor: pointer; text-align: left; font-size: 13.5px; color: var(--text-2, #5b5a55); transition: background var(--dur-1, 110ms) var(--ease, ease), color var(--dur-1, 110ms) var(--ease, ease), transform var(--dur-1, 110ms) var(--ease-out, ease-out); user-select: none; }',
      '.cmd-palette-item:hover, .cmd-palette-item.is-selected, .cmd-palette-item.sel { background: var(--accent-soft, #e9f1ed); color: var(--text, #37352f); }',
      '.cmd-palette-item.is-selected, .cmd-palette-item.sel { transform: translateX(2px); }',
      '.cmd-palette-item-icon { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--accent, #2f5d50); }',
      '.cmd-palette-item-content { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 1px; }',
      '.cmd-palette-item-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: inherit; }',
      '.cmd-palette-item-sub { font-size: 11.5px; color: var(--text-3, #6e6d68); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.cmd-palette-badge { font-size: 10.5px; font-weight: 500; padding: 2px 7px; border-radius: 999px; background: var(--surface-3, #f1f1ee); color: var(--text-3, #6e6d68); margin-left: auto; flex-shrink: 0; }',
      '.cmd-palette-shortcut { font-size: 10.5px; font-family: var(--mono, monospace); color: var(--text-3, #6e6d68); background: var(--surface-2, #f7f7f5); border: 1px solid var(--border, #e9e9e6); padding: 2px 5px; border-radius: 4px; line-height: 1; margin-left: 6px; flex-shrink: 0; }',
      '.cmd-palette-empty { padding: 36px 16px; text-align: center; color: var(--text-3, #6e6d68); font-size: 13.5px; }',
      '.cmd-palette-footer { display: flex; align-items: center; justify-content: flex-end; gap: 14px; padding: 8px 16px; border-top: 1px solid var(--border, #e9e9e6); font-size: 11px; color: var(--text-3, #6e6d68); background: var(--surface-2, #f7f7f5); user-select: none; }',
      '.cmd-palette-footer kbd { font-family: var(--mono, monospace); background: var(--surface, #ffffff); border: 1px solid var(--border, #e9e9e6); padding: 1px 4px; border-radius: 3px; font-size: 10px; margin-right: 3px; }',
      '@keyframes cmdFadeIn { from { opacity: 0; } to { opacity: 1; } }',
      '@keyframes cmdFadeOut { to { opacity: 0; } }',
      '@keyframes cmdSlideDown { from { opacity: 0; transform: translateY(-12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }',
      '@keyframes cmdSlideUp { to { opacity: 0; transform: translateY(-10px) scale(0.98); } }',
      '@media (max-width: 640px) {',
      '  .cmd-palette-backdrop { align-items: flex-end; padding: 0; }',
      '  .cmd-palette-modal { max-width: none; border-radius: 20px 20px 0 0; max-height: 88vh; animation: cmdSheetUp 0.22s var(--ease-out, ease-out); }',
      '  .cmd-palette-modal.closing { animation: cmdSheetDown 0.18s var(--ease, ease) forwards; }',
      '  .cmd-palette-footer { padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)); }',
      '}',
      '@keyframes cmdSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }',
      '@keyframes cmdSheetDown { to { transform: translateY(100%); } }'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------ modal management */
  function openPalette(initialQuery) {
    injectStyles();
    isOpen = true;
    selectedIndex = 0;

    var existing = document.getElementById('cmd-palette-root');
    if (existing) existing.remove();

    var root = document.createElement('div');
    root.id = 'cmd-palette-root';
    root.className = 'cmd-palette-backdrop overlay';
    root.setAttribute('data-overlay', 'cmd-palette');

    root.innerHTML =
      '<div class="cmd-palette-modal modal palette" role="dialog" aria-modal="true" aria-label="Command Palette">' +
        '<div class="cmd-palette-header">' +
          svg('search', 'cmd-palette-icon') +
          '<input class="cmd-palette-input palette-input" id="cmd-palette-input" type="text" placeholder="Type a command, or search tasks, projects, notes…" autocomplete="off" spellcheck="false" aria-label="Command palette">' +
          '<button class="cmd-palette-clear" id="cmd-palette-clear" aria-label="Clear search" style="display:none">' + svg('x') + '</button>' +
          '<kbd class="cmd-palette-close-badge">ESC</kbd>' +
        '</div>' +
        '<div class="cmd-palette-list palette-list" id="cmd-palette-list" role="listbox"></div>' +
        '<div class="cmd-palette-footer">' +
          '<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>' +
          '<span><kbd>↵</kbd> select</span>' +
          '<span><kbd>esc</kbd> close</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(root);

    var input = document.getElementById('cmd-palette-input');
    var list = document.getElementById('cmd-palette-list');
    var clearBtn = document.getElementById('cmd-palette-clear');

    if (initialQuery) {
      input.value = initialQuery;
      clearBtn.style.display = 'flex';
    }

    function renderList() {
      var query = input.value.trim();
      clearBtn.style.display = query ? 'flex' : 'none';
      filteredItems = searchItems(query);

      if (!filteredItems.length) {
        list.innerHTML = '<div class="cmd-palette-empty palette-empty">No results found for &ldquo;' + esc(query) + '&rdquo;</div>';
        return;
      }

      selectedIndex = Math.min(selectedIndex, filteredItems.length - 1);
      if (selectedIndex < 0) selectedIndex = 0;

      var currentCat = null;
      var html = '';

      for (var i = 0; i < filteredItems.length; i++) {
        var it = filteredItems[i];
        if (it.category !== currentCat) {
          currentCat = it.category;
          html += '<div class="cmd-palette-group">' + esc(currentCat) + '</div>';
        }

        var isSel = i === selectedIndex;
        html += '<button class="cmd-palette-item palette-item' + (isSel ? ' is-selected sel' : '') + '" data-idx="' + i + '" role="option" aria-selected="' + (isSel ? 'true' : 'false') + '">' +
          '<span class="cmd-palette-item-icon">' + svg(it.icon) + '</span>' +
          '<div class="cmd-palette-item-content">' +
            '<span class="cmd-palette-item-title">' + esc(it.title) + '</span>' +
            (it.subtitle ? '<span class="cmd-palette-item-sub">' + esc(it.subtitle) + '</span>' : '') +
          '</div>' +
          (it.badge ? '<span class="cmd-palette-badge pill">' + esc(it.badge) + '</span>' : '') +
          (it.shortcut ? '<span class="cmd-palette-shortcut hint">' + esc(it.shortcut) + '</span>' : '') +
        '</button>';
      }

      list.innerHTML = html;
      updateSelectionVisual(false);
    }

    function updateSelectionVisual(scroll) {
      var itemEls = list.querySelectorAll('.cmd-palette-item');
      for (var i = 0; i < itemEls.length; i++) {
        var el = itemEls[i];
        var idx = Number(el.dataset.idx);
        var isSel = idx === selectedIndex;
        el.classList.toggle('is-selected', isSel);
        el.classList.toggle('sel', isSel);
        el.setAttribute('aria-selected', isSel ? 'true' : 'false');
        if (isSel && scroll !== false) {
          el.scrollIntoView({ block: 'nearest' });
        }
      }
    }

    function executeIndex(idx) {
      var pick = filteredItems[idx];
      if (pick && typeof pick.run === 'function') {
        pick.run();
      }
    }

    // Input search events
    input.addEventListener('input', function () {
      selectedIndex = 0;
      renderList();
    });

    clearBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      input.value = '';
      selectedIndex = 0;
      renderList();
      input.focus();
    });

    // Keyboard navigation
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredItems.length) {
          selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
          updateSelectionVisual(true);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredItems.length) {
          selectedIndex = Math.max(selectedIndex - 1, 0);
          updateSelectionVisual(true);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (filteredItems.length) {
          if (e.shiftKey) {
            selectedIndex = Math.max(selectedIndex - 1, 0);
          } else {
            selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
          }
          updateSelectionVisual(true);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeIndex(selectedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
      }
    });

    // Item click / hover
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('.cmd-palette-item');
      if (!btn) return;
      var idx = Number(btn.dataset.idx);
      executeIndex(idx);
    });

    list.addEventListener('mousemove', function (e) {
      var btn = e.target.closest('.cmd-palette-item');
      if (!btn) return;
      var idx = Number(btn.dataset.idx);
      if (idx !== selectedIndex) {
        selectedIndex = idx;
        updateSelectionVisual(false);
      }
    });

    // Click outside / backdrop to close
    root.addEventListener('click', function (e) {
      if (e.target === root) {
        closePalette();
      }
    });

    renderList();

    setTimeout(function () {
      input.focus();
      input.select();
    }, 25);
  }

  function closePalette() {
    if (!isOpen) return;
    isOpen = false;
    var root = document.getElementById('cmd-palette-root');
    if (!root) return;

    var modal = root.querySelector('.cmd-palette-modal');
    root.classList.add('closing');
    if (modal) modal.classList.add('closing');

    setTimeout(function () {
      if (!isOpen && root.parentNode) {
        root.parentNode.removeChild(root);
      }
    }, 140);
  }

  function togglePalette() {
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }

  /* ------------------------------------------------------------ event bindings */

  // Global keydown: Cmd+K / Ctrl+K and / shortcut
  window.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      togglePalette();
      return;
    }

    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closePalette();
      return;
    }

    // '/' opens palette if not in form input
    if (e.key === '/' && !isOpen) {
      var tag = document.activeElement ? document.activeElement.tagName : '';
      var isEditable = document.activeElement && document.activeElement.isContentEditable;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && !isEditable) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openPalette();
      }
    }
  }, true); // Capture phase to preempt default app handlers

  // Intercept clicks on searchbar input, searchbar button, and palette trigger
  document.addEventListener('click', function (e) {
    var searchInput = e.target.closest('.searchbar input');
    var searchbar = e.target.closest('.searchbar');
    var paletteTrigger = e.target.closest('[data-act="palette"]');

    if (searchInput || searchbar || paletteTrigger) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openPalette();
      return;
    }
  }, true);

  // Intercept focusin on search input
  document.addEventListener('focusin', function (e) {
    if (e.target && (e.target.id === 'global-search' || e.target.closest('.searchbar input'))) {
      if (!isOpen) {
        e.target.blur();
        openPalette();
      }
    }
  });

  // Expose API on window.RM
  if (!window.RM) window.RM = {};
  window.RM.palette = {
    open: openPalette,
    close: closePalette,
    toggle: togglePalette
  };
  window.openPalette = openPalette;

})();
