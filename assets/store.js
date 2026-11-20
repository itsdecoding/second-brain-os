/* Second Brain OS — data layer
   Everything lives in localStorage under one namespaced key.
   No network calls, ever. Export/import is the safety net. */
(function () {
  'use strict';

  var KEY = 'rm.secondbrain.v1';
  var VERSION = 1;

  /* ------------------------------------------------------------ utils */

  function uid() {
    return (
      Date.now().toString(36).slice(-6) +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function todayStr(d) {
    var x = d ? new Date(d) : new Date();
    var m = String(x.getMonth() + 1).padStart(2, '0');
    var day = String(x.getDate()).padStart(2, '0');
    return x.getFullYear() + '-' + m + '-' + day;
  }

  function parseDate(s) {
    if (!s) return null;
    var p = String(s).split('-');
    if (p.length !== 3) return null;
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function daysBetween(a, b) {
    var ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
  }

  function relDay(s) {
    var d = parseDate(s);
    if (!d) return '';
    var diff = daysBetween(todayStr(), s);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff < -1 && diff > -7) return -(diff) + 'd overdue';
    if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function fmtDate(s) {
    var d = parseDate(s);
    if (!d) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function fmtWhen(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.round(hrs / 24);
    if (days < 8) return days + 'd ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------ shape */

  function blank() {
    return {
      version: VERSION,
      createdAt: Date.now(),
      onboarded: false,
      settings: {
        density: 'comfortable',
        accent: '#2f5d50',
        theme: 'system',
        showCompleted: false,
        name: '',
        intro: true
      },
      streak: { current: 0, best: 0, last: null },
      lastReview: null,
      tasks: [],
      projects: [],
      notes: [],
      inbox: [],
      journal: [],
      reviews: []
    };
  }

  var AREAS = [
    'Work', 'Business', 'Health', 'Learning',
    'Money', 'Home', 'Relationships', 'Personal'
  ];

  /* Sample content so the first open is never an empty void.
     Clearly labelled in onboarding: "Start with examples" vs "Start empty". */
  function sample() {
    var d = blank();
    var t = todayStr();
    var tm = todayStr(Date.now() + 86400000);

    d.onboarded = true;
    d.projects = [
      { id: 'p1', name: 'Launch Second Brain OS', area: 'Business', status: 'active',
        outcome: 'Product live on Gumroad with 3 variants', deadline: todayStr(Date.now() + 7 * 86400000), createdAt: Date.now() },
      { id: 'p2', name: 'Rebuild morning routine', area: 'Health', status: 'active',
        outcome: 'Seven consecutive days of the 20-minute block', deadline: null, createdAt: Date.now() },
      { id: 'p3', name: 'Q4 content system', area: 'Work', status: 'active',
        outcome: '30 posts scheduled from one idea bank', deadline: tm, createdAt: Date.now() }
    ];

    d.tasks = [
      { id: 't1', title: 'Write the product description for Second Brain OS', done: false, due: t, priority: 1, projectId: 'p1', area: 'Business', notes: '', createdAt: Date.now() },
      { id: 't2', title: 'Record a 40-second walkthrough for Threads', done: false, due: t, priority: 2, projectId: 'p1', area: 'Business', notes: '', createdAt: Date.now() },
      { id: 't3', title: 'Outline the three bundle tiers', done: true, due: todayStr(Date.now() - 86400000), priority: 2, projectId: 'p1', area: 'Business', notes: '', createdAt: Date.now(), completedAt: Date.now() },
      { id: 't4', title: 'Morning block: walk + no phone for 20 min', done: false, due: t, priority: 3, projectId: 'p2', area: 'Health', notes: '', createdAt: Date.now() },
      { id: 't5', title: 'Collect 20 raw ideas into the inbox', done: false, due: null, priority: 3, projectId: 'p3', area: 'Work', notes: '', createdAt: Date.now() }
    ];

    d.notes = [
      { id: 'n1', title: 'How this system works', tags: ['start-here'], pinned: true, createdAt: Date.now(), updatedAt: Date.now(),
        body: 'One place for everything that enters your head.\n\n1. Capture anything in the bar at the top.\n2. Every morning, empty the inbox into tasks, projects or notes.\n3. Work from Today, not from the inbox.\n4. Every seven days, run the review.\n\nThat is the whole system. The software just makes it hard to skip.' },
      { id: 'n2', title: 'Focus rule of the week', tags: ['focus'], pinned: false, createdAt: Date.now(), updatedAt: Date.now(),
        body: 'If it is not on the calendar, it is a wish.\n\nPick one outcome per day. Everything else is optional by default.' }
    ];

    d.inbox = [
      { id: 'i1', text: 'Idea: a "one-page life audit" free lead magnet', createdAt: Date.now() - 3600000 },
      { id: 'i2', text: 'Check if the bundle should include the cookbook', createdAt: Date.now() - 7200000 }
    ];

    d.journal = [
      { id: 'j1', date: todayStr(Date.now() - 86400000), mood: 'good', energy: 3,
        body: 'Better day than expected. The inbox-to-task rule is doing most of the work — less time deciding what to do next.', createdAt: Date.now() }
    ];

    d.streak = { current: 3, best: 9, last: t };
    return d;
  }

  /* ------------------------------------------------------------ store */

  var state = null;
  var listeners = [];
  var storageOK = true;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return migrate(parsed);
    } catch (e) {
      storageOK = false;
      return null;
    }
  }

  function migrate(data) {
    var base = blank();
    Object.keys(base).forEach(function (k) {
      if (!(k in data)) data[k] = base[k];
    });
    ['tasks', 'projects', 'notes', 'inbox', 'journal', 'reviews'].forEach(function (k) {
      if (!Array.isArray(data[k])) data[k] = [];
    });
    data.settings = Object.assign({}, base.settings, data.settings || {});
    if (!data.settings.theme || ['system', 'light', 'dark'].indexOf(data.settings.theme) === -1) {
      data.settings.theme = 'system';
    }
    if (!/^#[a-f\d]{6}$/i.test(data.settings.accent || '')) {
      data.settings.accent = base.settings.accent;
    }
    data.streak = Object.assign({}, base.streak, data.streak || {});
    data.version = VERSION;
    return data;
  }

  function init() {
    state = read();
    if (!state) {
      state = blank();
      state.onboarded = false;
    }
    return state;
  }

  function writeNow() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      storageOK = false;
      emit('storage-error');
      return false;
    }
  }

  /* Structural changes persist immediately. Text typing is debounced by the
     UI layer (see saveSoon in app.js) so we are not writing on every keystroke. */
  function save() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    writeNow();
  }

  var flushTimer = null;

  /* Batch several writes in the same tick (bulk imports, resets). */
  function saveSoon() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(function () {
      flushTimer = null;
      writeNow();
    }, 120);
  }

  /* Last line of defence: never lose data when the tab is closed or hidden. */
  function flush() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    writeNow();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
  }

  function get() { return state; }

  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  function emit(evt) { listeners.forEach(function (f) { try { f(evt); } catch (e) { console.error(e); } }); }

  function commit(mutator, evt) {
    if (typeof mutator === 'function') mutator(state);
    save();
    emit(evt || 'change');
    return state;
  }

  /* ------------------------------------------------------------ streak */

  function touchStreak() {
    var t = todayStr();
    var s = state.streak;
    if (s.last === t) return;
    if (s.last && daysBetween(s.last, t) === 1) s.current += 1;
    else s.current = 1;
    s.best = Math.max(s.best || 0, s.current);
    s.last = t;
  }

  /* ------------------------------------------------------------ io */

  function exportData() {
    var payload = {
      app: 'Second Brain OS',
      brand: 'Rewrite Minds',
      exportedAt: new Date().toISOString(),
      data: state
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'second-brain-backup-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function importData(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        var data = parsed && parsed.data ? parsed.data : parsed;
        if (!data || !Array.isArray(data.tasks)) throw new Error('Not a Second Brain backup');
        state = migrate(data);
        save();
        emit('import');
        cb(null, state);
      } catch (e) {
        cb(e);
      }
    };
    reader.onerror = function () { cb(new Error('Could not read that file')); };
    reader.readAsText(file);
  }

  function reset() {
    state = blank();
    save();
    emit('reset');
    return state;
  }

  function loadSample() {
    state = sample();
    save();
    emit('reset');
    return state;
  }

  function storageAvailable() {
    try {
      localStorage.setItem('__rm_test__', '1');
      localStorage.removeItem('__rm_test__');
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ------------------------------------------------------------ selectors */

  function openTasks() { return state.tasks.filter(function (t) { return !t.done; }); }
  function tasksDueToday() {
    var t = todayStr();
    return openTasks().filter(function (x) { return x.due && x.due <= t; });
  }
  function tasksThisWeek() {
    var t = todayStr();
    var end = todayStr(Date.now() + 7 * 86400000);
    return openTasks().filter(function (x) { return x.due && x.due > t && x.due <= end; });
  }
  function tasksFor(projectId) {
    return state.tasks.filter(function (t) { return t.projectId === projectId; });
  }
  function projectProgress(projectId) {
    var all = tasksFor(projectId);
    if (!all.length) return 0;
    return Math.round((all.filter(function (t) { return t.done; }).length / all.length) * 100);
  }
  function reviewDue() {
    if (!state.lastReview) return true;
    return daysBetween(todayStr(state.lastReview), todayStr()) >= 7;
  }

  window.RM = {
    VERSION: VERSION,
    KEY: KEY,
    AREAS: AREAS,
    uid: uid,
    todayStr: todayStr,
    parseDate: parseDate,
    daysBetween: daysBetween,
    relDay: relDay,
    fmtDate: fmtDate,
    fmtWhen: fmtWhen,
    debounce: debounce,
    esc: esc,
    sample: sample,
    store: {
      init: init, get: get, commit: commit, save: save, saveSoon: saveSoon, flush: flush,
      subscribe: subscribe, exportData: exportData, importData: importData, reset: reset,
      loadSample: loadSample, storageAvailable: storageAvailable, touchStreak: touchStreak
    },
    sel: {
      openTasks: openTasks, tasksDueToday: tasksDueToday, tasksThisWeek: tasksThisWeek,
      tasksFor: tasksFor, projectProgress: projectProgress, reviewDue: reviewDue
    }
  };
})();
