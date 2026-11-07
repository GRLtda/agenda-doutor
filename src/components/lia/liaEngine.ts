// Adapted from the supplied Lia v3: scoped pointer tracking, real product states and static reduced-motion poses.
// ===== Motor da Lia v3 (sem dependências) =====
type Pose = {
  x: number; y: number; rot: number; sx: number; sy: number; ox: number; oy: number; op: number;
  red: number; lookX: number; lookY: number; eyeSX: number; eyeSY: number;
  caps: number; xe: number; arc: number; d0: number; d1: number; d2: number;
  spark: number; talk: number; marks: number; blink: number; dj: number; pop: number;
};
type LiaState = "attentive" | "thinking" | "surprised" | "responding" | "success" | "error" | "idle";
type LiaMode = LiaState | "auto";
type LiaApi = {
  setState: (s: string) => void; replay: () => void; pause: () => void; play: () => void;
  destroy: () => void; getState: () => { mode: LiaMode; state: LiaState; paused: boolean; time: number; reducedMotion: boolean };
};

const LIA_ORDER: LiaState[] = ["attentive", "thinking", "surprised", "responding", "success", "error", "idle"];
const LIA_DUR: Record<LiaState, number> = { attentive: 4, thinking: 10.4, surprised: 2.6, responding: 4.2, success: 3.2, error: 3.2, idle: 3.4 };

export function createLia(root: Element, onChange?: (s: LiaState, mode: LiaMode, paused: boolean) => void, startReduced?: boolean, options: { intro?: boolean; state?: LiaState; pointerTarget?: Element } = {}): LiaApi {
  const FLY_A = 1.5, FLY_B = 2.4, GROW_B = 3.25, SNAP_A = 3.0, MORPH_END = 3.55, EYES_A = 3.65, EYES_END = 4.05, INTRO_END = 4.2, BLEND = 0.5;
  // 4 peças do contorno aprovado: centro da bolinha dentro da peça, deslocamento de saída e giro leve
  const FR = [
    { cx: 175, cy: 205, ox: -42, oy: -36, r0: -7 }, { cx: 338, cy: 205, ox: 42, oy: -36, r0: 7 },
    { cx: 178, cy: 365, ox: -42, oy: 36, r0: 6 }, { cx: 352, cy: 382, ox: 44, oy: 40, r0: -6 },
  ];
  const C = {
    b1: [36, 114, 255], b2: [22, 96, 240], glow: [26, 104, 254], edge: [74, 139, 255], rim: [127, 176, 255],
    r1: [242, 64, 82], r2: [210, 38, 62], rglow: [240, 52, 72], redge: [255, 96, 112], rrim: [255, 160, 170],
  };
  const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
  const prog = (t: number, a: number, b: number): number => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
  const eio = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eIn = (x: number): number => x * x * x;
  const eOut = (x: number): number => 1 - Math.pow(1 - x, 3);
  const back = (x: number): number => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  // keyframes [tempo, valor] com easeInOut entre pares
  const kf = (t: number, k: number[][]): number => {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], eio(prog(t, k[i - 1][0], k[i][0])));
    return k[k.length - 1][1];
  };
  const mix = (a: number[], b: number[], k: number): string =>
    "rgb(" + Math.round(lerp(a[0], b[0], k)) + "," + Math.round(lerp(a[1], b[1], k)) + "," + Math.round(lerp(a[2], b[2], k)) + ")";
  const q = (n: string): Element => root.querySelector('[data-l="' + n + '"]') as Element;
  const set = (el: Element, a: string, v: number | string): void => el.setAttribute(a, typeof v === "number" ? v.toFixed(3) : v);

  const base = (): Pose => ({ x: 0, y: 0, rot: 0, sx: 1, sy: 1, ox: 256, oy: 290, op: 1, red: 0, lookX: 0, lookY: 0, eyeSX: 1, eyeSY: 1,
    caps: 1, xe: 0, arc: 0, d0: 0, d1: 0, d2: 0, spark: 0, talk: 0, marks: 0, blink: 1, dj: 0, pop: 0 });

  const mq = startReduced === undefined && typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduced = startReduced !== undefined ? startReduced : !!(mq && mq.matches);
  const S = {
    t: reduced || !options.intro || options.state && options.state !== "attentive" ? INTRO_END : 0, mode: (options.state || "attentive") as LiaMode, cur: (options.state || "attentive") as LiaState, stT: reduced || !options.intro ? BLEND : 0, paused: false,
    from: base(), last: base(), ptr: { x: 0, y: 0 }, look: { x: 0, y: 0 }, raf: 0, lastTs: 0, dead: false,
  };

  // ---- coreografias (lt = segundos desde que o estado começou) ----
  function poseOf(st: LiaState, lt: number, _life: number): Pose {
    const p = base(), m = reduced ? 0.2 : 1;
    if (st === "attentive") {
      p.lookX = S.ptr.x * 12; p.lookY = S.ptr.y * 8; p.rot = S.ptr.x * 3 * m; p.x = S.ptr.x * 6 * m;
    } else if (st === "idle") {
      const c = lt % 6.8;
      p.lookX = kf(c, [[0, 0], [1.2, 0], [1.6, -10], [2.6, -10], [3.0, 0], [4.4, 0], [4.8, 10], [5.8, 10], [6.2, 0]]);
      p.rot = p.lookX * 0.25 * m; p.eyeSY = 0.96;
    } else if (st === "thinking") {
      // pantomima: procura a ideia dos dois lados, pontinhos bagunçados, "aha!" organiza tudo
      const c = lt % LIA_DUR.thinking;
      p.lookX = kf(c, [[0, 0], [0.4, -15], [1.3, -15], [1.7, 15], [2.6, 15], [3.0, 8], [3.9, 8], [4.2, 0], [4.5, -17], [5.0, -17], [5.35, 17], [5.85, 17], [6.15, 0], [7.0, 0], [7.25, -16], [7.6, -16], [7.85, 16], [8.2, 16], [8.5, 6], [9.6, 6], [10.4, 0]]);
      p.lookY = kf(c, [[0, 0], [2.6, 0], [3.0, -17], [3.9, -17], [4.2, -4], [5.85, -4], [6.15, 2], [6.25, -12], [6.9, -6], [7.0, 0], [8.2, 0], [8.5, -15], [9.6, -15], [10.4, 0]]);
      p.eyeSY = kf(c, [[0, 1], [2.6, 1], [3.0, 0.7], [3.9, 0.7], [4.2, 0.82], [5.85, 0.82], [6.15, 0.6], [6.25, 1.22], [6.8, 1.1], [7.0, 1], [7.25, 1.14], [8.2, 1.14], [8.5, 0.74], [9.6, 0.74], [10.4, 1]]);
      p.eyeSX = kf(c, [[0, 1], [4.2, 1], [4.5, 1.1], [5.85, 1.1], [6.15, 1], [6.25, 1.1], [6.9, 1]]);
      const tilt = kf(c, [[0, 0], [0.4, -7], [1.3, -7], [1.7, 7], [2.6, 7], [3.0, 3], [3.9, 3], [4.2, 0], [4.5, -8], [5.0, -8], [5.35, 8], [5.85, 8], [6.15, 0], [6.3, -3], [6.6, 2], [6.9, 0], [7.25, -5], [7.6, -5], [7.85, 5], [8.2, 5], [8.5, 2], [9.6, 2], [10.4, 0]]);
      p.rot = tilt * m;
      p.x = kf(c, [[0, 0], [4.2, 0], [4.5, -16], [5.0, -16], [5.35, 16], [5.85, 16], [6.15, 0]]) * m;
      const wind = kf(c, [[0, 0], [5.9, 0], [6.15, 1], [6.3, -0.7], [6.6, 0.25], [6.85, 0]]);
      p.sx = 1 + 0.09 * wind; p.sy = 1 - 0.11 * wind;
      const dot = (a: number, b: number, i: number): number => back(prog(c, a + i * 0.2, a + i * 0.2 + 0.35)) * (1 - eio(prog(c, b + i * 0.08, b + i * 0.08 + 0.3)));
      const ds = [0, 1, 2].map((i: number) => Math.max(dot(2.6, 6.75, i), dot(8.2, 9.3, i)));
      p.d0 = ds[0]; p.d1 = ds[1]; p.d2 = ds[2];
      p.dj = kf(c, [[0, 0], [3.2, 0], [3.7, 1], [6.1, 1], [6.3, 0]]);
      p.pop = kf(c, [[0, 0], [6.15, 0], [6.3, 1], [6.8, 0]]);
      p.y = -(kf(c, [[0, 0], [6.15, 0], [6.35, 1], [6.6, 0]]) * 30 + kf(c, [[0, 0], [8.0, 0], [8.25, 1], [8.5, 0]]) * 26) * m;
    } else if (st === "surprised") {
      const c = lt % LIA_DUR.surprised;
      const hit = kf(c, [[0, 0], [0.16, 1], [0.7, 1], [1.3, 0.35], [2.6, 0.35]]);
      p.y = -22 * hit * m; p.x = -12 * hit * m; p.rot = -9 * hit * m;
      p.sx = 1 - 0.08 * kf(c, [[0, 0], [0.12, 1], [0.45, 0]]); p.sy = 1 + 0.1 * kf(c, [[0, 0], [0.12, 1], [0.45, 0]]);
      p.eyeSY = kf(c, [[0, 1], [0.12, 1.42], [1.5, 1.38], [1.8, 1.1], [2.6, 1.1]]);
      p.eyeSX = kf(c, [[0, 1], [0.12, 1.16], [1.5, 1.14], [1.8, 1.04], [2.6, 1.04]]);
      p.lookY = -6 * hit; p.marks = kf(c, [[0, 0], [0.1, 1], [0.9, 1], [1.3, 0], [2.6, 0]]); p.blink = 0;
    } else if (st === "responding") {
      const c = lt % LIA_DUR.responding;
      const gate = kf(c, [[0, 0], [0.2, 1], [1.5, 1], [1.8, 0], [2.0, 0], [2.3, 1], [3.7, 1], [4.0, 0], [4.2, 0]]);
      p.talk = gate; p.lookX = -5; p.lookY = 2;
      p.eyeSY = 1 - 0.16 * gate * Math.abs(Math.sin(c * 7.5));
      p.rot = Math.sin(c * 3.6) * 2.2 * m; p.y = -Math.abs(Math.sin(c * 7.5)) * 4 * gate * m;
      p.sy = 1 + 0.02 * gate * Math.sin(c * 15); p.sx = 2 - p.sy;
    } else if (st === "success") {
      const c = lt % LIA_DUR.success;
      p.caps = 0; p.arc = 1;
      const crouch = kf(c, [[0, 0], [0.25, 1], [0.32, -0.6], [0.75, 0], [1.1, -0.2], [1.18, 0.9], [1.38, -0.2], [1.6, 0]]);
      p.sx = 1 + 0.12 * crouch; p.sy = 1 - 0.16 * crouch;
      const up = c < 0.3 ? 0 : c < 0.72 ? eOut(prog(c, 0.3, 0.72)) : c < 1.15 ? 1 - eIn(prog(c, 0.72, 1.15)) : 0;
      p.y = -78 * up * (reduced ? 0.25 : 1);
      p.rot = kf(c, [[0, 0], [0.4, 0], [0.6, 8], [0.85, -6], [1.15, 0]]) * m;
      p.spark = prog(c, 0.45, 1.9); p.oy = 436;
    } else if (st === "error") {
      const c = lt % LIA_DUR.error;
      p.red = 1; p.caps = 0; p.xe = 1;
      const hit = kf(c, [[0, 0], [0.12, 1], [0.35, 0], [2.4, 0], [2.55, 0.7], [2.8, 0], [3.2, 0]]);
      p.sx = 1 + 0.12 * hit; p.sy = 1 - 0.14 * hit; p.oy = 436;
      const decay = Math.exp(-c * 2.4) + 0.5 * Math.exp(-Math.max(0, c - 2.5) * 3) * (c > 2.5 ? 1 : 0);
      p.rot = (Math.sin(c * 38) * 6 * decay + kf(c, [[0, 0], [0.9, 0], [1.4, -5], [2.3, -5], [2.6, 0]])) * m;
      p.x = Math.sin(c * 46) * 6 * decay * m;
      p.y = kf(c, [[0, 0], [0.9, 0], [1.4, 8], [2.3, 8], [2.6, 0]]);
      p.eyeSX = 1 + 0.08 * Math.sin(c * 9); p.marks = 0.6 + 0.4 * Math.abs(Math.sin(c * 5)); p.blink = 0;
    }
    return p;
  }

  // ---- montagem dos elementos dinâmicos ----
  const lia = q("lia"), intro = q("intro"), glowBody = q("glow");
  const stops = [q("s1"), q("s2")], glowFill = q("glow-fill"), glowEdge = q("glow-edge"), rim = q("rim");
  const caps = q("caps"), eyeL = q("eye-l"), eyeR = q("eye-r"), xs = q("x-eyes"), arcs = q("arc-eyes"), xEyes = [q("x-l"), q("x-r")], aEyes = [q("a-l"), q("a-r")];
  const dotsG = q("dots"), sparks = q("sparks"), talk = q("talk"), marks = q("marks");
  const dotX = [166, 226, 286, 346];
  const fd = [0, 1, 2, 3].map((i: number) => q("fd-" + i)), frag = [0, 1, 2, 3].map((i: number) => q("frag-" + i)), cc = [0, 1, 2, 3].map((i: number) => q("cc-" + i));
  const th = Array.prototype.slice.call(dotsG.children) as Element[];
  const sp = Array.prototype.slice.call(sparks.children) as Element[];
  const tk = Array.prototype.slice.call(talk.children) as Element[];
  const mk = Array.prototype.slice.call(marks.children) as Element[];
  const thC = th.map((e: Element) => [Number(e.getAttribute("cx")), Number(e.getAttribute("cy"))]);

  function blinkK(life: number): number {
    const per = 3.4, d = 0.16, c = (life + 1.1) % per;
    return c > per - d ? 1 - 0.9 * Math.sin(((c - (per - d)) / d) * Math.PI) : 1;
  }

  function current(life: number): Pose {
    const tgt = poseOf(S.cur, S.stT, life);
    const k = eio(prog(S.stT, 0, BLEND));
    if (k >= 1) return tgt;
    const out = base(), f = S.from as Record<string, number>, g = tgt as Record<string, number>, o = out as Record<string, number>;
    for (const key in o) o[key] = lerp(f[key], g[key], k);
    return out;
  }

  function render(): void {
    const t = S.t, life = Math.max(0, t - INTRO_END), m = reduced ? 0.2 : 1;
    // intro: 4 bolinhas -> cada uma vira uma peça do corpo e as peças encaixam
    const fly = eio(prog(t, FLY_A, FLY_B)), grow = eio(prog(t, FLY_B, GROW_B)), off = 1 - back(prog(t, SNAP_A, MORPH_END));
    FR.forEach((f: { cx: number; cy: number; ox: number; oy: number; r0: number }, i: number) => {
      const bounce = Math.abs(Math.sin(Math.PI * (t * 1.5 - i * 0.22))) * (1 - fly);
      const appear = back(prog(t, i * 0.12, i * 0.12 + 0.45));
      set(fd[i], "cx", lerp(dotX[i], f.cx + f.ox, fly)); set(fd[i], "cy", lerp(300 - bounce * 46, f.cy + f.oy, fly)); set(fd[i], "r", Math.max(0, 24 * appear));
      set(fd[i], "opacity", t < FLY_B ? 1 : 0); set(frag[i], "opacity", t < FLY_B ? 0 : 1);
      set(frag[i], "transform", "translate(" + (f.ox * off).toFixed(2) + " " + (f.oy * off).toFixed(2) + ") rotate(" + (f.r0 * off * grow).toFixed(2) + " " + f.cx + " " + f.cy + ")");
      set(cc[i], "cx", f.cx); set(cc[i], "cy", f.cy); set(cc[i], "r", lerp(24, 330, grow));
    });
    (intro as SVGElement).style.display = t < MORPH_END ? "" : "none";

    const P = t < INTRO_END ? base() : current(life);
    S.last = P;
    const fin = prog(t, MORPH_END, INTRO_END + 0.4);
    const floatY = Math.sin(life * 2.1) * 7 * m * fin * (1 - P.red * 0.6);
    const breathe = 1 + Math.sin(life * 4.2) * 0.012 * m * fin;
    const sx = P.sx / breathe, sy = P.sy * breathe;
    const tr = "translate(" + P.x.toFixed(2) + " " + (P.y + floatY).toFixed(2) + ") rotate(" + P.rot.toFixed(2) + " " + P.ox.toFixed(1) + " " + P.oy.toFixed(1) +
      ") translate(" + P.ox.toFixed(1) + " " + P.oy.toFixed(1) + ") scale(" + sx.toFixed(4) + " " + sy.toFixed(4) + ") translate(" + (-P.ox).toFixed(1) + " " + (-P.oy).toFixed(1) + ")";
    set(lia, "transform", tr);
    set(lia, "opacity", (t < MORPH_END ? 0 : 1) * P.op); set(glowBody, "opacity", prog(t, MORPH_END - 0.05, MORPH_END + 0.45));

    set(stops[0], "stop-color", mix(C.b1, C.r1, P.red)); set(stops[1], "stop-color", mix(C.b2, C.r2, P.red));
    set(glowFill, "fill", mix(C.glow, C.rglow, P.red)); set(glowEdge, "stroke", mix(C.edge, C.redge, P.red)); set(rim, "stroke", mix(C.rim, C.rrim, P.red));

    // olhos
    const lookTx = P.lookX, lookTy = P.lookY;
    S.look.x = lerp(S.look.x, lookTx, 0.25); S.look.y = lerp(S.look.y, lookTy, 0.25);
    const eyesIn = t < EYES_END ? back(prog(t, EYES_A, EYES_END)) : 1;
    const bl = t < INTRO_END ? 1 : lerp(1, blinkK(life), P.blink);
    set(caps, "opacity", t < EYES_A ? 0 : P.caps);
    [[eyeL, 213], [eyeR, 299]].forEach((e: (Element | number)[]) => {
      const cx = e[1] as number;
      set(e[0] as Element, "transform", "translate(" + (cx + S.look.x).toFixed(2) + " " + (264 + S.look.y).toFixed(2) + ") scale(" + P.eyeSX.toFixed(3) + " " +
        (P.eyeSY * eyesIn * bl * lerp(0.25, 1, P.caps)).toFixed(3) + ") translate(" + -cx + " -264)");
    });
    set(xs, "opacity", P.xe); set(arcs, "opacity", P.arc);
    [213, 299].forEach((cx: number, i: number) => {
      set(xEyes[i], "transform", "translate(" + (cx + S.look.x * 0.4).toFixed(2) + " 264) scale(" + (lerp(0.3, 1, P.xe) * P.eyeSX).toFixed(3) + ")");
      set(aEyes[i], "transform", "translate(" + cx + " 262) scale(" + lerp(0.4, 1, P.arc).toFixed(3) + ")");
    });

    // efeitos externos (acompanham deslocamento, não o giro)
    const fx = "translate(" + P.x.toFixed(2) + " " + (P.y + floatY).toFixed(2) + ")";
    set(dotsG, "transform", fx); set(marks, "transform", fx); set(talk, "transform", fx);
    [P.d0, P.d1, P.d2].forEach((v: number, i: number) => {
      const jx = P.dj * Math.sin(life * 5 + i * 2.1) * 16 * (reduced ? 0.3 : 1), jy = P.dj * Math.cos(life * 4 + i * 1.7) * 11 * (reduced ? 0.3 : 1);
      const sc = 1 + 0.4 * P.pop, cx = thC[i][0], cy = thC[i][1];
      set(th[i], "opacity", clamp(v, 0, 1));
      set(th[i], "transform", "translate(" + (jx + cx).toFixed(2) + " " + (jy + (1 - v) * 34 + cy).toFixed(2) + ") scale(" + sc.toFixed(3) + ") translate(" + -cx + " " + -cy + ")");
    });
    sp.forEach((el: Element, i: number) => {
      const k = clamp(P.spark * 1.3 - i * 0.1, 0, 1), a = Math.sin(k * Math.PI);
      const b = el.getAttribute("data-p")!.split(",").map(Number);
      set(el, "opacity", a * 0.95); set(el, "transform", "translate(" + b[0] + " " + (b[1] + P.y * 0.5 - k * 18 * (reduced ? 0.3 : 1)).toFixed(2) + ") scale(" + (0.6 + 1.3 * a).toFixed(3) + ") rotate(" + (k * 90 * m).toFixed(1) + ")");
    });
    tk.forEach((el: Element, i: number) => {
      const w = 0.5 + 0.5 * Math.sin(life * 8 - i * 0.9);
      set(el, "opacity", P.talk * (0.35 + 0.65 * w)); set(el, "transform", "translate(0 " + (-w * 6 * P.talk * (reduced ? 0.3 : 1)).toFixed(2) + ")");
    });
    set(marks, "stroke", mix(C.rim, C.rrim, P.red));
    mk.forEach((el: Element, i: number) => { set(el, "opacity", P.marks * (0.6 + 0.4 * Math.sin(life * 6 + i))); });
  }

  function go(next: LiaState): void {
    S.from = S.last; S.cur = next; S.stT = 0;
    if (onChange) onChange(S.cur, S.mode, S.paused);
  }
  function tick(dt: number): void {
    S.t += dt;
    if (S.t < INTRO_END) return;
    S.stT += dt;
    if (S.mode === "auto" && S.stT >= LIA_DUR[S.cur]) go(LIA_ORDER[(LIA_ORDER.indexOf(S.cur) + 1) % LIA_ORDER.length]);
  }
  function loop(ts: number): void {
    if (!S.lastTs) S.lastTs = ts;
    const dt = Math.min(0.05, (ts - S.lastTs) / 1000); S.lastTs = ts;
    tick(dt); render();
    S.raf = requestAnimationFrame(loop);
  }
  function start(): void { if (!S.raf && !S.dead && !S.paused && !reduced && !document.hidden) { S.lastTs = 0; S.raf = requestAnimationFrame(loop); } }
  function stop(): void { if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; } }

  const pointerTarget = options.pointerTarget || root;
  const onPtr = (e: Event): void => {
    if (reduced || S.paused || S.dead) return;
    const pe = e as PointerEvent, r = root.getBoundingClientRect(), area = pointerTarget.getBoundingClientRect();
    if (!r.width || !r.height || !area.width || !area.height) return;
    S.ptr.x = clamp((pe.clientX - r.left - r.width / 2) / (area.width / 2), -1, 1);
    S.ptr.y = clamp((pe.clientY - r.top - r.height / 2) / (area.height / 2), -1, 1);
  };
  const onLeave = (): void => { S.ptr.x = 0; S.ptr.y = 0; };
  const onVis = (): void => { if (document.hidden) stop(); else start(); };
  const onMq = (): void => { reduced = !!(mq && mq.matches); if (reduced) { stop(); S.t = Math.max(S.t, INTRO_END); S.stT = Math.max(S.stT, BLEND); render(); } else start(); };
  pointerTarget.addEventListener("pointermove", onPtr); pointerTarget.addEventListener("pointerdown", onPtr); pointerTarget.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVis);
  if (mq && mq.addEventListener) mq.addEventListener("change", onMq);

  const api: LiaApi = {
    setState: (s: string): void => {
      const v = s === "idle" || s === "attentive" || s === "thinking" || s === "error" || s === "success" || s === "surprised" || s === "responding" ? (s as LiaState) : null;
      if (s === "auto") { S.mode = "auto"; go(S.cur); return; }
      if (!v) return;
      if (S.t < INTRO_END) S.t = INTRO_END;
      S.mode = v; go(v); if (reduced || S.paused) S.stT = BLEND; render();
    },
    replay: (): void => { S.t = reduced ? INTRO_END : 0; S.mode = "auto"; S.from = base(); S.cur = LIA_ORDER[0]; S.stT = 0; S.look = { x: 0, y: 0 }; if (onChange) onChange(S.cur, S.mode, false); api.play(); },
    pause: (): void => { S.paused = true; stop(); if (onChange) onChange(S.cur, S.mode, true); },
    play: (): void => { S.paused = false; start(); if (onChange) onChange(S.cur, S.mode, false); },
    destroy: (): void => {
      S.dead = true; stop();
      pointerTarget.removeEventListener("pointermove", onPtr); pointerTarget.removeEventListener("pointerdown", onPtr); pointerTarget.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      if (mq && mq.removeEventListener) mq.removeEventListener("change", onMq);
    },
    getState: () => ({ mode: S.mode, state: S.cur, paused: S.paused, time: S.t, reducedMotion: reduced }),
  };
  render(); start();
  return api;
}
