// Comprime los videos brutos de Playwright (test-results/videos-raw) y los deja donde los usan las guías:
//   - nombre «NN-tema»            → guía del equipo:    docs/guia-equipo/videos/   (se sirven con sesión)
//   - nombre «NN-tema.es|en»      → guía del comprador: public/guia/               (públicos)
// Por video: WebM VP9 (el más liviano; Chrome, Firefox, Edge, Android y Safari reciente), MP4 H.264 (para móviles y Safari antiguos)
// y un póster JPG. Sin audio, 15 cuadros por segundo, 1024×576: texto legible y menos de 1 MB por clip de un minuto.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const RAW = ".videos-raw";
const run = (bin, args) => execFileSync(bin, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });

// ffmpeg que trae Playwright (solo VP9/VP8, sin H.264) y ffmpeg completo del sistema (si funciona).
const pwDir = join(homedir(), "Library/Caches/ms-playwright");
const pw = existsSync(pwDir) ? readdirSync(pwDir).filter((d) => d.startsWith("ffmpeg-")).sort().reverse().map((d) => join(pwDir, d, "ffmpeg-mac")).find(existsSync) : null;
const sys = (() => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" });
  return r.status === 0 && r.stdout.includes("libx264") ? "ffmpeg" : null;
})();
const vp9 = pw ?? sys;
if (!vp9) throw new Error("No hay ffmpeg: instala Playwright (pnpm exec playwright install) o ffmpeg.");
if (!sys) console.warn("⚠ El ffmpeg del sistema no funciona: se generan solo los WebM (sin MP4). Repáralo con «brew upgrade ffmpeg» y vuelve a correr pnpm videos:encode.");

let total = 0;
for (const f of readdirSync(RAW).filter((x) => x.endsWith(".webm")).sort()) {
  const name = f.replace(/\.webm$/, "");
  const buyer = /\.(es|en)$/.test(name);
  const out = buyer ? "public/guia" : "docs/guia-equipo/videos";
  mkdirSync(out, { recursive: true });
  const src = join(RAW, f);
  const meta = existsSync(join(RAW, `${name}.json`)) ? JSON.parse(readFileSync(join(RAW, `${name}.json`), "utf8")) : { trim: 0 };
  const ss = ["-ss", String(meta.trim)];
  const common = ["-an", "-r", "15"];
  run(vp9, [...ss, "-i", src, ...common, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "44", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", join(out, `${name}.webm`)]);
  if (sys) {
    run(sys, [...ss, "-i", src, ...common, "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", join(out, `${name}.mp4`)]);
    // Póster: un cuadro sin subtítulo cerca del inicio, a 640 px.
    run(sys, [...ss, "-i", src, "-ss", "1.2", "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "6", join(out, `${name}.jpg`)]);
  }
  if (!sys && existsSync("/usr/bin/sips")) {
    // Sin el ffmpeg completo: cuadro PNG con el de Playwright y a JPG con «sips» (viene con macOS).
    const png = join(RAW, `${name}.poster.png`);
    run(pw, [...ss, "-i", src, "-ss", "1.2", "-frames:v", "1", "-vf", "scale=640:-2", png]);
    execFileSync("/usr/bin/sips", ["-s", "format", "jpeg", "-s", "formatOptions", "55", png, "--out", join(out, `${name}.jpg`)], { stdio: "ignore" });
  }
  const sizes = readdirSync(out).filter((x) => x.startsWith(`${name}.`)).map((x) => `${x.split(".").slice(-1)} ${(statSync(join(out, x)).size / 1024).toFixed(0)} KB`);
  total += 1;
  console.log(`✓ ${out}/${name}  →  ${sizes.join(" · ")}`);
}

// Videos que ya estaban comprimidos y no tienen MP4 (su video en bruto ya no existe): el MP4 sale del propio WebM.
if (sys) {
  for (const out of ["public/guia", "docs/guia-equipo/videos"]) {
    if (!existsSync(out)) continue;
    for (const f of readdirSync(out).filter((x) => x.endsWith(".webm") && !existsSync(join(out, x.replace(/\.webm$/, ".mp4"))))) {
      const base = join(out, f.replace(/\.webm$/, ""));
      run(sys, ["-i", `${base}.webm`, "-an", "-r", "15", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${base}.mp4`]);
      console.log(`✓ ${base}.mp4  (a partir del WebM: ${(statSync(`${base}.mp4`).size / 1024).toFixed(0)} KB)`);
    }
  }
}
console.log(`${total} video(s) listos.`);
