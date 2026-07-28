# PlaneswalkerBazar — Frontend

Frontend Angular di **PlaneswalkerBazar**, e-commerce per carte e prodotti sigillati di
*Magic: The Gathering*. Consuma esclusivamente le API REST del backend
[`PlaneswalkerBazarBackend`](../PlaneswalkerBazarBackend).

Progetto realizzato nell'ambito di **Betacom Academy** — Fase 3.

---

## Stack

| Componente | Versione / note |
|---|---|
| Angular | v22, **SSR abilitato** (requisito di progetto) |
| Angular Material | v22, tema Material 3 personalizzato (SCSS) |
| Bootstrap | 5.3.8 via CDN — **solo layout**, nessun componente |
| Change detection | **zoneless**: lo stato asincrono usa i *signal* |
| Backend atteso | `http://localhost:9090` |

---

## Avvio

```bash
npm install
ng serve
```

Applicazione su **http://localhost:4200**. Il backend deve essere in ascolto sulla 9090:
la sua configurazione CORS ammette esattamente questa origine, con `allowCredentials`
attivo (serve al cookie di refresh).

Gli URL sono centralizzati in `src/environments/` — `apiUrl` e `serverUrl`, **assoluti**
perché l'SSR non ha un'origine relativa da cui partire.

> Modifiche a `angular.json` richiedono il riavvio di `ng serve`; template, CSS e TS
> ricaricano da soli.

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
├── services/              un service per area (utente, carrello, ordine, recensione, …)
├── modelli/               interfacce dei DTO (in italiano)
├── utils/
│   └── url-immagine.ts
└── componenti/
    ├── homepage/ login/ registrazione/
    ├── negozio/ checkout/           vetrina per categoria/set e acquisto
    ├── cliente/
    │   ├── account/                 profilo, avatar, CRUD indirizzi
    │   └── ordini/                  "I miei ordini": dettaglio, timeline, reso, recensioni
    ├── admin-layout/                sidebar + topbar + <router-outlet>
    └── admin/
        ├── dashboard/ sync-scryfall/ prodotti/ magazzino/
        └── ordini/ movimenti/ recensioni/ account/
```

Convenzione: cartelle `componenti/` e `modelli/` in italiano, `services/` in inglese;
selettori con prefisso `app-`.

### Aree

| Area | Accesso | Note |
|---|---|---|
| Homepage, login, registrazione | pubblico | registrazione con auto-login |
| Negozio (categorie: bustine, box, mazzi, lotti, sigillato, accessori; `/carte-singole/:codice` per i set) | catalogo pubblico, carrello autenticato | il tipo arriva da `route.data`, riuso del componente via `combineLatest` |
| Area cliente (account, ordini) | `autentificateGuard` | |
| `/admin/**` | `adminGuard` (anche `canActivateChild`) | CSS scoped sotto `app-admin-layout` |

---

## Autenticazione

Il modello è **access token in memoria + refresh in cookie `HttpOnly`**: nessun token
in `localStorage`, quindi nulla di leggibile da JavaScript di terze parti.

`AuthServices` è l'unica fonte di verità: espone il signal `utente` (null = ospite) e
custodisce l'access token in un campo privato, letto solo dall'interceptor. Al primo
caricamento nel browser, un `provideAppInitializer` avvia una `/refresh` che ripristina
la sessione; `aggiornaSessione` propaga gli aggiornamenti live (es. l'avatar dopo
l'upload).

---

## Flussi cliente

### "I miei ordini" (`componenti/cliente/ordini`)

Lista con chip di stato, dettaglio a scomparsa che carica on-demand voci
(**snapshot** del checkout + `prodottoId`/`prodottoNome` come identità viva),
timeline dei cambi di stato — **note delle transizioni incluse**, come il motivo del
reso — e le azioni legali per lo stato corrente. Le azioni rispecchiano i `Set.of`
del backend: qui si *nascondono* quelle illegali per gentilezza, la verità resta il
server.

- **Richiedi reso**: apre un `<dialog>` nativo con la motivazione obbligatoria
  (max 300, contatore). Disponibile solo entro la finestra di reso (14 giorni dalla
  consegna, derivata dalla timeline già caricata — `RESO_GIORNI` speculare alla
  property backend); oltre, il bottone sparisce e una riga spiega perché.
- **Recensioni**: bottone su ordini ricevuti (`CONSEGNATO`/`RESO_RICHIESTO`/
  `RIMBORSATO`); dialog con stelle, titolo e testo facoltativi, chip di scelta se
  l'ordine ha più prodotti (spunta sui già recensiti), form **precompilato** in
  modifica. Dopo l'invio, il toast avvisa della **moderazione preventiva**: la
  recensione sarà visibile solo dopo l'approvazione, e ogni modifica torna in coda.

### Pattern `<dialog>` nativo

I flussi che chiedono input (reso, recensione) usano `<dialog>` + `showModal()`:
focus trap, ESC e backdrop gratis, niente MatDialog. Il dialog sta *sempre* nel DOM
(chiuso è invisibile → SSR-safe, nessuna API browser fuori dai click), lo stato vive
in signal, l'evento `(close)` pulisce anche la chiusura con ESC, e in caso di errore
il dialog **resta aperto** con il messaggio dentro: l'utente non perde ciò che ha
scritto.

---

## Area admin

Code di lavoro per stato, stesso schema ovunque (chip di stato → lista → azioni):

- **Ordini**: da spedire, spedite, resi da rimborsare (con il **motivo del reso in
  riga**), non consegnate, rimborsate.
- **Recensioni**: tab primario **"Da moderare"** (`IN_ATTESA`, Approva/Rifiuta), poi
  "Pubblicate" (Nascondi) e "Nascoste" (Ripristina) — quattro azioni, due endpoint.
- **Movimenti**, **Magazzino**, **Prodotti**, **Sync Scryfall/Cardtrader**,
  **Dashboard** con contatori.

---

## Convenzioni tecniche

- **Zoneless**: lo stato asincrono passa dai signal; mutare proprietà semplici nei
  callback `subscribe` non triggera la change detection.
- **SSR**: tutto ciò che tocca `localStorage`/`window`/`document` richiede
  `isPlatformBrowser` o `afterNextRender`.
- **Material 3**: `matButton="filled"` e token CSS
  (`--mat-button-filled-container-color`), non `mat-raised-button`/`color="primary"`.
- Icona e testo insieme dentro un `@else` producono un warning: si tiene il nodo nel
  ramo e si porta il testo fuori come interpolazione.

```html
@if (inCorso()) { <mat-spinner diameter="18" /> } @else { <mat-icon>link</mat-icon> }
{{ inCorso() ? 'In corso…' : 'Avvia' }}
```

---

## Lavori aperti

- Homepage definitiva e rifinitura del flusso di checkout.
- Dashboard admin a tema Magic, con il contatore azionabile "recensioni da moderare".
- Pagina prodotto pubblica: recensioni approvate e statistiche già esposte dal
  backend (`/api/public/recensioni/...`), da integrare nella vetrina.