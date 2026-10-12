"use client";

import { useRouter } from "next/navigation";
import { useUtente } from "@/components/Providers";
import { Sheet } from "@/components/ui";
import { UTENTI, NOME_RAMO } from "@/lib/utenti";
import { LEZIONI, PERCORSO } from "@/lib/percorso";
import { GIA_ASSICURATO } from "@/lib/rinnovo";

// La scorciatoia parte dalla card originale "Ce l'hai già?", subito prima di "Il tuo rinnovo":
// chi prova vede prima la teoria e poi l'azione. Chi la usa è già assicurato, quindi nessun filtro sulle card.
const CARD_RINNOVO = LEZIONI[LEZIONI.length - 1].card.findIndex((c) => c.tipo === "rinnovo") - 1;

// Strumenti per chi prova il prototipo: non esistono nell'app vera.
// Cambi utente di prova e salti avanti nel percorso senza rifare tutte le lezioni.
export function PannelloTester({ onClose }: { onClose: () => void }) {
  const { utente, setUtente, progresso, impostaProgresso, toast } = useUtente();
  const router = useRouter();

  const salta = (lezioni: number, quiz: boolean, dove: string, messaggio: string) => {
    const kiwiExtra = LEZIONI.slice(0, lezioni).reduce((s, l) => s + l.kiwi, 0) + (quiz ? PERCORSO.kiwiTraguardo : 0);
    // La scadenza già data resta, tranne quando si ricomincia da zero.
    impostaProgresso({ lezioni, quiz, kiwiExtra, rinnovo: lezioni === 0 ? undefined : progresso.rinnovo });
    onClose();
    toast(messaggio);
    router.push(dove);
  };

  return (
    <Sheet onClose={onClose}>
      <p className="text-2xl font-bold">🧪 Utente di prova</p>
      <p className="mt-1 text-sm text-muted">
        Ognuno ha un ramo e una risposta diversa alla domanda di onboarding &quot;Hai attualmente delle assicurazioni?&quot;.
        L&apos;avanzamento resta salvato per ogni utente.
      </p>
      <div className="mt-4 flex max-h-[42dvh] flex-col gap-2 overflow-y-auto">
        {UTENTI.map((u) => (
          <button
            key={u.id}
            onClick={() => setUtente(u.id)}
            className={`rounded-2xl border-[1.5px] px-4 py-3 text-left transition ${u.id === utente.id ? "border-green-600 bg-soft" : "border-line"}`}
          >
            <span className="font-bold">
              {u.nome}, {u.eta} anni
            </span>
            <span className="text-muted"> · {u.os} · ramo {NOME_RAMO[u.ramo]}</span>
            <span className="block text-sm">&quot;{u.onboarding_intent}&quot;</span>
          </button>
        ))}
      </div>
      <p className="mt-5 text-xs font-semibold tracking-wide text-muted uppercase">Scorciatoie</p>
      <div className={`mt-2 grid gap-2 text-sm font-semibold ${utente.onboarding_intent === GIA_ASSICURATO ? "grid-cols-4" : "grid-cols-3"}`}>
        <button className="rounded-2xl bg-soft px-2 py-3" onClick={() => salta(0, false, "/", "Percorso azzerato")}>
          Ricomincia da zero
        </button>
        {utente.onboarding_intent === GIA_ASSICURATO && (
          <button
            className="rounded-2xl bg-kiwi-100 px-2 py-3"
            onClick={() => salta(LEZIONI.length - 1, false, `/percorso/lezione?n=${LEZIONI.length}&c=${CARD_RINNOVO}`, "Lezione 4")}
          >
            Vai a &quot;Il tuo rinnovo&quot;
          </button>
        )}
        <button
          className="rounded-2xl bg-soft px-2 py-3"
          onClick={() => salta(LEZIONI.length, false, "/percorso/lezione?n=quiz&c=0", "Lezioni completate")}
        >
          Vai al quiz finale
        </button>
        <button
          className="rounded-2xl bg-soft px-2 py-3"
          onClick={() => salta(LEZIONI.length, true, "/percorso/partner", "Percorso completato")}
        >
          Vai alla schermata partner
        </button>
      </div>
    </Sheet>
  );
}
