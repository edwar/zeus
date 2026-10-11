import test from "node:test";
import assert from "node:assert/strict";
import { installFee } from "../src/lib/install-fee";

test("sin tarifa no hay valor", () => {
  assert.equal(installFee({ installBase: null, installPerKwp: null }, 5), null);
});

test("base + valor por kWp, redondeado al centenar", () => {
  assert.equal(installFee({ installBase: 500_000, installPerKwp: 250_000 }, 5), 1_750_000);
  assert.equal(installFee({ installBase: 500_000, installPerKwp: 250_000 }, 1.85), 962_500);
  assert.equal(installFee({ installBase: null, installPerKwp: 300_000 }, 2.33), 699_000);
  assert.equal(installFee({ installBase: 400_000, installPerKwp: null }, 12), 400_000);
});
