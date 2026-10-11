import { cleanup } from "./support/db";
import { assertLocal } from "./support/env";

export default async function globalTeardown() {
  assertLocal();
  cleanup();
}
