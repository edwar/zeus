import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { GUIDE_VIDEO_FILE, STEP_VIDEOS, parseRange } from "../src/lib/guide-video";

test("rangos de bytes: inicio-fin, abierto, últimos N y los inválidos", () => {
  assert.deepEqual(parseRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseRange("bytes=500-", 1000), { start: 500, end: 999 });
  assert.deepEqual(parseRange("bytes=-100", 1000), { start: 900, end: 999 });
  assert.deepEqual(parseRange("bytes=900-5000", 1000), { start: 900, end: 999 }); // el fin se acota al tamaño
  assert.equal(parseRange("bytes=1000-", 1000), "invalid");
  assert.equal(parseRange("bytes=50-10", 1000), "invalid");
  assert.equal(parseRange(null, 1000), null);
  assert.equal(parseRange("items=0-1", 1000), null);
  assert.equal(parseRange("bytes=-", 1000), null);
});

test("solo se sirven archivos con nombre simple y extensión de video o póster", () => {
  for (const ok of ["02-aprobar-solicitud.webm", "02-aprobar-solicitud.mp4", "x1.jpg"]) assert.ok(GUIDE_VIDEO_FILE.test(ok), ok);
  for (const bad of ["../.env", "..%2F.env", "a/b.webm", ".webm", "-x.webm", "x.webm.exe", "X.webm", "a.WEBM", "a b.mp4", "x.png"]) assert.ok(!GUIDE_VIDEO_FILE.test(bad), bad);
});

test("todo video que cita la guía del equipo existe (video y póster): nada de reproductores vacíos", () => {
  const dir = "docs/guia-equipo";
  const cited = new Set<string>();
  for (const f of readdirSync(dir).filter((x) => /^\d\d-.*\.md$/.test(x))) {
    for (const m of readFileSync(`${dir}/${f}`, "utf8").matchAll(/!\[[^\]]*\]\(video:([a-z0-9-]+)\)/g)) cited.add(m[1]);
  }
  assert.ok(cited.size >= 8, `se esperaban varios videos citados, hay ${cited.size}`);
  for (const name of cited) for (const ext of ["webm", "jpg"]) assert.ok(existsSync(`${dir}/videos/${name}.${ext}`), `${name}.${ext}`);
});

test("los videos de la guía del comprador existen en español y en inglés", () => {
  for (const { file } of Object.values(STEP_VIDEOS)) {
    for (const lang of ["es", "en"]) for (const ext of ["webm", "jpg"]) assert.ok(existsSync(`public/guia/${file}.${lang}.${ext}`), `${file}.${lang}.${ext}`);
  }
});
