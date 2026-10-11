// "Il tuo rinnovo": per chi è già assicurato, quando ha senso confrontare.
// Regole generali (da verificare sul singolo contratto):
// - RC auto: niente rinnovo tacito (DL 179/2012, art. 170-bis CAP), la copertura vale fino a 15 giorni dopo la scadenza.
// - Altri rami: rinnovo tacito, disdetta di solito 60 giorni prima della scadenza.
import type { Intento, Ramo } from "@/lib/utenti";

export const GIA_ASSICURATO: Intento = "Sì, ne ho già una o più";

export type Finestra = "open" | "far" | "unknown";

export const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

// Finestra aperta se la scadenza cade entro questi mesi (il mese in corso conta come 0).
const SOGLIA_MESI: Record<Ramo, number> = { rc_auto: 2, casa: 3, salute: 3, vita: 3, dentale: 3 };
// Il promemoria arriva questi giorni prima della scadenza.
export const PREAVVISO_GIORNI: Record<Ramo, number> = { rc_auto: 30, casa: 90, salute: 90, vita: 90, dentale: 90 };

// mese: 0-11 come Date.getMonth(), null = "Non lo so". Il giorno esatto non lo chiediamo.
export function mesiAllaScadenza(mese: number, oggi: Date) {
  return (mese - oggi.getMonth() + 12) % 12;
}

export function finestra(ramo: Ramo, mese: number | null, oggi = new Date()): Finestra {
  if (mese === null) return "unknown";
  return mesiAllaScadenza(mese, oggi) <= SOGLIA_MESI[ramo] ? "open" : "far";
}

// La strada della schermata partner: undefined = non è già assicurato, schermata di oggi.
// Chi è già assicurato ma non è passato dalla card conta come "Non lo so".
export function finestraUtente(intento: Intento, ramo: Ramo, rinnovo?: { mese: number | null }) {
  return intento === GIA_ASSICURATO ? finestra(ramo, rinnovo?.mese ?? null) : undefined;
}

// Le voci della checklist "Rileggi la tua": le lezioni applicate alla propria polizza.
export function vociChecklist(ramo: Ramo) {
  const voci = ["Quanto paghi all'anno", "Il massimale", "La franchigia o lo scoperto", "Le esclusioni"];
  // L'RC auto scade e basta: non c'è una disdetta da mandare.
  return ramo === "rc_auto" ? voci : [...voci, "Entro quando va mandata la disdetta"];
}
