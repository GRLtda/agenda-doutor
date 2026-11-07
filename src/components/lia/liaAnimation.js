// Adapted from the Lia animation supplied by the product team. No globals or shared SVG IDs.
export function createLiaAnimation(stage, { intro = false, reducedMotion = false } = {}) {
  var NS = "http://www.w3.org/2000/svg";
  var INTRO_DOTS = 2.4, MORPH_END = 3.5, EYES_END = 3.95, INTRO_END = 4.2;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function prog(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOutElastic(x) { return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }

  var $ = function (id) { return stage.querySelector(`[data-part="${id}"]`); };
  var introG = $("intro"), glowG = $("intro-glow"), gooG = $("intro-goo"), gooBody = $("goo-body");
  var lia = $("lia"), eyes = $("eyes"), eyeL = $("eye-left"), eyeR = $("eye-right"), thought = $("thought");

  var dotX = [166, 226, 286, 346], glowDots = [], gooDots = [], thDots = [];
  dotX.forEach(function () {
    var a = document.createElementNS(NS, "circle"); glowG.appendChild(a); glowDots.push(a);
    var b = document.createElementNS(NS, "circle"); gooG.insertBefore(b, gooBody); gooDots.push(b);
  });
  [{ cx: 446, cy: 118, r: 9 }, { cx: 474, cy: 86, r: 12 }, { cx: 508, cy: 50, r: 16 }].forEach(function (d) {
    var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", d.cx); c.setAttribute("r", d.r); c.setAttribute("opacity", 0);
    thought.appendChild(c); thDots.push({ el: c, cy: d.cy });
  });

  var reduced = reducedMotion;
  var motion = reduced ? 0.25 : 1;
  var state = { t: reduced || !intro ? INTRO_END : 0, mode: "attentive", paused: false, think: 0, look: { x: 0, y: 0 }, pointer: { x: 0, y: 0 } };
  var raf = 0, last = 0;

  function targetThinking(life) {
    if (state.mode === "thinking") return 1;
    if (state.mode === "attentive") return 0;
    var c = life % 9;                       // auto: atenta 5s, pensando 4s
    if (c < 5) return 0;
    if (c < 5.5) return easeInOut((c - 5) / 0.5);
    if (c < 8.5) return 1;
    return 1 - easeInOut((c - 8.5) / 0.5);
  }
  function blinkScale(life) {
    var p = 3.4, d = 0.16, c = life % p;
    return c > p - d ? 1 - 0.9 * Math.sin(((c - (p - d)) / d) * Math.PI) : 1;
  }

  function render() {
    var t = state.t, life = Math.max(0, t - INTRO_END);
    // intro
    var morph = easeInOut(prog(t, INTRO_DOTS, MORPH_END));
    dotX.forEach(function (x, i) {
      var bounce = Math.abs(Math.sin(Math.PI * (t * 1.5 - i * 0.22)));
      var y0 = 300 - bounce * 46 * (1 - morph);
      var r = lerp(24, 70, morph) * easeOutBack(prog(t, i * 0.12, i * 0.12 + 0.45));
      var cx = lerp(x, 256, morph), cy = lerp(y0, 280, morph);
      [glowDots[i], gooDots[i]].forEach(function (el) { el.setAttribute("cx", cx); el.setAttribute("cy", cy); el.setAttribute("r", Math.max(0, r)); });
    });
    var grow = prog(t, INTRO_DOTS + 0.25, MORPH_END + 0.2);
    var bodyScale = t >= MORPH_END + 0.2 ? 1 : lerp(0.18, 1, easeOutElastic(grow));
    introG.style.display = t < MORPH_END + 0.25 ? "" : "none";
    introG.setAttribute("opacity", 1 - prog(t, MORPH_END - 0.25, MORPH_END + 0.1));
    gooBody.setAttribute("opacity", t > INTRO_DOTS + 0.25 ? 1 : 0);
    lia.setAttribute("opacity", prog(t, MORPH_END - 0.15, MORPH_END + 0.2));

    // vida
    var tgt = t < INTRO_END ? 0 : targetThinking(life);
    state.think = lerp(state.think, tgt, 0.12);
    var th = t < INTRO_END ? 0 : state.think, att = 1 - th;
    state.look.x = lerp(state.look.x, lerp(state.pointer.x * 10 * att, 9, th), 0.15);
    state.look.y = lerp(state.look.y, lerp(state.pointer.y * 7 * att, -16, th), 0.15);
    var fin = prog(t, MORPH_END, INTRO_END + 0.4);
    var floatY = Math.sin(life * 2.1) * 7 * motion * fin;
    var squash = 1 + Math.sin(life * 4.2) * 0.012 * motion * fin;
    var tilt = (state.pointer.x * 2 * att + 3 * th) * motion;
    var bt = "translate(0 " + floatY.toFixed(2) + ") rotate(" + tilt.toFixed(2) + " 256 300) translate(256 290) scale(" +
      (bodyScale / squash).toFixed(4) + " " + (bodyScale * squash).toFixed(4) + ") translate(-256 -290)";
    lia.setAttribute("transform", bt); gooBody.setAttribute("transform", bt);

    var eyesIn = easeOutBack(prog(t, MORPH_END - 0.05, EYES_END));
    var sy = (t < EYES_END ? eyesIn : 1) * (t < INTRO_END ? 1 : blinkScale(life)) * lerp(1, 0.86, th);
    eyes.setAttribute("opacity", t < MORPH_END - 0.05 ? 0 : 1);
    [[eyeL, 213], [eyeR, 299]].forEach(function (p) {
      p[0].setAttribute("transform", "translate(" + (p[1] + state.look.x) + " " + (264 + state.look.y) + ") scale(1 " + sy.toFixed(3) + ") translate(" + (-p[1]) + " -264)");
    });
    thDots.forEach(function (d, i) {
      var pulse = 0.5 + 0.5 * Math.sin(life * 4 - i * 0.9);
      d.el.setAttribute("opacity", th * (0.45 + 0.55 * pulse));
      d.el.setAttribute("cy", d.cy - pulse * 4 * motion + floatY);
    });
  }

  function loop(ts) {
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    state.t += dt; render();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && !reduced && !state.paused && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function onPointer(e) {
    if (reduced) return;
    var r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    state.pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    state.pointer.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
  }
  function resetPointer() { state.pointer.x = 0; state.pointer.y = 0; }
  function onVisibility() { if (document.hidden) stop(); else start(); }
  stage.addEventListener('pointermove', onPointer);
  stage.addEventListener('pointerleave', resetPointer);
  document.addEventListener('visibilitychange', onVisibility);
  render(); start();
  return {
    setState(value) { state.mode = value === 'thinking' ? 'thinking' : 'attentive'; if (reduced) { state.think = value === 'thinking' ? 1 : 0; render(); } },
    pause() { state.paused = true; stop(); },
    play() { state.paused = false; start(); },
    destroy() { stop(); [...glowDots, ...gooDots, ...thDots.map(dot => dot.el)].forEach(el => el.remove()); stage.removeEventListener('pointermove', onPointer); stage.removeEventListener('pointerleave', resetPointer); document.removeEventListener('visibilitychange', onVisibility); }
  };
}
