/*! @mt-planning/reading-tracker v0.1.1 | MIT License | (c) MT-planning, Ltd. */
(() => {
  // src/settings.js
  var DEFAULT_SETTINGS = Object.freeze({
    gapPx: 120,
    gapColor: "rgba(143, 184, 154, 0.25)",
    overlayColor: "rgba(15, 23, 42, 0.85)",
    blendMultiply: false,
    verticalWriting: false,
    pageFontSizePercent: 100,
    pageLineHeightPercent: 100,
    pageFontFamily: ""
  });
  var GAP_MIN = 24;
  var GAP_MAX = 400;
  var FONT_SCALE_PERCENTS = [100, 150, 200];
  var LINE_SCALE_PERCENTS = [100, 200, 400];
  function clampGap(v, fallback = DEFAULT_SETTINGS.gapPx) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(GAP_MAX, Math.max(GAP_MIN, Math.round(n)));
  }
  function normalizeFontSizePercent(raw) {
    const n = Math.round(Number(raw));
    if (FONT_SCALE_PERCENTS.includes(n)) return n;
    if (!Number.isFinite(n)) return 100;
    if (n <= 112) return 100;
    if (n <= 175) return 150;
    return 200;
  }
  function normalizeLineHeightPercent(raw) {
    const fl = Number(raw);
    if (Number.isFinite(fl) && fl > 0 && fl < 10) {
      if (fl <= 1.35) return 100;
      if (fl <= 2.5) return 200;
      return 400;
    }
    const n = Math.round(fl);
    if (LINE_SCALE_PERCENTS.includes(n)) return n;
    if (!Number.isFinite(n)) return 100;
    if (n <= 112) return 100;
    if (n <= 300) return 200;
    return 400;
  }
  function isCssColor(v) {
    if (typeof v !== "string" || !v.trim()) return false;
    try {
      if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
        return CSS.supports("color", v);
      }
    } catch (_) {
    }
    return !/[;{}<>]/.test(v);
  }
  function normalizeSettings(raw, base = DEFAULT_SETTINGS) {
    const src = raw && typeof raw === "object" ? raw : {};
    const merged = { ...base, ...src };
    return {
      gapPx: clampGap(merged.gapPx, base.gapPx),
      gapColor: isCssColor(merged.gapColor) ? merged.gapColor : base.gapColor,
      overlayColor: isCssColor(merged.overlayColor) ? merged.overlayColor : base.overlayColor,
      blendMultiply: !!merged.blendMultiply,
      verticalWriting: !!merged.verticalWriting,
      pageFontSizePercent: normalizeFontSizePercent(merged.pageFontSizePercent),
      pageLineHeightPercent: normalizeLineHeightPercent(merged.pageLineHeightPercent),
      pageFontFamily: String(merged.pageFontFamily || "").trim()
    };
  }
  function pickSettings(raw) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (key in raw) out[key] = raw[key];
    }
    return out;
  }
  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "");
    const full = h.length === 3 ? h.replace(/./g, "$&$&") : h;
    const n = parseInt(full, 16);
    if (!Number.isFinite(n)) return { r: 0, g: 0, b: 0 };
    return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 };
  }
  function parseRgbaColor(rgba, fallbackHex, fallbackAlphaPercent) {
    const m = String(rgba || "").match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/
    );
    if (!m) {
      const hexMatch = String(rgba || "").match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (hexMatch) {
        const h = hexMatch[1].length === 3 ? hexMatch[1].replace(/./g, "$&$&") : hexMatch[1];
        return { hex: `#${h.toLowerCase()}`, alphaPercent: 100 };
      }
      return { hex: fallbackHex, alphaPercent: fallbackAlphaPercent };
    }
    const a = m[4] !== void 0 ? Number(m[4]) : 1;
    const hex = "#" + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("");
    return { hex, alphaPercent: Math.round(a * 100) };
  }
  function buildRgba(hex, alphaPercent) {
    const { r, g, b } = hexToRgb(hex);
    const a = Math.min(1, Math.max(0, Number(alphaPercent) / 100));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  function createStore(key, { persist = true, resume = true } = {}) {
    const sessionKey = `${key}:session`;
    function safe(fn, fallback) {
      try {
        return fn();
      } catch (_) {
        return fallback;
      }
    }
    return {
      readSettings() {
        if (!persist) return null;
        return safe(() => {
          const raw = window.localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        }, null);
      },
      writeSettings(settings2) {
        if (!persist) return;
        safe(() => window.localStorage.setItem(key, JSON.stringify(settings2)));
      },
      clearSettings() {
        safe(() => window.localStorage.removeItem(key));
      },
      readSession() {
        if (!resume) return {};
        return safe(() => {
          const raw = window.sessionStorage.getItem(sessionKey);
          return raw ? JSON.parse(raw) || {} : {};
        }, {});
      },
      writeSession(patch) {
        if (!resume) return;
        safe(() => {
          const next = { ...this.readSession(), ...patch };
          window.sessionStorage.setItem(sessionKey, JSON.stringify(next));
        });
      }
    };
  }

  // src/overlay.js
  var HOST_ATTR = "data-reading-tracker";
  var PAGE_STYLE_ID = "reading-tracker-page-style";
  var OVERLAY_CSS = [
    ":host{all:initial;position:fixed!important;inset:0!important;pointer-events:none!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;display:block!important}",
    ".rt-mask,.rt-gap{position:fixed;pointer-events:none;display:none}",
    ".rt-mask{background:var(--rt-color)}",
    ".rt-gap{background:var(--rt-gap-color)}"
  ].join("");
  var TEXT_TAGS = "p,li,td,th,dt,dd,blockquote,figcaption,article,section,main,aside,h1,h2,h3,h4,h5,h6,pre,code,label,a,span,div,em,strong,small,caption,summary,details,ul,ol,dl,table";
  function buildFontFamilyCssValue(raw) {
    const s = String(raw || "").trim();
    if (!s || /[;{}<>\n\r]/.test(s)) return "";
    const parts = s.split(",").map((part) => {
      const trimmed = part.trim().replace(/^["']|["']$/g, "");
      if (!trimmed || /[;{}<>\n\r]/.test(trimmed)) return "";
      return `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }).filter(Boolean);
    if (!parts.length) return "";
    return `${parts.join(", ")}, system-ui, -apple-system, "Segoe UI", "Yu Gothic UI", "Hiragino Sans", Meiryo, sans-serif`;
  }
  function buildPageStyleCss(settings2, contentSelector = "body") {
    const s = normalizeSettings(settings2);
    const parts = [];
    if (s.pageFontSizePercent !== 100) {
      parts.push(`html{font-size:${s.pageFontSizePercent}%!important}`);
      parts.push(`body{font-size:100%!important}`);
    }
    const decl = [];
    if (s.pageLineHeightPercent !== 100) {
      decl.push(`line-height:${s.pageLineHeightPercent / 100}!important`);
    }
    const fontCss = buildFontFamilyCssValue(s.pageFontFamily);
    if (fontCss) decl.push(`font-family:${fontCss}!important`);
    if (decl.length) {
      const scope = `:is(${contentSelector || "body"})`;
      const not = `:not([${HOST_ATTR}])`;
      const selectors = [
        `${scope}`,
        `${scope} *${not}`,
        `${scope} *${not}::before`,
        `${scope} *${not}::after`,
        ...TEXT_TAGS.split(",").map((tag) => `${scope} ${tag}${not}`)
      ];
      parts.push(`${selectors.join(",")}{${decl.join(";")}}`);
    }
    return parts.join("");
  }
  var Overlay = class {
    /**
     * @param {{ contentSelector?: string, zIndex?: number, shouldIgnoreEvent?: (e: Event) => boolean }} opts
     */
    constructor(opts = {}) {
      this.contentSelector = opts.contentSelector || "body";
      this.zIndex = opts.zIndex;
      this.shouldIgnoreEvent = opts.shouldIgnoreEvent || (() => false);
      this.settings = { ...DEFAULT_SETTINGS };
      this.fitScreen = false;
      this.host = null;
      this.els = null;
      this.abort = null;
      this.raf = 0;
      this.x = 0;
      this.y = 0;
    }
    get mounted() {
      return !!this.host;
    }
    mount(settings2, fitScreen2) {
      this.unmount();
      this.settings = normalizeSettings(settings2);
      this.fitScreen = !!fitScreen2;
      this.x = window.innerWidth / 2;
      this.y = window.innerHeight / 2;
      const host = document.createElement("div");
      host.setAttribute(HOST_ATTR, "overlay");
      host.style.setProperty("z-index", String(this.zIndex), "important");
      const root = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = OVERLAY_CSS;
      root.appendChild(style);
      const make = (cls) => {
        const el = document.createElement("div");
        el.className = cls;
        root.appendChild(el);
        return el;
      };
      this.els = {
        top: make("rt-mask rt-top"),
        bottom: make("rt-mask rt-bottom"),
        left: make("rt-mask rt-left"),
        right: make("rt-mask rt-right"),
        gap: make("rt-gap")
      };
      (document.documentElement || document.body).appendChild(host);
      this.host = host;
      this.abort = new AbortController();
      const signal = this.abort.signal;
      const onPointer = (e) => {
        if (this.shouldIgnoreEvent(e)) return;
        this.moveTo(e.clientX, e.clientY);
      };
      const onTouch = (e) => {
        if (!e.touches || !e.touches.length || this.shouldIgnoreEvent(e)) return;
        this.moveTo(e.touches[0].clientX, e.touches[0].clientY);
      };
      window.addEventListener("resize", () => this.scheduleLayout(), { signal });
      document.addEventListener("pointermove", onPointer, { capture: true, passive: true, signal });
      document.addEventListener("pointerdown", onPointer, { capture: true, passive: true, signal });
      document.addEventListener("touchmove", onTouch, { capture: true, passive: true, signal });
      this.applyAppearance();
      this.applyPageStyle();
      this.layout();
    }
    unmount() {
      var _a, _b;
      try {
        (_a = this.abort) == null ? void 0 : _a.abort();
      } catch (_) {
      }
      this.abort = null;
      cancelAnimationFrame(this.raf);
      (_b = this.host) == null ? void 0 : _b.remove();
      this.host = null;
      this.els = null;
      this.removePageStyle();
    }
    update(settings2) {
      this.settings = normalizeSettings(settings2);
      if (!this.mounted) return;
      this.applyAppearance();
      this.applyPageStyle();
      this.scheduleLayout();
    }
    setFitScreen(on) {
      this.fitScreen = !!on;
      if (this.mounted) this.scheduleLayout();
    }
    moveTo(x, y) {
      this.x = x;
      this.y = y;
      this.scheduleLayout();
    }
    applyAppearance() {
      if (!this.host) return;
      this.host.style.setProperty("--rt-color", this.settings.overlayColor);
      this.host.style.setProperty("--rt-gap-color", this.settings.gapColor);
      this.host.style.setProperty(
        "mix-blend-mode",
        this.settings.blendMultiply ? "multiply" : "normal",
        "important"
      );
    }
    applyPageStyle() {
      const css = buildPageStyleCss(this.settings, this.contentSelector);
      if (!css) {
        this.removePageStyle();
        return;
      }
      let style = document.getElementById(PAGE_STYLE_ID);
      if (!style) {
        style = document.createElement("style");
        style.id = PAGE_STYLE_ID;
        style.setAttribute(HOST_ATTR, "page-style");
        (document.head || document.documentElement).appendChild(style);
      }
      if (style.textContent !== css) style.textContent = css;
    }
    removePageStyle() {
      document.querySelectorAll(`#${PAGE_STYLE_ID}`).forEach((el) => el.remove());
    }
    scheduleLayout() {
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => this.layout());
    }
    layout() {
      if (!this.els) return;
      const { top, bottom, left, right, gap } = this.els;
      const docEl = document.documentElement;
      const vw = Math.min(window.innerWidth, docEl.clientWidth || window.innerWidth);
      const vh = Math.min(window.innerHeight, docEl.clientHeight || window.innerHeight);
      const vertical = this.settings.verticalWriting;
      const half = this.settings.gapPx / 2;
      const clamp = (v, max) => Math.max(0, Math.min(max, v));
      const span = (pos, max) => this.fitScreen ? [0, max] : [clamp(pos - half, max), clamp(pos + half, max)];
      const place = (el, l, t, w, h) => {
        el.style.cssText = `display:block;left:${l}px;top:${t}px;width:${Math.max(0, w)}px;height:${Math.max(0, h)}px`;
      };
      const hide = (el) => {
        el.style.display = "none";
      };
      if (vertical) {
        const [start, end] = span(this.x, vw);
        place(left, 0, 0, start, vh);
        place(right, end, 0, vw - end, vh);
        place(gap, start, 0, end - start, vh);
        hide(top);
        hide(bottom);
      } else {
        const [start, end] = span(this.y, vh);
        place(top, 0, 0, vw, start);
        place(bottom, 0, end, vw, vh - end);
        place(gap, 0, start, vw, end - start);
        hide(left);
        hide(right);
      }
    }
  };

  // src/panel.css
  var panel_default = ":host{all:initial;position:fixed!important;inset:0!important;pointer-events:none!important;display:block!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;mix-blend-mode:normal!important}.rt-ui{--primary: #0b57d0;--on-primary: #ffffff;--surface: #f3efe6;--surface-lowest: #fffdf8;--surface-container: #e9e4da;--surface-high: #ded8cc;--on-surface: #1c1b18;--on-surface-variant: #3f3c37;--outline: #73777f;--outline-variant: #c4c7ce;--error: #ba1a1a;--elev-1: 0 1px 2px rgba(0, 0, 0, .08), 0 1px 3px 1px rgba(0, 0, 0, .06);--elev-2: 0 1px 2px rgba(0, 0, 0, .12), 0 2px 6px 2px rgba(0, 0, 0, .08);--elev-3: 0 4px 8px 3px rgba(0, 0, 0, .12), 0 1px 3px rgba(0, 0, 0, .2);--offset: 20px;font-family:BIZ UDPGothic,Yu Gothic UI,YuGothic,Hiragino Kaku Gothic ProN,Hiragino Sans,Meiryo,system-ui,-apple-system,Segoe UI,sans-serif;font-size:12px;font-weight:400;font-style:normal;line-height:1.2;letter-spacing:normal;color:var(--on-surface);text-align:left;-webkit-font-smoothing:antialiased}.rt-ui *,.rt-ui *:before,.rt-ui *:after{box-sizing:border-box}:where(.rt-ui) button,:where(.rt-ui) input{font:inherit;color:inherit;margin:0}.rt-ui :focus-visible{outline:3px solid var(--primary);outline-offset:2px}.rt-ui svg{display:block;flex-shrink:0}[hidden]{display:none!important}.rt-launcher{position:fixed;width:52px;height:52px;padding:0;border:none;border-radius:10px;background:transparent;box-shadow:var(--elev-3);cursor:pointer;pointer-events:auto;transition:transform .15s ease,filter .15s ease}.rt-launcher:hover{filter:brightness(1.2)}.rt-launcher:active{transform:scale(.95)}.rt-launcher svg{width:100%;height:100%}.pos-bottom-right .rt-launcher{right:var(--offset);bottom:var(--offset)}.pos-bottom-left .rt-launcher{left:var(--offset);bottom:var(--offset)}.pos-top-right .rt-launcher{right:var(--offset);top:var(--offset)}.pos-top-left .rt-launcher{left:var(--offset);top:var(--offset)}.rt-panel{position:fixed;width:340px;max-width:calc(100vw - 2 * var(--offset));max-height:calc(100vh - 52px - 3 * var(--offset));max-height:calc(100dvh - 52px - 3 * var(--offset));overflow-y:auto;overscroll-behavior:contain;border-radius:20px;background:var(--surface);box-shadow:var(--elev-3);pointer-events:auto;scrollbar-width:thin;scrollbar-color:var(--outline-variant) transparent}.pos-bottom-right .rt-panel{right:var(--offset);bottom:calc(52px + 2 * var(--offset) - 8px)}.pos-bottom-left .rt-panel{left:var(--offset);bottom:calc(52px + 2 * var(--offset) - 8px)}.pos-top-right .rt-panel{right:var(--offset);top:calc(52px + 2 * var(--offset) - 8px)}.pos-top-left .rt-panel{left:var(--offset);top:calc(52px + 2 * var(--offset) - 8px)}.no-launcher .rt-panel{bottom:var(--offset);top:auto;max-height:calc(100vh - 2 * var(--offset))}.no-launcher.pos-top-right .rt-panel,.no-launcher.pos-top-left .rt-panel{top:var(--offset);bottom:auto}.rt-head{position:sticky;top:0;z-index:2;padding:12px 12px 12px 16px;background:var(--surface-lowest);border-bottom:1px solid color-mix(in srgb,var(--outline-variant) 60%,transparent)}.rt-head-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.rt-title{margin:0;font-size:14px;font-weight:700;letter-spacing:.04em}.rt-icon-btn{width:36px;height:36px;padding:0;border:none;border-radius:9999px;background:transparent;color:var(--on-surface-variant);cursor:pointer;display:flex;align-items:center;justify-content:center}.rt-icon-btn:hover{background:var(--surface-container)}.rt-icon-btn svg{width:20px;height:20px}.rt-run{display:flex;width:100%;min-height:48px;border-radius:9999px;overflow:hidden;box-shadow:var(--elev-1)}.rt-run button{border:none;background:var(--primary);color:var(--on-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}.rt-run button:hover{filter:brightness(1.05)}.rt-run-main{flex:1 1 auto;min-width:0;padding:12px 20px;font-size:16px!important;font-weight:600!important;letter-spacing:.02em}.rt-run-main svg{width:22px;height:22px}.rt-run-fit{flex:0 0 52px;padding:0;border-left:1px solid color-mix(in srgb,var(--on-primary) 28%,transparent)!important}.rt-run-fit svg{width:22px;height:22px}.rt-run-fit[aria-pressed=true]{background:color-mix(in srgb,var(--on-primary) 16%,var(--primary))}.rt-run .rt-icon-fit-exit,.rt-run-fit[aria-pressed=true] .rt-icon-fit,.rt-run-main .rt-icon-stop,.is-active .rt-run-main .rt-icon-play{display:none}.rt-run-fit[aria-pressed=true] .rt-icon-fit-exit,.is-active .rt-run-main .rt-icon-stop{display:block}.is-active .rt-run button{background:var(--surface-high);color:var(--on-surface)}.is-active .rt-run-fit{border-left-color:color-mix(in srgb,var(--on-surface) 18%,transparent)!important}.is-active .rt-run-fit[aria-pressed=true]{background:color-mix(in srgb,var(--on-surface) 12%,var(--surface-high))}.rt-body{display:flex;flex-direction:column;gap:12px;padding:12px 16px 16px}.rt-card{border-radius:16px;background:var(--surface-lowest);box-shadow:var(--elev-1);overflow:hidden}.rt-section{padding:12px 14px}.rt-section+.rt-section{border-top:1px solid color-mix(in srgb,var(--outline-variant) 72%,transparent)}.rt-label{display:block;margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:.04em;line-height:1.45;color:var(--on-surface-variant)}.rt-row{display:flex;align-items:center;gap:12px}.rt-row+.rt-row{margin-top:8px}.rt-between{justify-content:space-between}.rt-note{margin:10px 0 0;font-size:11px;line-height:1.55;color:var(--on-surface-variant)}.rt-slider{--track-h: 8px;--thumb: 24px;flex:1;min-width:0;height:var(--thumb);-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer}.rt-slider::-webkit-slider-runnable-track{height:var(--track-h);border-radius:5px;background:var(--surface-high)}.rt-slider::-webkit-slider-thumb{-webkit-appearance:none;width:var(--thumb);height:var(--thumb);margin-top:calc((var(--track-h) - var(--thumb)) / 2);border-radius:50%;background:var(--primary);border:2px solid var(--surface-lowest);box-shadow:0 1px 4px #00000040}.rt-slider::-moz-range-track{height:var(--track-h);border-radius:5px;background:var(--surface-high)}.rt-slider::-moz-range-thumb{box-sizing:border-box;width:var(--thumb);height:var(--thumb);border-radius:50%;background:var(--primary);border:2px solid var(--surface-lowest);box-shadow:0 1px 4px #00000040}.rt-chip{flex-shrink:0;min-width:52px;padding:6px 8px;border-radius:12px;background:var(--surface-high);font-size:13px;font-weight:600;text-align:center;font-variant-numeric:tabular-nums}.rt-color{flex-shrink:0;width:44px;height:44px;padding:0;border:2px solid var(--outline-variant);border-radius:12px;background:var(--surface-lowest);cursor:pointer;overflow:hidden}.rt-color::-webkit-color-swatch-wrapper{padding:4px}.rt-color::-webkit-color-swatch{border:none;border-radius:8px}.rt-color::-moz-color-swatch{border:none;border-radius:8px}.rt-alpha{flex:1;min-width:0}.rt-alpha .rt-label{margin-bottom:4px}.rt-alpha .rt-row{gap:8px}.rt-switch{position:relative;display:inline-flex;flex-shrink:0;cursor:pointer}.rt-switch input{position:absolute;opacity:0;width:1px;height:1px;margin:-1px;clip-path:inset(50%);overflow:hidden}.rt-switch:focus-within .rt-track{outline:3px solid var(--primary);outline-offset:3px}.rt-track{position:relative;display:block;width:52px;height:28px;border-radius:14px;background:var(--surface-high);transition:background .15s ease}.rt-thumb{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:var(--outline);box-shadow:0 1px 3px #0003;transition:transform .2s ease,background .15s ease}.rt-switch input:checked+.rt-track{background:color-mix(in srgb,var(--primary) 22%,var(--surface-high))}.rt-switch input:checked+.rt-track .rt-thumb{transform:translate(24px);background:var(--primary)}.rt-toggle-label{flex:1;font-size:14px;font-weight:500;line-height:1.4;color:var(--on-surface-variant)}.rt-toggle-label--end{text-align:right}.rt-toggle-label.is-on{font-weight:700;color:var(--primary)}.rt-scale{display:flex;gap:8px}.rt-scale button{flex:1;min-width:0;min-height:40px;padding:6px 8px;border:1px solid var(--outline);border-radius:9999px;background:transparent;color:var(--primary);font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center}.rt-scale button:hover{background:color-mix(in srgb,var(--primary) 8%,transparent)}.rt-scale button[aria-pressed=true]{background:var(--primary);border-color:var(--primary);color:var(--on-primary);box-shadow:var(--elev-1)}.rt-glyph-a{line-height:1}.rt-lines{display:flex;flex-direction:column;justify-content:center;width:22px}.rt-lines span{display:block;height:2px;border-radius:999px;background:currentColor}.rt-field{display:block;width:100%;padding:12px 14px;border:1px solid transparent;border-radius:12px;background:var(--surface-container);font-size:13px!important;outline:none}.rt-field:hover{background:var(--surface-high)}.rt-field:focus{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}.rt-field::placeholder{color:var(--outline)}.rt-text-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:38px;margin-top:10px;padding:8px 16px;border:none;border-radius:9999px;background:color-mix(in srgb,var(--primary) 8%,var(--surface-lowest));color:var(--primary);font-weight:600!important;cursor:pointer}.rt-text-btn:hover{background:color-mix(in srgb,var(--primary) 14%,var(--surface-lowest))}.rt-text-btn:disabled{opacity:.5;cursor:progress}.rt-fonts{margin-top:10px}.rt-status{margin:10px 0 0;padding:10px 12px;border-radius:12px;background:var(--surface-container);font-size:12px;line-height:1.55;color:var(--on-surface-variant)}.rt-status.is-error{color:var(--error);background:color-mix(in srgb,var(--error) 10%,transparent)}.rt-font-list{max-height:240px;overflow-y:auto;margin:8px 0 0;padding:4px;list-style:none;border:1px solid var(--outline-variant);border-radius:12px;background:var(--surface-lowest)}.rt-font-group{padding:8px 10px 4px;font-size:11px;font-weight:600;letter-spacing:.04em;color:var(--on-surface-variant)}.rt-font-group:not(:first-child){margin-top:4px;border-top:1px solid var(--outline-variant)}.rt-font-item{padding:8px 10px;border-radius:8px;font-size:15px;line-height:1.35;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rt-font-item:hover{background:var(--surface-container)}.rt-font-item[aria-selected=true]{background:color-mix(in srgb,var(--primary) 16%,var(--surface-lowest));color:var(--primary);font-weight:600}.rt-foot{padding:0 16px 16px;font-size:11px;line-height:1.8;color:var(--on-surface-variant)}.rt-foot p{margin:0}.rt-kbd{display:inline-block;padding:1px 7px;border:1px solid var(--outline-variant);border-radius:6px;background:var(--surface-container);font-family:ui-monospace,Cascadia Code,Consolas,monospace;font-size:11px;font-weight:600;line-height:1.5;color:var(--on-surface)}.rt-link-btn{margin-top:8px;padding:0;border:none;background:none;color:var(--primary);font-size:12px!important;font-weight:600!important;text-decoration:underline;cursor:pointer}.rt-close-guide{position:fixed;top:12px;right:12px;padding:10px 20px;border:none;border-radius:9999px;background:#fffffff2;color:#0f172a;font-size:16px!important;font-weight:700!important;line-height:1;box-shadow:0 4px 16px #0f172a33;cursor:pointer;pointer-events:auto}.rt-close-guide:active{transform:scale(.96)}.is-panel-open .rt-close-guide{display:none}.pos-top-right .rt-close-guide{right:auto;left:12px}@media(max-width:480px){.rt-ui{--offset: 12px}.rt-panel,.no-launcher .rt-panel{left:8px!important;right:8px!important;width:auto;max-width:none}.rt-close-guide{top:max(12px,env(safe-area-inset-top));min-height:48px}}@media(prefers-reduced-motion:reduce){.rt-ui *{transition:none!important}}";

  // src/fonts.js
  function supportsLocalFonts() {
    return typeof window !== "undefined" && typeof window.queryLocalFonts === "function" && window.isSecureContext;
  }
  async function loadLocalFonts() {
    if (!supportsLocalFonts()) throw new Error("Local Font Access API is not available");
    const raw = Array.from(await window.queryLocalFonts());
    const families = /* @__PURE__ */ new Set();
    for (const f of raw) {
      const name = String(f.family || f.fullName || f.postscriptName || "").trim();
      if (name) families.add(name);
    }
    return [...families].sort((a, b) => a.localeCompare(b, void 0, { sensitivity: "base" })).map((name) => ({ name, label: name, recommended: /UD/.test(name) }));
  }

  // src/ui.js
  var POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left"];
  var ICONS = {
    // img/icon.svg から Illustrator の書き出し情報を除いたもの
    launcher: '<svg viewBox="0 0 256 256" aria-hidden="true"><rect width="256" height="256" rx="50" fill="#1a1a1a"/><rect y="78" width="256" height="100" fill="#94b95b"/><g fill="#2e3d19"><path d="M42.7,146.5q4.8-.9,7.6-3.6t2.8-6.2q0-5.4-4.7-7.5-3.3,8.9-9.2,14.1-5.9,5.2-12,5.2-3.9,0-6.3-2.4-2.3-2.4-2.3-6.5,0-4.9,3.1-8.7,3.1-3.8,8.6-5.8v-6.4h-9.8v-4.1h9.8v-5.7h4.8v5.7h20.9v4.1h-20.9v5.2q2.8-.4,5.8-.4,8,0,12.5,3.6,4.5,3.5,4.5,9.6,0,5.4-3.7,9.1-3.7,3.8-10.2,5.1L42.7,146.5ZM30.3,129.9q-3.2,1.6-5.1,4-1.8,2.4-1.8,5.2,0,2.4,1.1,3.7,1.1,1.3,3.2,1.3,1.2,0,2.6-.4V129.9ZM44,128q-1.3-.2-3.1-.2-3.1,0-5.8.6v12.6Q40.9,136.4,44,128Z"/><path d="M73.3,114.7q-2.2,7.6-2.2,16,0,5.8,2,9.7t3.9,4,3.5-2.9,4.3-8.4l4.6,1.8q-2.4,6.8-6,10.7-3.6,3.8-6.8,3.8-3.9,0-7.2-5.5-3.3-5.4-3.3-13.2,0-9,2.3-16.6L73.3,114.7ZM93.5,115.2l4.6-1.4q3.2,6.2,4.9,14.2,1.7,7.9,1.7,16.4h-5q0-7.8-1.6-15.5Q96.4,121.3,93.5,115.2Z"/><path d="M112.1,125.4q12.7-3.1,21.7-3.1,7.5,0,10.9,2.8t3.5,7.3q0,7.1-6.8,11.7-6.9,4.6-19.6,5.6l-1.2-4.6q11.3-1.1,16.9-4.5,5.6-3.3,5.6-8,0-5.7-9.6-5.7-7.4,0-20.3,2.9L112.1,125.4ZM119.4,110.3q11.5,1.7,21.8,1.7v4.5q-10.1,0-22.3-1.8L119.4,110.3Z"/><path d="M187.5,125.8l-10.7,8.5h0s.3,0,.3,0q1.4,0,2.3,1.2t1.7,4.8,1.7,3.7,3.4.7,5.9-.8l.8,4.3q-3.6,1-7.2,1-4.1,0-6.1-1.4-1.9-1.4-2.8-4.8-.8-2.9-1.5-4-.7-1.1-1.8-1.1-1.2,0-3.2,1.5-2.1,1.4-13.6,10.2l-2.8-3.7,26.8-20.6h0c0-.1-23.6-.1-23.6-.1v-4.3h30.4V125.8ZM161.9,114.4l.6-4.3q11.5,1.6,21.8,1.6v4.5Q174.1,116.2,161.9,114.4Z"/><path d="M201.6,115.1h11.5v-6.2h4.8v6.2h11.3v4.1h-11.3v7.1q1.7-.2,3.6-.2,7.1,0,11.5,3.3t4.3,7.8-3.4,8.8-10.2,3.9l-1-4.3q5-.6,7.3-2.6,2.4-2,2.4-5.6,0-2.7-3-4.7-3-2-7.9-2-2,0-3.6.1v11.2q0,4-1.6,5.6-1.6,1.6-5.6,1.6-4.5,0-7.8-2.9-3.2-2.9-3.2-7,0-4.1,3.5-7.5,3.5-3.4,9.9-4.8v-7.8h-11.5V115.1ZM213.1,131.6q-4.2,1.1-6.4,3.2-2.2,2-2.2,4.5,0,2.2,1.8,4,1.8,1.7,3.9,1.7,1.6,0,2.3-.7.6-.7.6-2.5V131.6ZM231,115.9l3.5-2.7q4.2,5.1,7.6,10.5l-3.7,2.4Q235,120.6,231,115.9Z"/></g></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    play: '<svg class="rt-icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    stop: '<svg class="rt-icon-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/></svg>',
    fit: '<svg class="rt-icon-fit" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fitExit: '<svg class="rt-icon-fit-exit" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var FONT_GLYPH_PX = { 100: 14, 150: 20, 200: 26 };
  var LINE_GAP_PX = { 100: 3, 200: 6, 400: 8 };
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  }
  function debounce(fn, ms) {
    let id = 0;
    const wrapped = (...args) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...args), ms);
    };
    wrapped.cancel = () => clearTimeout(id);
    return wrapped;
  }
  var Ui = class {
    /**
     * @param {object} controller
     * @param {{ messages: Record<string,string>, position: string, launcher: boolean, closeButton: boolean,
     *   shortcuts: boolean, fontPicker: boolean, zIndex: number }} opts
     */
    constructor(controller, opts) {
      this.c = controller;
      this.opts = opts;
      this.t = opts.messages;
      this.tHtml = Object.fromEntries(Object.entries(opts.messages).map(([k, v]) => [k, escapeHtml(v)]));
      this.host = null;
      this.root = null;
      this.fonts = null;
      this.open = false;
    }
    mount() {
      const t = this.tHtml;
      const pos = POSITIONS.includes(this.opts.position) ? this.opts.position : "bottom-right";
      const host = document.createElement("div");
      host.setAttribute(HOST_ATTR, "ui");
      host.style.setProperty("z-index", String(this.opts.zIndex + 1), "important");
      const root = host.attachShadow({ mode: "open" });
      const fontScaleButtons = FONT_SCALE_PERCENTS.map(
        (p) => `<button type="button" data-font-scale="${p}" aria-label="${p === 100 ? t.scaleNormal : `${p / 100}x`}" aria-pressed="false"><span class="rt-glyph-a" style="font-size:${FONT_GLYPH_PX[p]}px">A</span></button>`
      ).join("");
      const lineScaleButtons = LINE_SCALE_PERCENTS.map(
        (p) => `<button type="button" data-line-scale="${p}" aria-label="${p === 100 ? t.scaleNormal : `${p / 100}x`}" aria-pressed="false"><span class="rt-lines" style="gap:${LINE_GAP_PX[p]}px"><span></span><span></span><span></span></span></button>`
      ).join("");
      const showFontPicker = this.opts.fontPicker && supportsLocalFonts();
      root.innerHTML = `
<style>${panel_default}</style>
<div class="rt-ui pos-${pos}${this.opts.launcher ? "" : " no-launcher"}">
  ${this.opts.launcher ? `<button type="button" class="rt-launcher" data-el="launcher" aria-label="${t.launcher}" aria-expanded="false" aria-controls="rt-panel">${ICONS.launcher}</button>` : ""}
  ${this.opts.closeButton ? `<button type="button" class="rt-close-guide" data-el="closeGuide" hidden>${t.closeGuide}</button>` : ""}
  <section class="rt-panel" id="rt-panel" data-el="panel" role="dialog" aria-label="${t.panelTitle}" hidden>
    <header class="rt-head">
      <div class="rt-head-row">
        <h2 class="rt-title">${t.panelTitle}</h2>
        <button type="button" class="rt-icon-btn" data-el="closePanel" aria-label="${t.closePanel}">${ICONS.close}</button>
      </div>
      <div class="rt-run" role="group">
        <button type="button" class="rt-run-main" data-el="run">${ICONS.play}${ICONS.stop}<span data-el="runLabel">${t.start}</span></button>
        <button type="button" class="rt-run-fit" data-el="fit" aria-pressed="false" aria-label="${t.fitOn}" title="${t.fitOn}">${ICONS.fit}${ICONS.fitExit}</button>
      </div>
    </header>
    <div class="rt-body">
      <div class="rt-card">
        <div class="rt-section">
          <span class="rt-label" data-el="gapLabel">${t.gap}</span>
          <div class="rt-row">
            <input type="range" class="rt-slider" data-el="gapPx" min="${GAP_MIN}" max="${GAP_MAX}" step="2" aria-label="${t.gap}">
            <output class="rt-chip" data-el="gapPxOut"></output>
          </div>
          <div class="rt-row">
            <input type="color" class="rt-color" data-el="gapHex" aria-label="${t.gap}">
            <div class="rt-alpha">
              <span class="rt-label">${t.opacity}</span>
              <div class="rt-row">
                <input type="range" class="rt-slider" data-el="gapAlpha" min="0" max="100" aria-label="${t.opacity}">
                <output class="rt-chip" data-el="gapAlphaOut"></output>
              </div>
            </div>
          </div>
        </div>
        <div class="rt-section">
          <span class="rt-label">${t.mask}</span>
          <div class="rt-row">
            <input type="color" class="rt-color" data-el="maskHex" aria-label="${t.mask}">
            <div class="rt-alpha">
              <span class="rt-label">${t.opacity}</span>
              <div class="rt-row">
                <input type="range" class="rt-slider" data-el="maskAlpha" min="0" max="100" aria-label="${t.opacity}">
                <output class="rt-chip" data-el="maskAlphaOut"></output>
              </div>
            </div>
          </div>
        </div>
        <div class="rt-section">
          <div class="rt-row rt-between">
            <span class="rt-label" style="margin:0">${t.blend}</span>
            <label class="rt-switch"><input type="checkbox" data-el="blend" aria-label="${t.blend}"><span class="rt-track"><span class="rt-thumb"></span></span></label>
          </div>
        </div>
        <div class="rt-section">
          <span class="rt-label">${t.writing}</span>
          <div class="rt-row">
            <span class="rt-toggle-label" data-el="labelH">${t.horizontal}</span>
            <label class="rt-switch"><input type="checkbox" data-el="vertical" aria-label="${t.writing}: ${t.vertical}"><span class="rt-track"><span class="rt-thumb"></span></span></label>
            <span class="rt-toggle-label rt-toggle-label--end" data-el="labelV">${t.vertical}</span>
          </div>
        </div>
      </div>
      <div class="rt-card">
        <div class="rt-section">
          <span class="rt-label">${t.fontSize}</span>
          <div class="rt-scale" role="group" aria-label="${t.fontSize}">${fontScaleButtons}</div>
        </div>
        <div class="rt-section">
          <span class="rt-label">${t.lineHeight}</span>
          <div class="rt-scale" role="group" aria-label="${t.lineHeight}">${lineScaleButtons}</div>
          <p class="rt-note">${t.layoutNote}</p>
        </div>
        <div class="rt-section">
          <span class="rt-label">${t.font}</span>
          <input type="text" class="rt-field" data-el="font" placeholder="${t.fontPlaceholder}" spellcheck="false" autocomplete="off" aria-label="${t.font}">
          ${showFontPicker ? `<button type="button" class="rt-text-btn" data-el="loadFonts">${t.loadFonts}</button><div class="rt-fonts" data-el="fonts" hidden></div>` : ""}
        </div>
      </div>
    </div>
    <footer class="rt-foot">
      ${this.opts.shortcuts ? `<p>${t.shortcuts}:</p><p><span class="rt-kbd">Alt + Shift + G</span> ${t.shortcutGuide}</p><p><span class="rt-kbd">Alt + Shift + F</span> ${t.shortcutFit}</p><p><span class="rt-kbd">Esc</span> ${t.shortcutEsc}</p>` : ""}
      <button type="button" class="rt-link-btn" data-el="reset">${t.reset}</button>
    </footer>
  </section>
</div>`;
      this.host = host;
      this.root = root;
      this.el = {};
      root.querySelectorAll("[data-el]").forEach((node) => {
        this.el[node.getAttribute("data-el")] = node;
      });
      this.wrapper = root.querySelector(".rt-ui");
      (document.documentElement || document.body).appendChild(host);
      this.wire();
      this.render();
    }
    unmount() {
      var _a, _b;
      (_a = this.fontInputDebounced) == null ? void 0 : _a.cancel();
      this.fontListEl = null;
      (_b = this.host) == null ? void 0 : _b.remove();
      this.host = null;
      this.root = null;
      this.el = {};
      this.open = false;
    }
    /** このイベントが UI（パネル等）の上で発生したか */
    contains(e) {
      if (!this.host) return false;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      return path.includes(this.host);
    }
    setOpen(open) {
      var _a;
      if (!this.el.panel) return;
      this.open = !!open;
      this.el.panel.hidden = !this.open;
      this.wrapper.classList.toggle("is-panel-open", this.open);
      (_a = this.el.launcher) == null ? void 0 : _a.setAttribute("aria-expanded", this.open ? "true" : "false");
      if (this.open) {
        this.render();
        this.el.run.focus({ preventScroll: true });
      } else if (this.el.launcher && this.root.activeElement) {
        this.el.launcher.focus({ preventScroll: true });
      }
    }
    wire() {
      var _a, _b, _c;
      const { el, c } = this;
      const change = (patch) => c.update(patch);
      (_a = el.launcher) == null ? void 0 : _a.addEventListener("click", () => c.togglePanel());
      el.closePanel.addEventListener("click", () => c.closePanel());
      (_b = el.closeGuide) == null ? void 0 : _b.addEventListener("click", () => c.stop());
      el.run.addEventListener("click", () => c.toggle());
      el.fit.addEventListener("click", () => c.toggleFitScreen());
      el.reset.addEventListener("click", () => c.reset());
      el.gapPx.addEventListener("input", () => {
        el.gapPxOut.textContent = el.gapPx.value;
        if (c.isFitScreen()) c.setFitScreen(false);
        change({ gapPx: Number(el.gapPx.value) });
      });
      const color = (hexEl, alphaEl, outEl, key) => {
        const apply = () => {
          outEl.textContent = `${alphaEl.value}%`;
          change({ [key]: buildRgba(hexEl.value, Number(alphaEl.value)) });
        };
        hexEl.addEventListener("input", apply);
        alphaEl.addEventListener("input", apply);
      };
      color(el.gapHex, el.gapAlpha, el.gapAlphaOut, "gapColor");
      color(el.maskHex, el.maskAlpha, el.maskAlphaOut, "overlayColor");
      el.blend.addEventListener("change", () => change({ blendMultiply: el.blend.checked }));
      el.vertical.addEventListener("change", () => change({ verticalWriting: el.vertical.checked }));
      this.root.querySelectorAll("[data-font-scale]").forEach((btn) => {
        btn.addEventListener(
          "click",
          () => change({ pageFontSizePercent: Number(btn.getAttribute("data-font-scale")) })
        );
      });
      this.root.querySelectorAll("[data-line-scale]").forEach((btn) => {
        btn.addEventListener(
          "click",
          () => change({ pageLineHeightPercent: Number(btn.getAttribute("data-line-scale")) })
        );
      });
      this.fontInputDebounced = debounce(() => change({ pageFontFamily: el.font.value.trim() }), 250);
      el.font.addEventListener("input", this.fontInputDebounced);
      (_c = el.loadFonts) == null ? void 0 : _c.addEventListener("click", () => this.showFontList());
      el.panel.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") e.stopPropagation();
      });
    }
    /** 現在の設定と状態を UI に反映する */
    render() {
      if (!this.root) return;
      const { el, t } = this;
      const s = this.c.getSettings();
      const active2 = this.c.isActive();
      const fit = this.c.isFitScreen();
      this.wrapper.classList.toggle("is-active", active2);
      el.runLabel.textContent = active2 ? t.stop : t.start;
      if (el.closeGuide) el.closeGuide.hidden = !active2;
      el.fit.setAttribute("aria-pressed", fit ? "true" : "false");
      el.fit.setAttribute("aria-label", fit ? t.fitOff : t.fitOn);
      el.fit.title = fit ? t.fitOff : t.fitOn;
      el.gapLabel.textContent = s.verticalWriting ? t.gapVertical : t.gap;
      el.gapPx.value = String(s.gapPx);
      el.gapPxOut.textContent = String(s.gapPx);
      const gap = parseRgbaColor(s.gapColor, "#8fb89a", 25);
      el.gapHex.value = gap.hex;
      el.gapAlpha.value = String(gap.alphaPercent);
      el.gapAlphaOut.textContent = `${gap.alphaPercent}%`;
      const mask = parseRgbaColor(s.overlayColor, "#0f172a", 85);
      el.maskHex.value = mask.hex;
      el.maskAlpha.value = String(mask.alphaPercent);
      el.maskAlphaOut.textContent = `${mask.alphaPercent}%`;
      el.blend.checked = s.blendMultiply;
      el.vertical.checked = s.verticalWriting;
      el.labelH.classList.toggle("is-on", !s.verticalWriting);
      el.labelV.classList.toggle("is-on", s.verticalWriting);
      this.root.querySelectorAll("[data-font-scale]").forEach((btn) => {
        const on = Number(btn.getAttribute("data-font-scale")) === s.pageFontSizePercent;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      this.root.querySelectorAll("[data-line-scale]").forEach((btn) => {
        const on = Number(btn.getAttribute("data-line-scale")) === s.pageLineHeightPercent;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (this.root.activeElement !== el.font && el.font.value.trim() !== s.pageFontFamily) {
        el.font.value = s.pageFontFamily;
      }
      this.markSelectedFont(s.pageFontFamily);
    }
    async showFontList() {
      const { el } = this;
      const t = this.tHtml;
      if (!el.fonts) return;
      el.fonts.hidden = false;
      if (!this.fonts) {
        el.loadFonts.disabled = true;
        el.fonts.innerHTML = `<p class="rt-status">${t.loadingFonts}</p>`;
        try {
          this.fonts = await loadLocalFonts();
        } catch (_) {
          this.fonts = null;
          el.fonts.innerHTML = `<p class="rt-status is-error">${t.fontsFailed}</p>`;
          el.loadFonts.disabled = false;
          return;
        }
        el.loadFonts.disabled = false;
        if (!this.root) return;
        if (!this.fonts.length) {
          el.fonts.innerHTML = `<p class="rt-status is-error">${t.fontsEmpty}</p>`;
          this.fonts = null;
          return;
        }
      }
      el.loadFonts.hidden = true;
      el.fonts.innerHTML = `<input type="search" class="rt-field" data-role="filter" placeholder="${t.fontFilter}" aria-label="${t.fontFilter}" autocomplete="off"><ul class="rt-font-list" role="listbox" aria-label="${t.font}" tabindex="0"></ul>`;
      const filter = el.fonts.querySelector("[data-role=filter]");
      const list = el.fonts.querySelector("ul");
      this.fontListEl = list;
      const draw = () => {
        const q = filter.value.trim().toLowerCase();
        const match = (f) => !q || f.name.toLowerCase().includes(q) || f.label.toLowerCase().includes(q);
        const rec = this.fonts.filter((f) => f.recommended && match(f));
        const all = this.fonts.filter(match);
        const item = (f) => `<li class="rt-font-item" role="option" aria-selected="false" data-font="${escapeHtml(f.name)}" style="font-family:&quot;${escapeHtml(f.name.replace(/"/g, ""))}&quot;,sans-serif">${escapeHtml(f.label)}</li>`;
        list.innerHTML = [
          !q ? `<li class="rt-font-item" role="option" aria-selected="false" data-font="">${t.fontDefault}</li>` : "",
          rec.length ? `<li class="rt-font-group" role="presentation">${t.fontRecommended}</li>${rec.map(item).join("")}` : "",
          all.length ? `<li class="rt-font-group" role="presentation">${t.fontAll}</li>${all.map(item).join("")}` : ""
        ].join("");
        this.markSelectedFont(this.c.getSettings().pageFontFamily);
      };
      filter.addEventListener("input", draw);
      list.addEventListener("click", (e) => {
        var _a, _b;
        const li = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, "[data-font]");
        if (!li) return;
        const name = li.getAttribute("data-font");
        el.font.value = name;
        this.c.update({ pageFontFamily: name });
      });
      draw();
      filter.focus({ preventScroll: true });
    }
    markSelectedFont(name) {
      if (!this.fontListEl) return;
      this.fontListEl.querySelectorAll("[data-font]").forEach((li) => {
        li.setAttribute("aria-selected", li.getAttribute("data-font") === name ? "true" : "false");
      });
    }
  };

  // src/i18n.js
  var MESSAGES = {
    ja: {
      launcher: "読字ガイドの設定を開く",
      panelTitle: "リーディングトラッカー",
      closePanel: "設定を閉じる",
      start: "ガイドを表示",
      stop: "ガイドを終了",
      fitOn: "ガイドを画面いっぱいに広げる",
      fitOff: "ガイドの幅を戻す",
      closeGuide: "✕ ガイドを終了",
      gap: "ガイドの高さ(px)と色",
      gapVertical: "ガイドの幅(px)と色",
      mask: "マスクの色",
      opacity: "不透明度",
      blend: "文字くっきり",
      writing: "組み方向",
      horizontal: "横書き",
      vertical: "縦書き",
      fontSize: "文字サイズ",
      lineHeight: "行間",
      layoutNote: "※サイトによっては崩れる場合があります。",
      font: "フォント",
      fontPlaceholder: "例: BIZ UDPGothic",
      loadFonts: "インストール済みフォントから選ぶ",
      loadingFonts: "フォントを読み込んでいます…（許可を求められたら「許可」を選んでください）",
      fontsFailed: "フォント一覧を取得できませんでした。フォント名を入力してください。",
      fontsEmpty: "取得できたフォントがありません。",
      fontFilter: "フォントを絞り込む",
      fontRecommended: "おすすめ（UD フォント）",
      fontAll: "すべてのフォント",
      fontDefault: "（サイトのフォントのまま）",
      reset: "設定を初期値に戻す",
      shortcuts: "ショートカット",
      shortcutGuide: "ガイドの表示／終了",
      shortcutFit: "ガイドを広げる／戻す",
      shortcutEsc: "ガイドを終了",
      scaleNormal: "1x（標準）"
    },
    en: {
      launcher: "Open reading guide settings",
      panelTitle: "Reading Tracker",
      closePanel: "Close settings",
      start: "Show guide",
      stop: "Hide guide",
      fitOn: "Expand guide to full screen",
      fitOff: "Restore guide size",
      closeGuide: "✕ Hide guide",
      gap: "Guide height (px) and color",
      gapVertical: "Guide width (px) and color",
      mask: "Mask color",
      opacity: "Opacity",
      blend: "Sharper text",
      writing: "Writing mode",
      horizontal: "Horizontal",
      vertical: "Vertical",
      fontSize: "Text size",
      lineHeight: "Line spacing",
      layoutNote: "* Some sites may not display correctly.",
      font: "Font",
      fontPlaceholder: "e.g. Verdana",
      loadFonts: "Choose from installed fonts",
      loadingFonts: "Loading fonts… (allow access if your browser asks)",
      fontsFailed: "Could not load the font list. Please type a font name.",
      fontsEmpty: "No fonts were found.",
      fontFilter: "Filter fonts",
      fontRecommended: "Recommended (UD fonts)",
      fontAll: "All fonts",
      fontDefault: "(Use the site's font)",
      reset: "Reset to defaults",
      shortcuts: "Shortcuts",
      shortcutGuide: "Show / hide guide",
      shortcutFit: "Expand / restore guide",
      shortcutEsc: "Hide guide",
      scaleNormal: "1x (default)"
    }
  };
  function resolveLang(lang) {
    let l = lang;
    if (!l || l === "auto") {
      l = (document.documentElement.lang || navigator.language || "en").toLowerCase();
    }
    return String(l).toLowerCase().startsWith("ja") ? "ja" : "en";
  }
  function getMessages(lang, overrides) {
    return { ...MESSAGES[resolveLang(lang)], ...overrides || {} };
  }

  // src/index.js
  var VERSION = "0.1.1";
  var DEFAULT_OPTIONS = Object.freeze({
    launcher: true,
    position: "bottom-right",
    closeButton: true,
    shortcuts: true,
    persist: true,
    resume: true,
    fontPicker: true,
    storageKey: "reading-tracker",
    contentSelector: "body",
    lang: "auto",
    messages: null,
    settings: null,
    zIndex: 2147483646
  });
  var options = null;
  var store = null;
  var overlay = null;
  var ui = null;
  var baseSettings = DEFAULT_SETTINGS;
  var settings = { ...DEFAULT_SETTINGS };
  var active = false;
  var fitScreen = false;
  var keyAbort = null;
  var readyQueue = [];
  var listeners = /* @__PURE__ */ new Map();
  function emit(type, detail) {
    (listeners.get(type) || []).forEach((fn) => {
      try {
        fn(detail);
      } catch (err) {
        console.error("[ReadingTracker]", err);
      }
    });
  }
  function flushReadyQueue() {
    const queue = readyQueue;
    readyQueue = [];
    queue.forEach((fn) => fn());
  }
  function whenReady(fn) {
    if (document.readyState !== "loading") {
      fn();
      return;
    }
    readyQueue.push(fn);
    if (readyQueue.length === 1) {
      document.addEventListener("DOMContentLoaded", flushReadyQueue, { once: true });
    }
  }
  function ensureInit() {
    if (!options) tracker.init();
  }
  function onKeyDown(e) {
    if (e.key === "Escape") {
      if (ui == null ? void 0 : ui.open) {
        e.preventDefault();
        tracker.closePanel();
      } else if (active) {
        e.preventDefault();
        tracker.stop();
      }
      return;
    }
    if (!options.shortcuts || !e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
    if (e.code === "KeyG") {
      e.preventDefault();
      tracker.toggle();
    } else if (e.code === "KeyF" && active) {
      e.preventDefault();
      tracker.toggleFitScreen();
    }
  }
  var tracker = {
    version: VERSION,
    DEFAULT_SETTINGS,
    /**
     * 初期化する。再度呼ぶと、いったん破棄してから新しいオプションで作り直す。
     * @param {import("../types/index").ReadingTrackerOptions} [opts]
     */
    init(opts = {}) {
      if (typeof window === "undefined" || typeof document === "undefined") return tracker;
      if (options) tracker.destroy();
      options = { ...DEFAULT_OPTIONS, ...opts };
      store = createStore(options.storageKey, options);
      baseSettings = normalizeSettings(options.settings, DEFAULT_SETTINGS);
      settings = normalizeSettings(store.readSettings(), baseSettings);
      const session = store.readSession();
      fitScreen = !!session.fitScreen;
      active = false;
      overlay = new Overlay({
        contentSelector: options.contentSelector,
        zIndex: options.zIndex,
        shouldIgnoreEvent: (e) => !!(ui == null ? void 0 : ui.contains(e))
      });
      keyAbort = new AbortController();
      window.addEventListener("keydown", onKeyDown, { capture: true, signal: keyAbort.signal });
      whenReady(() => {
        ui = new Ui(tracker, {
          messages: getMessages(options.lang, options.messages),
          position: options.position,
          launcher: options.launcher,
          closeButton: options.closeButton,
          shortcuts: options.shortcuts,
          fontPicker: options.fontPicker,
          zIndex: options.zIndex
        });
        ui.mount();
        if (session.active) tracker.start();
      });
      return tracker;
    },
    /** ガイドを表示する */
    start() {
      ensureInit();
      if (active) return tracker;
      if (!document.body) {
        whenReady(() => tracker.start());
        return tracker;
      }
      active = true;
      overlay.mount(settings, fitScreen);
      store.writeSession({ active: true });
      ui == null ? void 0 : ui.render();
      emit("start");
      return tracker;
    },
    /** ガイドを終了する（ページの文字サイズ・行間・フォントも元に戻る） */
    stop() {
      if (!options || !active) return tracker;
      active = false;
      overlay.unmount();
      store.writeSession({ active: false });
      ui == null ? void 0 : ui.render();
      emit("stop");
      return tracker;
    },
    toggle() {
      return active ? tracker.stop() : tracker.start();
    },
    isActive() {
      return active;
    },
    /** 読む帯を画面いっぱいに広げる（タブを閉じるまで保持） */
    setFitScreen(on) {
      ensureInit();
      const next = !!on;
      if (next === fitScreen) return tracker;
      fitScreen = next;
      overlay.setFitScreen(fitScreen);
      store.writeSession({ fitScreen });
      ui == null ? void 0 : ui.render();
      emit("fitscreenchange", fitScreen);
      return tracker;
    },
    toggleFitScreen() {
      return tracker.setFitScreen(!fitScreen);
    },
    isFitScreen() {
      return fitScreen;
    },
    /** 設定を変更する（表示中ならその場で反映し、保存する） */
    update(patch) {
      ensureInit();
      settings = normalizeSettings({ ...settings, ...pickSettings(patch) }, baseSettings);
      overlay.update(settings);
      store.writeSettings(settings);
      ui == null ? void 0 : ui.render();
      emit("change", { ...settings });
      return tracker;
    },
    getSettings() {
      return { ...settings };
    },
    /** 利用者が保存した設定を消し、サイトの初期値に戻す */
    reset() {
      ensureInit();
      store.clearSettings();
      settings = { ...baseSettings };
      overlay.update(settings);
      ui == null ? void 0 : ui.render();
      emit("change", { ...settings });
      return tracker;
    },
    openPanel() {
      ensureInit();
      if (!ui) {
        whenReady(() => tracker.openPanel());
        return tracker;
      }
      if (!ui.open) {
        ui.setOpen(true);
        emit("panelopen");
      }
      return tracker;
    },
    closePanel() {
      if (ui == null ? void 0 : ui.open) {
        ui.setOpen(false);
        emit("panelclose");
      }
      return tracker;
    },
    togglePanel() {
      return (ui == null ? void 0 : ui.open) ? tracker.closePanel() : tracker.openPanel();
    },
    /** すべての DOM とイベントを取り除く（保存済みの設定は残る） */
    destroy() {
      if (!options) return tracker;
      readyQueue = [];
      if (active) {
        overlay.unmount();
        active = false;
      }
      ui == null ? void 0 : ui.unmount();
      ui = null;
      overlay = null;
      keyAbort == null ? void 0 : keyAbort.abort();
      keyAbort = null;
      options = null;
      store = null;
      return tracker;
    },
    /**
     * イベントを購読する。戻り値の関数を呼ぶと解除。
     * @param {"start"|"stop"|"change"|"fitscreenchange"|"panelopen"|"panelclose"} type
     */
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
      return () => tracker.off(type, fn);
    },
    off(type, fn) {
      const arr = listeners.get(type);
      if (arr) listeners.set(type, arr.filter((f) => f !== fn));
      return tracker;
    }
  };
  var index_default = tracker;

  // src/browser.js
  var BOOLEAN_OPTIONS = ["launcher", "closeButton", "shortcuts", "persist", "resume", "fontPicker"];
  var STRING_OPTIONS = ["position", "storageKey", "contentSelector", "lang"];
  function parseBool(v) {
    return !(v === "false" || v === "0" || v === "no" || v === "off");
  }
  function readScriptOptions(script2) {
    const d = script2.dataset;
    const opts = {};
    for (const key of BOOLEAN_OPTIONS) if (key in d) opts[key] = parseBool(d[key]);
    for (const key of STRING_OPTIONS) if (d[key]) opts[key] = d[key];
    if (d.zIndex && Number.isFinite(Number(d.zIndex))) opts.zIndex = Number(d.zIndex);
    if (d.settings) {
      try {
        opts.settings = JSON.parse(d.settings);
      } catch (err) {
        console.warn("[ReadingTracker] data-settings is not valid JSON", err);
      }
    }
    return opts;
  }
  window.ReadingTracker = index_default;
  var script = document.currentScript;
  if (script && script.hasAttribute("data-auto-init")) {
    index_default.init(readScriptOptions(script));
  }
})();
