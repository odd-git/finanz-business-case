// Controllo delle soglie: node lib/rinnovo.check.mts
import assert from "node:assert/strict";
import { finestra, mesiAllaScadenza, vociChecklist } from "./rinnovo.ts";

const ottobre = new Date(2026, 9, 11);
assert.equal(mesiAllaScadenza(9, ottobre), 0); // scade questo mese
assert.equal(mesiAllaScadenza(0, ottobre), 3); // gennaio
assert.equal(mesiAllaScadenza(8, ottobre), 11); // settembre: appena passato, il prossimo è tra 11 mesi

assert.equal(finestra("rc_auto", 11, ottobre), "open"); // dicembre, entro 2 mesi
assert.equal(finestra("rc_auto", 0, ottobre), "far"); // gennaio, 3 mesi: oltre la soglia RC auto
assert.equal(finestra("casa", 0, ottobre), "open"); // gennaio, entro 3 mesi
assert.equal(finestra("salute", 1, ottobre), "far");
assert.equal(finestra("vita", null, ottobre), "unknown");

assert.equal(vociChecklist("rc_auto").length, 4);
assert.equal(vociChecklist("dentale").length, 5);
console.log("rinnovo: ok");
