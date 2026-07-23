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
├── services/              un service per area (utente, carrello, ordine, …)
├── modelli/               interfacce dei DTO (in italiano)
├── utils/
│   └── url-immagine.ts
└── componenti/
    ├── homepage/ login/ registrazione/
    ├── negozio/ checkout/          vetrina e acquisto (temporanei)
    ├── admin-layout/               sidebar + topbar + <router-outlet>
    └── admin/
        ├── dashboard/ sync-scryfall/ prodotti/ magazzino/
        └── ordini/ movimenti/ recensioni/ account/
```

Convenzione: cartelle `componenti/` e `modelli/` in italiano, `services/` in inglese;
selettori con prefisso `app-`.

### Rotte

| Path | Componente | Accesso |
|---|---|---|
| `/` | `Homepage` | pubblico |
| `/login`, `/registrazione` | `Login`, `Registrazione` | pubblico |
| `/negozio`, `/checkout` | `Negozio`, `Checkout` | `autentificateGuard` |
| `/admin/**` | `AdminLayout` + figli | `adminGuard` (anche `canActivateChild`) |
| `**` | → `/` | — |

---

## Autenticazione

Il modello è **access token in memoria + refresh in cookie `HttpOnly`**: nessun token
in `localStorage`, quindi nulla di leggibile da JavaScript di terze parti.

`AuthServices` è l'unica fonte di verità: espone il signal `utente` (null = ospite) e
custodisce l'access token in un campo privato, letto solo dall'interceptor.

### Il bootstrap di sessione

Al primo caricamento nel browser, un `provideAppInitializer` avvia una `/refresh` e ne
deposita la `Promise` in `AuthServices`. Il punto delicato — imparato sul campo — è che
**gli initializer di Angular girano in parallelo**, e con SSR + hydration la *initial
navigation* del router è essa stessa un initializer: attendere lì dentro non basta.

Per questo l'attesa vive **nei guard**, cioè dentro chi deve davvero decidere:

```typescript
await authServices.pronta();   // la sessione ha avuto la sua occasione
if (authServices.isRoleAdmin()) return true;
```

Senza quell'`await`, un F5 su una pagina admin rimbalzava su login e poi tornava
indietro. Le pagine pubbliche invece non aspettano nessuno.

### L'interceptor

Tre comportamenti, ognuno con la sua ragione:

- **In SSR è un passacarte.** Il server non ha sessione e non deve fingerla; in più
  la variabile di modulo che traccia il refresh sarebbe *condivisa tra richieste di
  utenti diversi*.
- **Una sola rotazione condivisa.** Se più chiamate ricevono 401 nello stesso istante,
  una sola esegue il refresh e le altre si accodano (`shareReplay(1)`), poi riprovano
  col token nuovo.
- **`/api/auth` non è tutto uguale.** Login, refresh, registrazione e logout sono
  pubblici e un loro 401 è una risposta *definitiva*; tutto il resto — `/me` compreso —
  riceve il Bearer ed è soggetto a retry.

---

## SSR: regole di sopravvivenza

Il codice gira in due ambienti, quindi ogni accesso a `window`, `document` o
`localStorage` va protetto:

```typescript
if (isPlatformBrowser(this.platformId)) { /* solo browser */ }
```

I dati pubblici (catalogo prodotti) caricano anche in SSR; quelli che richiedono il
token (carrello, portafoglio, pannello admin) si popolano solo nel browser — in SSR la
pagina resta un guscio che il client completa.

---

## Stili

Il tema Material 3 è personalizzato in SCSS. Con Material 3 si usa `matButton="filled"`
(non `mat-raised-button`) e i colori si impostano via CSS variables
(`--mat-button-filled-container-color`), non con `color="primary"`.

Gli stili del pannello admin vivono in **`src/styles/admin.css`**, importato solo da
`styles.css`. Ogni regola è prefissata con il selettore `app-admin-layout`: essendo un
foglio **globale** raggiunge tutta la pagina, e il prefisso serve a limitarne l'effetto
al sottoalbero DOM del layout admin — lo storefront pubblico non ne vede nulla.

---

## Pannello admin

| Pagina | Funzione |
|---|---|
| **Dashboard** | Contatori azionabili (ordini da spedire, bonifici in attesa, SKU sotto scorta) |
| **Sincronizza set** | Import da Scryfall per codice set; aggancio blueprint Cardtrader |
| **Prodotti** | Sigillato, accessori e lotti; upload immagini |
| **Magazzino** | Master-detail su varianti, prezzi, giacenze — con **tendenze prezzi** |
| **Ordini / Movimenti / Recensioni** | Code di lavorazione e moderazione |
| **Account** | Profilo e avatar dell'admin |

### Tendenze prezzi (magazzino)

Sulle carte singole, il bottone *Tendenze prezzi* interroga il backend e affianca a
ogni SKU il prezzo di riferimento delle due fonti, con la variazione rispetto alla
rilevazione precedente:

- **Cardtrader** — per-SKU vero (condizione × lingua × finitura)
- **Cardmarket** — per-finitura (la fonte non distingue la condizione: lo stesso valore
  compare su tutte le condizioni di quella finitura)

La chiamata può durare qualche secondo (il backend interroga Scryfall e Cardtrader,
rispettando il rate limit): il bottone mostra uno spinner e resta disabilitato.

---

## UX: principi applicati

**Linguaggio contestuale.** Le "varianti" sono gergo da carte singole: per gli altri
prodotti il bottone dice *Inserisci scorte*, non *Nuova variante*.

**Colonne che spariscono.** Condizione e finitura non compaiono affatto sui non-SINGLE,
invece di mostrare un "—" che occuperebbe spazio senza informare.

**Errori dal backend.** I messaggi risalgono da `messaggi_sistema` → `GlobalExceptionHandler`
→ interfaccia: nessun testo d'errore è scritto a mano nel frontend.

---

## Note di sviluppo

Angular v22 è **zoneless**: mutare una proprietà dentro un callback di `subscribe` non
scatena il change detection. Lo stato asincrono va in un `signal`.

Con Material e il control flow (`@if` / `@else`), un ramo deve contenere **un solo nodo
proiettabile**. Icona e testo insieme dentro un `@else` producono un warning: si tiene
il nodo nel ramo e si porta il testo fuori come interpolazione.

```html
@if (inCorso()) { <mat-spinner diameter="18" /> } @else { <mat-icon>link</mat-icon> }
{{ inCorso() ? 'In corso…' : 'Avvia' }}
```

---

## Lavori aperti

- Homepage definitiva: `/negozio` e `/checkout` sono pagine temporanee, e il logout
  cliente vive ancora dentro il negozio in attesa di una topbar dedicata.
- Dashboard admin a tema Magic, visivamente rifinita.
- Endpoint REST per i contatori della dashboard (deliberatamente rinviato).