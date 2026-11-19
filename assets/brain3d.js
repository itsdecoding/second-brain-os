/* Second Brain OS — 3D liquid chrome brain
   ---------------------------------------------------------------------------
   One WebGL context, one model, one render loop. The canvas is re-parented
   between three hosts (intro splash, onboarding poster, 3D view) instead of
   building a new renderer for each — that leak is what broke the second visit.

   Works from file:// : three.js is vendored locally and the GLB is embedded as
   base64 (see brain-data.js), because file:// blocks XHR and fetch.
   --------------------------------------------------------------------------- */
(function (global) {
  'use strict';

  var FOV = 35;
  var BASE_YAW = -1.57;
  var BASE_TILT = -0.06;
  var BASE_ROLL = 0.06;

  var canvas = null;
  var renderer = null;
  var scene = null;
  var camera = null;
  var lights = {};
  var envMap = null;
  var envKey = null;
  var brain = null;
  var halfWide = 1;
  var halfHigh = 1;
  var halfDeep = 1;
  var baseDist = 5;

  var ready = false;
  var booting = null;
  var host = null;
  var mode = 'poster';
  var raf = null;
  var lastTime = 0;
  var frameTick = 0;

  var spin = 0;
  var tilt = BASE_TILT;
  var zoom = 1;
  var dist = 5;

  var px = 0, py = 0;             // eased pointer, -1..1
  var tx = 0, ty = 0;             // pointer target

  var drag = null;
  var autoOrbit = true;
  var pulse = 0;
  var pulseId = null;
  var reduce = false;
  var mqReduce = null;

  /* ---------------------------------------------------------------- utils */

  function matchReduce() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function themeIsDark() {
    if (document.documentElement.classList.contains('theme-dark')) return true;
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return !!(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function decode(bytes) {
    var raw = global.atob(bytes);
    var len = raw.length;
    var out = new Uint8Array(len);
    for (var i = 0; i < len; i++) out[i] = raw.charCodeAt(i);
    return out.buffer;
  }

  /* ------------------------------------------------------- studio env map */

  function buildEnv() {
    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    var c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    var ctx = c.getContext('2d');
    var dark = themeIsDark();

    ctx.filter = 'none';

    // A chrome object mirrors its room. A mid-grey room makes grey plastic, so
    // the room is black with a few very bright sources - that is what produces
    // the black-and-white banding that reads as metal.
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, 1024, 512);

    var grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, 'rgba(32, 40, 55, .92)');
    grad.addColorStop(0.42, 'rgba(7, 10, 15, 0)');
    grad.addColorStop(0.58, 'rgba(7, 10, 15, 0)');
    grad.addColorStop(1.0, 'rgba(26, 32, 43, .82)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // key softbox - big, soft, upper left
    ctx.filter = 'blur(20px)';
    var key = ctx.createRadialGradient(300, 96, 8, 300, 96, 250);
    key.addColorStop(0, '#ffffff');
    key.addColorStop(0.42, 'rgba(255,255,255,.94)');
    key.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = key;
    ctx.beginPath();
    ctx.ellipse(300, 96, 252, 108, -0.12, 0, Math.PI * 2);
    ctx.fill();

    // peach/copper rim, right flank — the accent that ties it to the app
    var peach = ctx.createRadialGradient(820, 360, 20, 820, 360, 240);
    peach.addColorStop(0, '#ffaa88');
    peach.addColorStop(0.4, 'rgba(255,140,100,.9)');
    peach.addColorStop(0.8, 'rgba(255,100,70,.4)');
    peach.addColorStop(1, 'rgba(255,90,60,0)');
    ctx.fillStyle = peach;
    ctx.beginPath();
    ctx.ellipse(820, 360, 230, 120, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // tall window strip, right - the hard vertical reflection chrome needs
    var win = ctx.createLinearGradient(700, 0, 866, 0);
    win.addColorStop(0, 'rgba(255,255,255,0)');
    win.addColorStop(0.42, 'rgba(238,246,255,.96)');
    win.addColorStop(0.62, 'rgba(238,246,255,.92)');
    win.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = win;
    ctx.fillRect(700, 26, 166, 176);

    // cool bounce, lower left
    var cool = ctx.createRadialGradient(190, 400, 10, 190, 400, 210);
    cool.addColorStop(0, 'rgba(150, 176, 214, .55)');
    cool.addColorStop(1, 'rgba(150, 176, 214, 0)');
    ctx.fillStyle = cool;
    ctx.beginPath();
    ctx.ellipse(190, 400, 210, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // crisp horizon strip - the line that sells a mirror finish
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(110, 250, 800, 7);

    ctx.filter = 'none';

    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    var next = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();
    tex.dispose();

    if (envMap && envMap.dispose) envMap.dispose();
    envMap = next;
    scene.environment = envMap;
  }

  function ensureEnv() {
    var key = themeIsDark() ? 'dark' : 'light';
    if (key !== envKey || !envMap) {
      envKey = key;
      buildEnv();
    }
  }

  /* ------------------------------------------------------------ scene boot */

  /* ---------------------------------------------------------- engine loader */

  // three.js + the base64 model are ~4 MB of JavaScript. Parsing them before
  // app.js runs means the splash cannot paint until the whole payload has been
  // read, which took ~20s on a throttled phone connection. They are fetched
  // after first paint instead, and the splash upgrades to WebGL when ready.
  var ENGINE = [
    'assets/vendor/three.min.js',
    'assets/vendor/GLTFLoader.js',
    'assets/brain-data.js'
  ];
  var enginePromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureEngine() {
    if (global.THREE && global.THREE.GLTFLoader && global.RM_BRAIN_GLB) {
      return Promise.resolve();
    }
    if (enginePromise) return enginePromise;
    enginePromise = ENGINE.reduce(function (chain, src) {
      return chain.then(function () { return loadScript(src); });
    }, Promise.resolve());
    return enginePromise;
  }

  function build() {
    if (ready) return Promise.resolve();
    if (booting) return booting;

    booting = ensureEngine().then(function () {
      return new Promise(function (resolve, reject) {
      if (!global.THREE) return reject(new Error('three.js not loaded'));
      if (!global.THREE.GLTFLoader) return reject(new Error('GLTFLoader not loaded'));
      if (!global.RM_BRAIN_GLB) return reject(new Error('brain model not embedded'));

      try {
        canvas = document.createElement('canvas');
        canvas.className = 'brain-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.setAttribute('tabindex', '-1');

        renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance'
        });
      } catch (err) {
        return reject(err);
      }

      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
      camera.position.set(0, 0, 5);

      lights.ambient = new THREE.AmbientLight(0xffffff, 0.25);
      scene.add(lights.ambient);

      lights.key = new THREE.DirectionalLight(0xffffff, 1.6);
      lights.key.position.set(-3, 3, 4);
      scene.add(lights.key);

      lights.rim = new THREE.DirectionalLight(0xff9977, 2.6);
      lights.rim.position.set(3.5, -2, -1);
      scene.add(lights.rim);

      lights.fill = new THREE.DirectionalLight(0xbfd4ff, 0.5);
      lights.fill.position.set(0, -3, 2);
      scene.add(lights.fill);

      lights.cursor = new THREE.PointLight(0xffffff, 1.6, 14);
      lights.cursor.position.set(0, 0, 2.4);
      scene.add(lights.cursor);

      ensureEnv();

      var loader = new THREE.GLTFLoader();
      loader.parse(decode(global.RM_BRAIN_GLB), '', function (gltf) {
        var root = gltf.scene;

        // normalise: centre the model, then scale it once
        var box = new THREE.Box3().setFromObject(root);
        var size = box.getSize(new THREE.Vector3());
        var centre = box.getCenter(new THREE.Vector3());
        // The brain is roughly ellipsoidal, so the widest silhouette over a
        // full turn is max(x, z) / 2 - the box diagonal would leave a 25% gap.
        halfWide = Math.max(size.x, size.z) / 2 || 1;
        halfHigh = size.y / 2 || 1;
        halfDeep = size.z / 2 || 1;

        root.position.set(-centre.x, -centre.y, -centre.z);

        root.traverse(function (child) {
          if (!child.isMesh) return;
          if (child.material && child.material.dispose) child.material.dispose();
          child.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0xf2f6fb),
            metalness: 0.94,
            roughness: 0.085,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08,
            reflectivity: 1.0,
            envMapIntensity: 2.3
          });
          child.frustumCulled = false;
        });

        brain = new THREE.Group();
        brain.add(root);
        brain.scale.setScalar(1.0);
        scene.add(brain);

        ready = true;
        resolve();
      }, function (err) {
        reject(err || new Error('GLB parse failed'));
      });

      bindCanvas();
      bindTheme();
      });
    });

    return booting;
  }

  /* ------------------------------------------------------------- measuring */

  function frame() {
    if (!renderer || !camera || !host) return;
    var w = host.clientWidth || 0;
    var h = host.clientHeight || 0;
    if (w < 8 || h < 8) {
      var r = host.getBoundingClientRect();
      w = r.width || 0;
      h = r.height || 0;
    }
    if (w < 8 || h < 8) return;
    w = Math.round(w);
    h = Math.round(h);

    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    var vfov = FOV * Math.PI / 180;
    var hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    var margin = mode === 'hero' ? 1.08 : 1.16;

    // Fit the box, not a bounding sphere (a sphere leaves the brain tiny on a
    // phone). Add the half-depth because the near side of the model projects
    // larger than its centre - without it the bottom of the brain gets clipped.
    var depth = halfDeep * 0.9;
    var byHeight = halfHigh / Math.tan(vfov / 2) + depth;
    var byWidth = halfWide / Math.tan(hfov / 2) + depth;
    baseDist = Math.max(byHeight, byWidth) * margin;
    dist = baseDist * zoom;
    camera.position.z = dist;
    camera.lookAt(0, 0, 0);
  }

  /* ----------------------------------------------------------------- loop */

  function tick(now) {
    raf = global.requestAnimationFrame(tick);
    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (!(dt > 0) || dt > 0.06) dt = 0.016;

    // The intro/poster hosts animate in after attach, so the first frames can
    // measure a different box. Re-measure a few times, then leave it alone.
    if (frameTick < 5) {
      frameTick++;
      if (frameTick === 2 || frameTick === 5) frame();
    }

    if (brain) {
      var ease = Math.min(1, dt * 6);
      px += (tx - px) * ease;
      py += (ty - py) * ease;

      if (!reduce && autoOrbit && !drag) {
        spin += dt * (mode === 'hero' ? 0.26 : 0.20);
      }

      var parallax = reduce ? 0 : 1;
      brain.rotation.y = BASE_YAW + spin + px * 0.22 * parallax;
      brain.rotation.x = tilt + py * 0.14 * parallax;
      brain.rotation.z = BASE_ROLL;

      if (lights.cursor) {
        lights.cursor.position.x = px * 3.2;
        lights.cursor.position.y = -py * 2.4;
      }
    }

    if (pulse > 0) {
      pulse = Math.max(0, pulse - dt * 1.6);
    }
    if (lights.cursor) lights.cursor.intensity = 1.6 + pulse * 4.0;

    if (Math.abs(dist - baseDist * zoom) > 0.001) {
      dist += (baseDist * zoom - dist) * Math.min(1, dt * 9);
    }
    if (camera) camera.position.z = dist;

    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function startLoop() {
    if (raf) return;
    lastTime = global.performance && global.performance.now ? global.performance.now() : Date.now();
    raf = global.requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (raf) {
      global.cancelAnimationFrame(raf);
      raf = null;
    }
  }

  /* ---------------------------------------------------------------- input */

  function bindCanvas() {
    canvas.addEventListener('pointerdown', function (e) {
      if (mode !== 'hero' && mode !== 'intro') return;
      drag = { x: e.clientX, y: e.clientY, spin: spin, tilt: tilt };
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('is-dragging');
    });

    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = -((e.clientY - r.top) / r.height) * 2 + 1;

      if (!drag) return;
      spin = drag.spin + (e.clientX - drag.x) * 0.009;
      tilt = Math.max(-1.1, Math.min(1.1, drag.tilt + (e.clientY - drag.y) * 0.006));
      autoOrbit = false;
      syncOrbitLabel();
    });

    function endDrag() {
      drag = null;
      canvas.classList.remove('is-dragging');
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    canvas.addEventListener('pointerleave', function () {
      tx = 0;
      ty = 0;
    });

    canvas.addEventListener('wheel', function (e) {
      if (mode !== 'hero') return;
      e.preventDefault();
      zoom = Math.max(0.68, Math.min(1.5, zoom + (e.deltaY > 0 ? 0.06 : -0.06)));
    }, { passive: false });

    // touch drag on the hero canvas must not scroll the page
    canvas.addEventListener('touchstart', function (e) {
      if (mode !== 'hero' || !e.touches[0]) return;
      drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, spin: spin, tilt: tilt };
    }, { passive: true });

    canvas.addEventListener('touchmove', function (e) {
      if (!drag || !e.touches[0]) return;
      spin = drag.spin + (e.touches[0].clientX - drag.x) * 0.012;
      tilt = Math.max(-1.1, Math.min(1.1, drag.tilt + (e.touches[0].clientY - drag.y) * 0.008));
      autoOrbit = false;
      syncOrbitLabel();
    }, { passive: true });
  }

  function bindTheme() {
    if (!global.MutationObserver) return;
    var obs = new MutationObserver(function () {
      if (!ready) return;
      ensureEnv();
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    if (global.matchMedia) {
      var mq = global.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', function () { if (ready) ensureEnv(); });
      else if (mq.addListener) mq.addListener(function () { if (ready) ensureEnv(); });
    }
  }

  function bindMotion() {
    mqReduce = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    reduce = matchReduce();
    if (mqReduce && mqReduce.addEventListener) {
      mqReduce.addEventListener('change', function (e) { reduce = !!e.matches; });
    }
  }

  var onResize = null;
  var ro = null;
  function bindResize() {
    if (!onResize) {
      onResize = function () {
        if (host && ready) frame();
      };
      global.addEventListener('resize', onResize);
      global.addEventListener('orientationchange', onResize);
    }
    // Hosts animate in and can settle at a different size than the first frame,
    // so watch the box instead of guessing how many ticks to wait.
    if (global.ResizeObserver) {
      if (!ro) ro = new global.ResizeObserver(function () { if (host && ready) frame(); });
      ro.disconnect();
      if (host) ro.observe(host);
    }
  }

  function syncOrbitLabel() {
    var btn = document.querySelector('[data-act="brain-cam"][data-cam="toggle-orbit"]');
    if (btn) btn.textContent = autoOrbit ? 'Toggle Orbit' : 'Resume Orbit';
  }

  /* ------------------------------------------------------------- lifecycle */

  function attach(el, opts) {
    if (!el) return;
    opts = opts || {};
    var nextMode = opts.mode || 'poster';

    if (host === el && canvas && canvas.parentNode === el) {
      mode = nextMode;
      canvas.setAttribute('data-mode', mode);
      frame();
      startLoop();
      return;
    }

    detach();

    host = el;
    mode = nextMode;
    frameTick = 0;
    zoom = 1;
    dist = 5;
    px = py = tx = ty = 0;

    build().then(function () {
      if (host !== el) return;
      if (canvas.parentNode !== el) el.appendChild(canvas);
      canvas.setAttribute('data-mode', mode);
      ensureEnv();
      frame();
      startLoop();
      bindResize();
      el.classList.add('has-brain');
      el.classList.remove('brain-failed');
      var ind = el.querySelector('.brain-loading-indicator');
      if (ind && ind.parentNode) ind.parentNode.removeChild(ind);
    }).catch(function (err) {
      if (global.console && console.warn) console.warn('[Brain3D] unavailable:', err && err.message);
      if (host === el) {
        el.classList.add('brain-failed');
        el.classList.remove('has-brain');
        var ind = el.querySelector('.brain-loading-indicator');
        if (ind) {
          var txt = ind.querySelector('.brain-loading-text');
          if (txt) txt.textContent = '3D needs WebGL — this browser has it switched off.';
          ind.classList.add('is-static');
        }
      }
      if (opts.fallback) {
        try { opts.fallback(); } catch (e) { }
      }
    });
  }

  function detach() {
    stopLoop();
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (host) {
      host.classList.remove('has-brain');
      host = null;
    }
    drag = null;
  }

  /* ---------------------------------------------------------------- public */

  function setAngle(type) {
    var poses = {
      'lat-left': { yaw: -1.57, tilt: -0.06 },
      'iso': { yaw: -0.75, tilt: 0.15 },
      'front': { yaw: 0, tilt: 0 },
      'top': { yaw: -1.57, tilt: 1.35 }
    };
    var p = poses[type];
    if (!p) return;
    spin = p.yaw - BASE_YAW;
    tilt = p.tilt;
    autoOrbit = false;
    syncOrbitLabel();
  }

  function toggleOrbit() {
    autoOrbit = !autoOrbit;
    return autoOrbit;
  }

  function triggerPulse() {
    pulse = 1;
  }

  function preload(cb, maxWaitMs) {
    var done = false;
    function fire() {
      if (done) return;
      done = true;
      if (cb) cb();
    }
    var timer = global.setTimeout(fire, maxWaitMs || 1500);
    build().then(function () {
      global.clearTimeout(timer);
      fire();
    }).catch(function () {
      global.clearTimeout(timer);
      fire();
    });
  }

  bindMotion();

  global.Brain3D = {
    attach: attach,
    detach: detach,
    init: function (el) { attach(el, { mode: 'hero' }); },
    preload: preload,
    pause: stopLoop,
    resume: startLoop,
    setAngle: setAngle,
    toggleOrbit: toggleOrbit,
    pulse: triggerPulse,
    refresh: function () { if (host && ready) frame(); },
    isReady: function () { return ready; }
  };

})(window);
