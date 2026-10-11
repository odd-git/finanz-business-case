# Finanz · Percorso Assicurazioni (prototipo)

Il prototipo del percorso Academy sulle assicurazioni, per il Business Case Finanz.

## Avvio

```bash
npm install
npm run dev                  # http://localhost:3000
```

## Com'è fatto

Il prototipo riproduce l'app Finanz: Home, Academy, mappa del percorso "Assicurati", 4 lezioni fatte di card (teoria, "Mettiti alla prova", vero o falso, sondaggi, un simulatore), quiz finale, fine percorso e schermata partner. Sul telefono funziona come un'app: il tasto o il gesto indietro torna alla card precedente, i bottom sheet si chiudono trascinandoli giù, la X chiede conferma prima di uscire.

| Schermata | Evento Mixpanel |
|---|---|
| Apertura della mappa del percorso | `Path Started` |
| Ultima card di ogni lezione, bottone "Continua" | `Lesson Completed` (`lesson_number`) |
| Ultima domanda del quiz finale | `Quiz Completed` (`quiz_score`: risposte giuste al primo tentativo) |
| Schermata "Percorso completato" | `Path Completed` |
| Schermata "Trova la tua polizza" | `Partner Screen Viewed` |
| Bottone "Confronta le polizze" | `Partner CTA Clicked` |
| Modulo inviato sul sito del partner | `Quote Requested` (nella realtà è un postback del partner) |

`Policy Activated` arriva dal partner giorni dopo, quindi qui non c'è.

## Feature "Il tuo rinnovo"

Per chi all'onboarding risponde "Sì, ne ho già una o più" (Giulia, Sara e Paolo tra gli utenti di prova). Per gli altri il percorso resta com'è.

- **Lezione 4, dopo la card "Ce l'hai già?"**: la card "Il tuo rinnovo" chiede il mese di scadenza della polizza (o "Non lo so") e propone la checklist "Rileggi la tua" (Lo so / Non lo so). Nel riepilogo, se la finestra è lontana o la data non è nota, propone subito il promemoria ("Avvisami prima della scadenza" / "Continua senza promemoria").
- **Schermata partner**: la strada dipende dalla scadenza.
  - finestra aperta (RC auto entro 2 mesi, altri rami entro 3) → "Confronta ora";
  - finestra lontana → "Avvisami prima della scadenza" (30 giorni prima per l'RC auto, 90 per gli altri rami), con "Confronta comunque ora" come seconda scelta;
  - "Non lo so" → "Confronta le polizze", con il promemoria come link secondario.
- Nel pannello tester, per gli utenti già assicurati, la scorciatoia **Vai a "Il tuo rinnovo"** porta direttamente alla card.

Il prototipo mostra solo la variante nuova: nel test vero il 20% dei già assicurati resterebbe sul percorso di oggi. Il promemoria è simulato (nessuna notifica parte).

| Schermata | Evento Mixpanel |
|---|---|
| Card "Il tuo rinnovo", mese scelto | `Renewal Month Set` (`renewal_month`, `months_to_expiry`, `window`) |
| Card "Il tuo rinnovo", checklist completata | `Policy Checklist Completed` (`known`, `total`) |
| Promemoria attivato, nella lezione o sulla schermata partner | `Reminder Opt-in` (`window`, `reminder_days_before`, `placement`: `lesson` / `partner_screen`) |
| Schermata partner, comparatore, preventivo | `Partner Screen Viewed`, `Partner CTA Clicked`, `Quote Requested` con `window`: `open` / `far` / `unknown` |

Le soglie stanno in `lib/rinnovo.ts`; `node lib/rinnovo.check.mts` le verifica.

Sugli schermi larghi, il pannello a destra mostra gli eventi mentre usi il percorso. Dalla striscia verde in cima alla Home (o dall'avatar) cambi utente di prova: ognuno ha un ramo e una risposta diversa alla domanda di onboarding "Hai attualmente delle assicurazioni?". Lì trovi anche le scorciatoie per ricominciare o saltare al quiz e alla schermata partner. L'avanzamento resta salvato nel browser.

```
app/page.tsx                     Home
app/academy/page.tsx             Academy
app/percorso/page.tsx            mappa del percorso
app/percorso/lezione/            lezioni e quiz finale, card per card (?n=1..4 o n=quiz, &c=card)
app/percorso/completato/         fine percorso
app/percorso/partner/            schermata partner
app/comparatore/page.tsx         sito del partner (simulato)
components/Schede.tsx            le card delle lezioni
components/ui.tsx                chrome, bottoni, bottom sheet, barra in basso
lib/percorso.ts                  testi di lezioni e quiz
lib/navigazione.ts               cronologia card per card (tasto indietro)
lib/utenti.ts                    utenti di prova
lib/track.ts                     tracciamento eventi
```

Cambia quello che vuoi: è un punto di partenza, non un vincolo.

## Pubblicare

Il modo più rapido è Vercel: importa il tuo repo da https://vercel.com/new e pubblica. Il link che ti dà Vercel è quello da mandarci.
