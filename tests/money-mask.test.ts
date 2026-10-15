import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, moneyDigits } from "../src/lib/money-mask";

test("agrupa miles con punto y millones con apóstrofo", () => {
  assert.equal(formatMoney("5"), "5");
  assert.equal(formatMoney("1200"), "1.200");
  assert.equal(formatMoney("1200000"), "1'200.000");
  assert.equal(formatMoney("1200000000"), "1.200'000.000");
});

test("deja solo dígitos y quita ceros a la izquierda", () => {
  assert.equal(moneyDigits("1'200.000"), "1200000");
  assert.equal(moneyDigits("007"), "7");
  assert.equal(moneyDigits("abc"), "");
  assert.equal(moneyDigits(null), "");
  assert.equal(moneyDigits(1234.6), "1235");
});
