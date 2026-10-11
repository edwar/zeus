import type { Browser, BrowserContextOptions, Page } from "@playwright/test";
import { authFile, type RoleKey } from "./env";

/** Abre una página con la sesión guardada de un rol (se cierra con `close()`). */
export async function as(browser: Browser, role: RoleKey, options: BrowserContextOptions = {}): Promise<Page & { close: () => Promise<void> }> {
  const ctx = await browser.newContext({ storageState: authFile(role), locale: "es-CO", viewport: { width: 1280, height: 900 }, ...options });
  const page = await ctx.newPage();
  const close = page.close.bind(page);
  page.close = async () => { await close(); await ctx.close(); };
  return page;
}
