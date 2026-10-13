import { mkdirSync, writeFileSync } from "node:fs";
import type { Browser, BrowserContextOptions, Locator, Page } from "@playwright/test";
import { authFile, type RoleKey } from "../../support/env";

// Fuera de test-results: Playwright limpia esa carpeta en cada corrida y se perderían los videos en bruto de las corridas anteriores.
export const RAW_DIR = ".videos-raw";
export const VIEWPORT = { width: 1024, height: 576 }; // 1:1 con el video: el texto se lee igual que en la pantalla
export const MOBILE_VIEWPORT = { width: 390, height: 760 }; // celular en vertical (modo campo)

// Cursor visible, onda al hacer clic y subtítulo. Se inyecta en cada página (los videos no llevan audio).
const OVERLAY = `(() => {
  if (window.__tour) return;
  // El desenfoque de fondo (backdrop-filter) hace que la captura de video headless no pinte los diálogos: se desactiva solo al grabar.
  const CSS = '*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' +
    '#__t_cur{display:' + (window.__tourMobile ? 'none' : 'block') + ';position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}' +
    '.__t_rip{position:fixed;z-index:2147483646;pointer-events:none;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:rgba(255,193,28,.55);border:3px solid #ffc11c;animation:__t_rip .55s ease-out forwards}' +
    '@keyframes __t_rip{to{transform:scale(3.2);opacity:0}}' +
    '#__t_cap{position:fixed;left:50%;bottom:' + (window.__tourMobile ? '92' : '22') + 'px;transform:translateX(-50%);max-width:88%;z-index:2147483647;pointer-events:none;padding:10px 20px;border-radius:14px;background:rgba(11,31,24,.92);color:#fff;font:700 ' + (window.__tourMobile ? '18' : '21') + 'px/1.3 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.3);transition:opacity .25s}';
  let cur, cap;
  function ensure() {
    if (cur && cur.isConnected) return;
    const st = document.createElement('style'); st.textContent = CSS; document.documentElement.appendChild(st);
    cur = document.createElement('div'); cur.id = '__t_cur';
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#0b1f18" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    cur.style.transform = 'translate(' + (window.__tx || -50) + 'px,' + (window.__ty || -50) + 'px)';
    document.documentElement.appendChild(cur);
    cap = document.createElement('div'); cap.id = '__t_cap'; cap.style.opacity = '0';
    document.documentElement.appendChild(cap);
    if (window.__text) { cap.textContent = window.__text; cap.style.opacity = '1'; }
  }
  addEventListener('mousemove', (e) => { ensure(); window.__tx = e.clientX - 3; window.__ty = e.clientY - 2; cur.style.transform = 'translate(' + window.__tx + 'px,' + window.__ty + 'px)'; }, true);
  addEventListener('mousedown', (e) => { ensure(); const r = document.createElement('div'); r.className = '__t_rip'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.documentElement.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
  window.__tour = { say(t) { window.__text = t; ensure(); cap.textContent = t || ''; cap.style.opacity = t ? '1' : '0'; } };
})();`;

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Una grabación: mueve el cursor con suavidad, escribe subtítulos y guarda el video bruto con el instante en que empieza lo útil. */
export class Tour {
  private from = { x: 80, y: 80 };
  private startedAt = Date.now();
  private begunAt = 0;
  constructor(readonly page: Page, private readonly ctx: Awaited<ReturnType<Browser["newContext"]>>, private readonly lang: string, private readonly viewport: { width: number; height: number } = VIEWPORT) {}

  /** Simula perder o recuperar la señal (para mostrar el modo campo sin conexión). */
  offline(on: boolean) { return this.ctx.setOffline(on); }

  /** Marca dónde empieza el video útil (después de la carga inicial) para recortar los primeros cuadros en blanco. */
  begin() { this.begunAt = Date.now(); }

  /** Tiempo para leer un subtítulo con calma (≈ 17 caracteres por segundo, mínimo 2,2 s y máximo 7 s). */
  static reading(text: string) { return Math.min(7000, Math.max(2200, 1000 + text.length * 60)); }

  /** Muestra un subtítulo y espera lo que toma leerlo antes de seguir (o `hold` ms si se indica). */
  async say(text: string, hold?: number) {
    await this.page.evaluate((t) => (window as unknown as { __tour: { say: (s: string) => void } }).__tour?.say(t), text);
    if (text) await this.pause(hold ?? Tour.reading(text));
  }
  pause(ms: number) { return sleep(ms); }

  /** Desplazamiento suave (con aceleración y frenado) hasta dejar el elemento en el tercio superior, lejos del subtítulo. */
  async scrollTo(target: Locator) {
    const box = await target.boundingBox();
    if (!box) return;
    if (box.y >= 110 && box.y + box.height <= this.viewport.height - 130) return; // ya se ve cómodo
    await target.evaluate(async (el) => {
      const vh = window.innerHeight;
      let scroller: Element = document.scrollingElement!;
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight) { scroller = p; break; }
      }
      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto"; // el CSS «smooth» de la página competiría con esta animación
      const delta = el.getBoundingClientRect().top - vh * 0.3;
      const start = scroller.scrollTop;
      const dur = Math.min(1600, 600 + Math.abs(delta) * 1.1);
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const step = (now: number) => {
          const k = Math.min(1, (now - t0) / dur);
          scroller.scrollTop = start + delta * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
          if (k < 1) requestAnimationFrame(step); else { root.style.scrollBehavior = prev; done(); }
        };
        requestAnimationFrame(step);
      });
    });
    await sleep(450);
  }

  /** Lleva el cursor hasta el elemento, sin prisa. */
  async glide(target: Locator) {
    await this.scrollTo(target);
    const box = await target.boundingBox();
    if (!box) return;
    const to = { x: box.x + Math.min(box.width / 2, 120), y: box.y + box.height / 2 };
    const steps = 44;
    for (let i = 1; i <= steps; i++) {
      const k = ease(i / steps);
      await this.page.mouse.move(this.from.x + (to.x - this.from.x) * k, this.from.y + (to.y - this.from.y) * k);
      await sleep(16);
    }
    this.from = to;
    await sleep(500);
  }

  async click(target: Locator, after = 1300) {
    await this.glide(target);
    await target.click();
    await sleep(after);
  }

  /** Escribe un campo despacio: el cursor llega, se explica el campo, se escribe letra a letra y se da tiempo para ver el resultado. */
  async type(target: Locator, text: string, explain?: string) {
    await this.glide(target);
    await target.click();
    await target.fill("");
    if (explain) await this.say(explain);
    await sleep(500);
    await target.pressSequentially(text, { delay: 180 });
    await sleep(1400);
  }

  /** Para campos que no se escriben letra a letra (fechas, selectores): se explican y se llenan de una vez. */
  async set(target: Locator, value: string, explain?: string) {
    await this.glide(target);
    await target.click();
    if (explain) await this.say(explain);
    await target.fill(value);
    await sleep(1400);
  }

  async finish(name: string) {
    const video = this.page.video();
    const trim = Math.max(0, (this.begunAt - this.startedAt) / 1000 - 0.2);
    await this.say("");
    await sleep(500);
    await this.page.close();
    await this.ctx.close();
    mkdirSync(RAW_DIR, { recursive: true });
    await video!.saveAs(`${RAW_DIR}/${name}.webm`);
    writeFileSync(`${RAW_DIR}/${name}.json`, JSON.stringify({ trim: Math.round(trim * 100) / 100 }));
  }
}

/** Abre una página con cursor y subtítulos, grabando video. `role` = con la sesión de ese rol; sin rol, como visitante. */
export async function startTour(browser: Browser, opts: { role?: RoleKey; lang?: string; mobile?: boolean } = {}) {
  const lang = opts.lang ?? "es";
  const viewport = opts.mobile ? MOBILE_VIEWPORT : VIEWPORT;
  const options: BrowserContextOptions = {
    viewport,
    locale: lang === "en" ? "en-US" : "es-CO",
    recordVideo: { dir: `${RAW_DIR}/tmp`, size: viewport },
    ...(opts.role && { storageState: authFile(opts.role) }),
  };
  const ctx = await browser.newContext(options);
  if (opts.mobile) await ctx.addInitScript("window.__tourMobile = true;");
  await ctx.addInitScript(OVERLAY);
  const page = await ctx.newPage();
  return new Tour(page, ctx, lang, viewport);
}
