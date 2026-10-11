"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUtente } from "@/components/Providers";
import { BottomBar, ChipStato, Icona, PrimaryButton, SecondaryButton, TastoTondo } from "@/components/ui";
import { NOME_RAMO, type Ramo } from "@/lib/utenti";
import { MESI, PREAVVISO_GIORNI, finestraUtente } from "@/lib/rinnovo";

const OGGETTO: Partial<Record<Ramo, string>> = { casa: "casa del tuo immobile" };
const AVVISO: Partial<Record<Ramo, string>> = { vita: "Ti chiederemo anche qualche dato sulla tua salute." };

// La schermata che porta al comparatore del partner, dopo il percorso.
// Chi è già assicurato ("Il tuo rinnovo") vede una strada diversa a seconda della scadenza:
// open = confronta ora · far = promemoria, confronto come seconda scelta · unknown = confronta ora, promemoria come seconda scelta.
export default function SchermataPartner() {
  const { utente, progresso, salvaRinnovo, track, toast } = useUtente();
  const router = useRouter();
  const tracciato = useRef(false);
  const fin = finestraUtente(utente.onboarding_intent, utente.ramo, progresso.rinnovo);
  const mese = progresso.rinnovo?.mese ?? null;
  const promemoria = progresso.rinnovo?.promemoria ?? false;
  const ramo = OGGETTO[utente.ramo] ?? NOME_RAMO[utente.ramo];

  useEffect(() => {
    if (tracciato.current) return;
    tracciato.current = true;
    track("Partner Screen Viewed", fin ? { window: fin } : {});
  }, [track, fin]);

  const confronta = () => {
    track("Partner CTA Clicked", fin ? { window: fin } : {});
    router.push("/comparatore");
  };

  const avvisami = () => {
    track("Reminder Opt-in", {
      window: fin ?? "unknown",
      reminder_days_before: PREAVVISO_GIORNI[utente.ramo],
      placement: "partner_screen",
    });
    salvaRinnovo({ mese, promemoria: true });
    toast("Promemoria attivato 🔔");
  };

  const titolo =
    fin === "far" ? "🔔 Il tuo rinnovo" : fin === "open" ? "🛡️ È il momento di confrontare" : "🛡️ Trova la tua polizza";

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-4">
        <TastoTondo label="Chiudi" onClick={() => router.push("/")}>
          <Icona nome="x" size={22} />
        </TastoTondo>
        <ChipStato serie={false} />
      </div>

      <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">{titolo}</h1>

        {fin === "open" && (
          <p className="text-lg leading-snug font-semibold">
            La tua polizza scade a {MESI[mese ?? 0]}: se vuoi cambiarla, è adesso che conviene guardare le alternative.
          </p>
        )}
        {fin === "far" && (
          <p className="text-lg leading-snug font-semibold">
            La tua polizza scade a {MESI[mese ?? 0]}. Confrontarla adesso servirebbe a poco: ti avvisiamo{" "}
            {PREAVVISO_GIORNI[utente.ramo]} giorni prima, in tempo per{" "}
            {utente.ramo === "rc_auto" ? "scegliere con calma" : "mandare la disdetta se decidi di cambiare"}.
          </p>
        )}
        {fin !== "far" && (
          <p className="text-lg leading-snug font-semibold">
            Confronta in pochi minuti le offerte di tante compagnie per la polizza {ramo}.
          </p>
        )}

        {fin === "far" ? (
          <p className="rounded-2xl bg-box-azzurro px-6 py-4 text-lg leading-relaxed">
            Nel promemoria ritrovi la tua checklist: prezzo, massimale, franchigia ed esclusioni, le cose da avere sotto mano per
            confrontare.
          </p>
        ) : (
          <p className="rounded-2xl bg-box-azzurro px-6 py-4 text-lg leading-relaxed">
            Un solo modulo, tanti preventivi. Vedi prezzi, massimali e franchigie uno accanto all&apos;altro
            {fin === "open" && ", gli stessi che hai appena controllato sulla tua"}.
          </p>
        )}
        {fin !== "far" && (
          <p className="rounded-2xl bg-box-giallo px-6 py-4 text-lg leading-relaxed">
            Il confronto è gratis e non ti impegna. {AVVISO[utente.ramo]}
          </p>
        )}

        {promemoria && (
          <p className="rounded-2xl bg-box-viola px-6 py-4 text-lg leading-relaxed">
            🔔 Promemoria attivo{mese !== null ? ` per ${MESI[mese]}` : ""}.{" "}
            {mese === null && "Quando trovi la data sul contratto, inseriscila nella lezione 4."}
          </p>
        )}

        <p className="text-sm leading-relaxed text-muted">
          Finanz non è un intermediario assicurativo e non ti consiglia una polizza specifica. Il confronto è offerto da un
          partner iscritto al Registro Unico degli Intermediari (RUI).
        </p>
      </div>

      <BottomBar>
        {fin === "far" ? (
          <>
            <PrimaryButton disabled={promemoria} onClick={avvisami}>
              {promemoria ? "Promemoria attivato ✓" : "Avvisami prima della scadenza"}
            </PrimaryButton>
            <SecondaryButton onClick={confronta}>Confronta comunque ora</SecondaryButton>
          </>
        ) : (
          <>
            <PrimaryButton onClick={confronta}>{fin === "open" ? "Confronta ora" : "Confronta le polizze"}</PrimaryButton>
            {fin === "unknown" && !promemoria ? (
              <button onClick={avvisami} className="py-1 text-center text-base font-semibold text-forest underline">
                Preferisci aspettare? Trova la data sul contratto e ti avvisiamo
              </button>
            ) : (
              <SecondaryButton onClick={() => router.push("/")}>Torna alla Home</SecondaryButton>
            )}
          </>
        )}
      </BottomBar>
    </div>
  );
}
