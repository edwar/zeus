// Lista lo que falta por completar en src/lib/legal/config.ts antes de publicar las políticas.
//   pnpm legal:check        → sale con código 1 si queda algo pendiente
import { pendingFields } from "../src/lib/legal/config";

const pending = pendingFields();
if (pending.length === 0) {
  console.log("✔ Políticas completas: no queda ningún dato pendiente en src/lib/legal/config.ts");
} else {
  console.error(`✘ Faltan ${pending.length} datos en src/lib/legal/config.ts (no publiques las políticas así):`);
  for (const p of pending) console.error(`  - ${p}`);
  process.exitCode = 1;
}
