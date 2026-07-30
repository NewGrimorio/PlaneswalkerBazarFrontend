# PlaneswalkerBazar — Frontend

Frontend Angular di **PlaneswalkerBazar**, e-commerce per carte singole e prodotti
sigillati di *Magic: The Gathering*. Consuma esclusivamente le API REST del backend
[`PlaneswalkerBazarBackend`](https://github.com/NewGrimorio/PlaneswalkerBazarBackend).

Progetto realizzato nell'ambito di **Betacom Academy** — Fase 3.

---

## Stack

| Componente | Versione / note |
|---|---|
| Angular | v22, **SSR abilitato** (requisito di progetto) |
| Angular Material | v22, tema Material 3 personalizzato (SCSS) |
| Bootstrap | 5.3.8 via CDN — **solo layout**, nessun componente |
| Change detection | **zoneless**: lo stato asincrono vive nei *signal* |
| Backend atteso | `http://localhost:9090` |

---

## Avvio

```bash
npm install
ng serve
```

Applicazione su **http://localhost:4200**. Il backend deve essere in ascolto sulla
9090: la sua configurazione CORS ammette esattamente questa origine, con
`allowCredentials` attivo (serve al cookie di refresh).

Gli URL sono centralizzati in `src/environments/` — `apiUrl` e `serverUrl`,
**assoluti** perché l'SSR non ha un'origine relativa da cui partire.

> Modifiche a `angular.json` richiedono il riavvio di `ng serve`; template, CSS e TS
> ricaricano da soli.

---

## Scelte di progettazione

### SSR come vincolo di design, non come flag

Il rendering server-side condiziona ogni componente: tutto ciò che tocca
`localStorage` / `window` / `document` passa da guardie `isPlatformBrowser` o
`afterNextRender`. Per lo stesso motivo il catalogo è **sfogliabile da ospiti**: il
guard di autenticazione non sta sul layout ma sulle singole rotte che lo richiedono
(account, checkout), così l'SSR renderizza davvero la vetrina — indicizzabile — e
non un guscio vuoto dietro un redirect al login.

### Zoneless + signal

Senza Zone.js, mutare proprietà semplici nei callback `subscribe` non triggera la
change detection: **tutto lo stato asincrono passa dai signal**. È una disciplina,
non una preferenza.

### Autenticazione: niente token leggibili da JS

Il modello è **access token in memoria + refresh in cookie `HttpOnly`**: nessun
token in `localStorage`, quindi nulla di esfiltrabile da script di terze parti.
`AuthServices` è l'unica fonte di verità: espone il signal `utente` (null = ospite)
e custodisce l'access token in un campo privato letto solo dall'interceptor. Al
primo caricamento nel browser un `provideAppInitializer` avvia una `/refresh` che
ripristina la sessione; `aggiornaSessione` propaga gli aggiornamenti live (es.
l'avatar nel chip dopo l'upload).

### La verità resta il server

La UI *nasconde* le azioni illegali per gentilezza (bottoni assenti sugli stati che
non le ammettono, finestra di reso derivata dalla timeline), ma ogni regola è
comunque imposta dal backend. Le costanti condivise (es. `RESO_GIORNI`) sono
speculari alle property del server, mai una seconda fonte di verità.

---

## Struttura

```
src/app/
├── auth/                  guard e stato di sessione
│   ├── auth-services.ts
│   ├── admin-guard.ts
│   └── autentificate-guard.ts
├── interceptors/
│   └── auth-interceptor.ts
├── services/              un service per area (utente, carrello, ordine, ricerca, vendite, …)
├── modelli/               interfacce dei DTO (in italiano)
├── utils/
│   └── url-immagine.ts
└── componenti/
    ├── homepage/ login/ registrazione/
    ├── user-layout/                 shell pubblica: topbar, barra-ricerca, carrello
    ├── barra-ricerca/               ricerca globale in topbar
    ├── top-venduti/                 classifica homepage "più acquistati"
    ├── espansioni/ negozio/         griglia set → prodotti per categoria
    ├── carta-dettaglio/             pagina carta stile Scryfall (/carta/:slug)
    ├── dettaglio-prodotto/          pagina prodotto generico (/prodotto/:slug)
    ├── cliente/
    │   ├── account/ profilo/ indirizzi/ conti/ portafoglio/ recensioni/
    │   ├── ordini/                  "I miei ordini": timeline, reso, recensioni
    │   └── checkout/
    ├── admin-layout/                sidebar + topbar + <router-outlet>
    └── admin/
        ├── dashboard/ sync-scryfall/ prodotti/ magazzino/
        └── ordini/ movimenti/ recensioni/ vendite/ account/
```

Convenzioni: cartelle `componenti/` e `modelli/` in italiano, `services/` in
inglese; selettori con prefisso `app-`.

### Mappa delle rotte

| Area | Rotte | Accesso |
|---|---|---|
| Pubblico | `/`, `/login`, `/registrazione` (auto-login) | libero |
| Catalogo | `/carte-singole` → `/carte-singole/:codice`, `/bustine`, `/box`, `/mazzi`, `/lotti`, `/sigillato`, `/accessori` | libero (carrello autenticato) |
| Schede | `/carta/:slug` (stile Scryfall), `/prodotto/:slug` (URL condivisibile) | libero, indicizzabile |
| Area cliente | `/account`, `/account/{profilo,ordini,portafoglio,conti,indirizzi,recensioni}`, checkout | `autentificateGuard` |
| Admin | `/admin/**` | `adminGuard` (anche `canActivateChild`), CSS scoped sotto `app-admin-layout` |

Il tipo di prodotto arriva da `route.data` e il componente `Negozio` è riusato tra
rotte sibling via `combineLatest`. I path account sono piatti con prefisso
`account/`: l'URL racconta la gerarchia anche senza rotte annidate.

---

## Flussi principali

### Ricerca globale (`barra-ricerca`)

Input in topbar stile Cardtrader, risultati in un menu ancorato. Le **carte**
arrivano già aggregate dal backend ("N versioni" → `/carta/:slug`); i generici
vanno a `/prodotto/:slug`. **Debounce artigianale** (250 ms di pausa: la chiamata
parte quando l'utente smette di digitare) e **contatore di versione** che scarta le
risposte arrivate fuori ordine — il classico bug della ricerca live in cui "bloo"
risponde *dopo* "bloom" e sovrascrive i risultati giusti.

### Top venduti (homepage)

"I più acquistati della settimana" stile MTGStocks: podio con immagini per i primi
tre, barre proporzionali CSS pure per gli altri — per una top-6 una libreria di
chart sarebbe un cannone per una mosca. Il componente è **autosufficiente**: si
carica da solo (browser-only) e se la finestra non ha vendite si nasconde senza
lasciare buchi. Solo quantità: i ricavi non escono dall'area admin.

### "I miei ordini" (`cliente/ordini`)

Lista con chip di stato, dettaglio a scomparsa con caricamento on-demand delle voci
(**snapshot** del checkout + `prodottoId`/`prodottoNome` come identità viva),
timeline dei cambi di stato — note delle transizioni incluse, come il motivo del
reso — e le sole azioni legali per lo stato corrente.

- **Richiedi reso**: `<dialog>` nativo con motivazione obbligatoria (max 300,
  contatore). Disponibile solo entro la finestra di 14 giorni dalla consegna,
  derivata dalla timeline già caricata; oltre, il bottone sparisce e una riga
  spiega perché.
- **Recensioni**: disponibili sugli ordini ricevuti
  (`CONSEGNATO`/`RESO_RICHIESTO`/`RIMBORSATO`); dialog con stelle, titolo e testo
  facoltativi, chip di scelta se l'ordine ha più prodotti, form precompilato in
  modifica. Il toast post-invio avvisa della **moderazione preventiva**: visibile
  solo dopo l'approvazione, ogni modifica torna in coda.

### Pattern `<dialog>` nativo

I flussi che chiedono input (reso, recensione) usano `<dialog>` + `showModal()`:
focus trap, ESC e backdrop gratis, niente MatDialog. Il dialog sta *sempre* nel DOM
(chiuso è invisibile → SSR-safe, nessuna API browser fuori dai click), lo stato
vive in signal, l'evento `(close)` pulisce anche la chiusura con ESC, e in caso di
errore il dialog **resta aperto** con il messaggio dentro: l'utente non perde ciò
che ha scritto.

---

## Area admin

Code di lavoro per stato, stesso schema ovunque (chip di stato → lista → azioni):

- **Ordini**: da spedire, spedite, resi da rimborsare (con il **motivo del reso in
  riga**), non consegnate, rimborsate.
- **Recensioni**: tab primario **"Da moderare"** (`IN_ATTESA`, Approva/Rifiuta),
  poi "Pubblicate" (Nascondi) e "Nascoste" (Ripristina) — quattro azioni, due
  endpoint.
- **Vendite**: classifica con i ricavi ed export CSV.
- **Movimenti**, **Magazzino**, **Prodotti**, **Sync Scryfall/Cardtrader**,
  **Dashboard** con contatori.

---

## Convenzioni tecniche

- **Material 3**: `matButton="filled"` e token CSS
  (`--mat-button-filled-container-color`), non `mat-raised-button`/`color="primary"`.
- CSS admin scoped sotto `app-admin-layout` con custom property `--colore-plancia`.
- Icona e testo insieme dentro un `@else` producono un warning: si tiene il nodo
  nel ramo e si porta il testo fuori come interpolazione:

```html
@if (inCorso()) { <mat-spinner diameter="18" /> } @else { <mat-icon>link</mat-icon> }
{{ inCorso() ? 'In corso…' : 'Avvia' }}
```

- Lo schema del database di riferimento è documentato in
  `planeswalker-bazar-schema.plantuml` alla radice del repository.

---

## Lavori aperti

- Rifinitura del flusso di checkout e della homepage.
- Dashboard admin a tema Magic, con il contatore azionabile "recensioni da moderare".
- Pagina prodotto pubblica: integrare recensioni approvate e statistiche già
  esposte dal backend (`/api/public/recensioni/...`).