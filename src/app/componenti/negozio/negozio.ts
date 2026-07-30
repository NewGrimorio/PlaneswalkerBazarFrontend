import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Prodotto } from '../../services/prodotto';
import { Carrello } from '../../services/carrello';
import { ProdottoDTO } from '../../modelli/prodotti-dto';
import { MagazzinoSKUDTO } from '../../modelli/magazzino-sku-dto';
import { CartaVetrinaDTO } from '../../modelli/carta-vetrina-dto';
import { EspansioneDTO } from '../../modelli/espansione-dto';
import { urlImmagine } from '../../utils/url-immagine';
import { AuthServices } from '../../auth/auth-services';
import { environment } from '../../../environments/environment';

const BASE = environment.apiUrl;

type Toast = { testo: string; errore: boolean } | null;

/**
 * Vetrina. Vive dentro UserLayout: nav, logout e ora anche il
 * CARRELLO stanno nella shell (badge in topbar dal signal condiviso
 * del service) — qui resta solo il catalogo, con la scheda FILTRI
 * a sinistra al posto del vecchio aside carrello.
 *
 * Due modalita', decise dalla rotta:
 *  - /bustine, /box, ...        -> categoria da data.tipo
 *  - /carte-singole/:codice     -> le carte di UN set
 * In entrambi i casi l'URL e' condivisibile e indicizzabile.
 *
 * Il catalogo e' PUBBLICO: carica anche in SSR e per un ospite.
 *
 * Flusso: la lista NON porta le varianti -> click -> getBySlug con
 * gli skus -> NON-single con varianti: pagina /prodotto/:slug;
 * single o senza varianti: modale.
 */
@Component({
  selector: 'app-negozio',
  imports: [DecimalPipe, MatIconModule, RouterLink, FormsModule],
  templateUrl: './negozio.html',
  styleUrl: './negozio.css',
})
export class Negozio {
  private prodottoS = inject(Prodotto);
  private carrelloS = inject(Carrello);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  /** Pubblico: il template lo interroga per distinguere ospite e cliente. */
  authS = inject(AuthServices);

  /** Esposta al template: le funzioni importate non sono visibili da sole. */
  protected readonly urlImmagine = urlImmagine;

  private etichette: Record<string, string> = {
    SINGLE: 'Carte singole',
    BOOSTER: 'Bustine',
    BOOSTER_BOX: 'Box',
    MAZZO: 'Mazzi',
    SET_LOTTO: 'Lotti di carte',
    SIGILLATO: 'Bundle',
    ACCESSORIO: 'Accessori',
  };

  // ATTENZIONE: ripristina qui il TUO valore se era diverso
  private readonly PER_PAGINA = 24;

  prodotti = signal<ProdottoDTO[]>([]);
  carte = signal<CartaVetrinaDTO[]>([]);
  espansione = signal<EspansioneDTO | null>(null);
  tipoSel = signal<string>('SINGLE');
  caricando = signal(false);

  ordinamento = signal('numero-asc');
  pagina = signal(1);

  prodottoAperto = signal<ProdottoDTO | null>(null);
  messaggio = signal<Toast>(null);

  // ---------------- Filtri (scheda a sinistra) ----------------
  // Client-side sui dati gia' caricati: nessuna chiamata in piu'.
  fNome = signal('');
  fRarita = signal<Set<string>>(new Set());     // vuoto = tutte
  fSoloDisponibili = signal(false);
  fPrezzoMax = signal<number | null>(null);
  fEspansione = signal('');                     // griglia generica

  /** Dentro un set vince il nome del set: e' l'informazione piu' utile. */
  titolo = computed(() =>
    this.espansione()?.nome ?? this.etichette[this.tipoSel()] ?? 'Catalogo');

  constructor() {
    // data (categoria) e paramMap (codice set) insieme: navigando tra
    // rotte sorelle il componente e' RIUSATO e il costruttore non gira
    // di nuovo, quindi servono gli stream e non lo snapshot.
    combineLatest([this.route.data, this.route.paramMap]).subscribe(([d, p]) => {
      this.tipoSel.set(d['tipo'] ?? 'SINGLE');
      this.azzeraFiltri();
      const codice = p.get('codice');
      if (codice) {
        this.caricaEspansione(codice);
      } else {
        this.espansione.set(null);
        this.caricaProdotti(this.tipoSel());
      }
    });
  }

  // ---------------- Vetrina ----------------

  private caricaProdotti(tipo: string): void {
    this.caricando.set(true);
    this.prodottoS.listByTipo(tipo).subscribe({
      next: l => { this.prodotti.set(l); this.caricando.set(false); },
      error: () => { this.prodotti.set([]); this.caricando.set(false); }
    });
  }

  /**
   * Set -> carte del set. Due chiamate in sequenza: la prima serve
   * anche a dare il nome vero alla pagina (il codice in URL non
   * basta). La seconda usa l'endpoint dedicato: solo SINGLE, digitali
   * escluse e prezzo "a partire da" gia' aggregato.
   */
  private caricaEspansione(codice: string): void {
    this.caricando.set(true);
    this.http.get<EspansioneDTO>(`${BASE}/public/espansioni/${codice}`)
      .subscribe({
        next: e => {
          this.espansione.set(e);
          this.http.get<CartaVetrinaDTO[]>(`${BASE}/public/prodotti/espansione/${e.id}/singole`)
            .subscribe({
              next: l => {
                this.carte.set(l);
                this.pagina.set(1);      // set nuovo -> si riparte dalla prima pagina
                this.caricando.set(false);
              },
              error: () => { this.carte.set([]); this.caricando.set(false); }
            });
        },
        error: () => {
          this.espansione.set(null);
          this.carte.set([]);
          this.caricando.set(false);
          this.toast('Espansione non trovata', true);
        }
      });
  }

  /**
   * Apre il dettaglio. Prende lo SLUG, non il DTO: serve sia alla
   * griglia carte (CartaVetrinaDTO) sia a quella generica (ProdottoDTO).
   * NON-single con varianti -> pagina dedicata (/prodotto/:slug): un
   * box merita spazio e un URL condivisibile. Il modale resta per le
   * single (hanno gia' /carta/:slug) e per i prodotti senza varianti.
   */
  apri(slug: string): void {
    this.prodottoS.getBySlug(slug).subscribe({
      next: dett => {
        const comprabile = !!dett.skus && dett.skus.length > 0;
        if (comprabile && dett.tipoProdotto !== 'SINGLE') {
          this.router.navigate(['/prodotto', dett.slug]);
          return;
        }
        this.prodottoAperto.set(dett);
      },
      error: err => this.toast(err?.error?.msg ?? 'Prodotto non disponibile', true)
    });
  }

  chiudi(): void { this.prodottoAperto.set(null); }

  // ---------------- Aggiunta dal modale (single) ----------------

  aggiungi(sku: MagazzinoSKUDTO): void {
    // Sfogliare e' libero, comprare no: l'ospite viene mandato al login
    // invece di sbattere contro un 401 incomprensibile.
    if (!this.authS.isAutentificated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Deterministico a prescindere dalla semantica di addVoce: se lo
    // sku e' gia' nel carrello (signal CONDIVISO del service, tenuto
    // fresco dalla shell), si imposta quantita+1; altrimenti 1.
    const c = this.carrelloS.carrelloCorrente();
    const esistente = c?.voci.find(v => v.skuId === sku.id);
    const chiamata = esistente
      ? this.carrelloS.updateVoce(sku.id, esistente.quantita + 1)
      : this.carrelloS.addVoce(sku.id, 1);

    // Il tap nel service aggiorna il signal (e il badge in topbar):
    // qui resta solo il feedback all'utente.
    chiamata.subscribe({
      next: () => this.toast('Aggiunto al carrello', false),
      error: err => this.toast(err?.error?.msg ?? 'Impossibile aggiungere', true)
    });
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }

  // ---------------- Filtri ----------------

  cambiaNome(v: string): void { this.fNome.set(v); this.pagina.set(1); }
  cambiaSoloDisponibili(v: boolean): void { this.fSoloDisponibili.set(v); this.pagina.set(1); }
  cambiaPrezzoMax(v: number | null): void { this.fPrezzoMax.set(v); this.pagina.set(1); }
  cambiaEspansione(v: string): void { this.fEspansione.set(v); this.pagina.set(1); }

  /** Set immutabile: mutarlo non triggererebbe i computed (zoneless). */
  toggleRarita(r: string): void {
    this.fRarita.update(s => {
      const n = new Set(s);
      n.has(r) ? n.delete(r) : n.add(r);
      return n;
    });
    this.pagina.set(1);
  }

  azzeraFiltri(): void {
    this.fNome.set('');
    this.fRarita.set(new Set());
    this.fSoloDisponibili.set(false);
    this.fPrezzoMax.set(null);
    this.fEspansione.set('');
    this.pagina.set(1);
  }

  filtriAttivi = computed(() =>
    this.fNome().trim() !== '' || this.fRarita().size > 0 ||
    this.fSoloDisponibili() || this.fPrezzoMax() != null ||
    this.fEspansione() !== '');

  /** Espansioni presenti nella griglia generica (per la select). */
  espansioniPresenti = computed(() => {
    const nomi = this.prodotti()
        .map(p => p.espansioneNome)
        .filter((n): n is string => !!n);
    return [...new Set(nomi)].sort();
  });

  private passaNome(nome: string): boolean {
    const q = this.fNome().trim().toLowerCase();
    return q === '' || nome.toLowerCase().includes(q);
  }

  carteFiltrate = computed(() => this.carte().filter(c =>
    this.passaNome(c.nome)
    && (this.fRarita().size === 0 || this.fRarita().has(c.rarita))
    && (!this.fSoloDisponibili() || c.prezzoDa != null)
    && (this.fPrezzoMax() == null || (c.prezzoDa != null && c.prezzoDa <= this.fPrezzoMax()!))
  ));

  prodottiFiltrati = computed(() => this.prodotti().filter(p =>
    this.passaNome(p.nome)
    && (this.fEspansione() === '' || p.espansioneNome === this.fEspansione())
  ));

  // ---------------- Ordinamento e paginazione (vetrina carte) ----------------

  /** Rango per l'ordinamento C -> M; sconosciute in coda. */
  private readonly RANGO_RARITA: Record<string, number> = {
    COMMON: 0, UNCOMMON: 1, RARE: 2, MYTHIC: 3, SPECIAL: 4, BONUS: 5,
  };

  /** Etichette leggibili sulla tessera. */
  readonly ETICHETTA_RARITA: Record<string, string> = {
    COMMON: 'Comune', UNCOMMON: 'Non comune', RARE: 'Rara',
    MYTHIC: 'Mitica', SPECIAL: 'Speciale', BONUS: 'Bonus',
  };

  /** Per le checkbox dei filtri: ORDINATE C -> M (keyvalue pipe
   *  ordinerebbe alfabeticamente, che per le rarita' non ha senso). */
  readonly RARITA_FILTRO = [
    { valore: 'COMMON',   etichetta: 'Comune' },
    { valore: 'UNCOMMON', etichetta: 'Non comune' },
    { valore: 'RARE',     etichetta: 'Rara' },
    { valore: 'MYTHIC',   etichetta: 'Mitica' },
    { valore: 'SPECIAL',  etichetta: 'Speciale' },
    { valore: 'BONUS',    etichetta: 'Bonus' },
  ];

  /** Numero di collezione: ordinamento NATURALE ("2" < "10"; "382z" dopo "382"). */
  private numColl(n: string): number {
    const m = n.match(/\d+/);
    return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
  }
  /** Prezzi null sempre IN CODA, in entrambe le direzioni. */
  private prezzoOrd(p: number | null, vuoto: number): number {
    return p == null ? vuoto : p;
  }

  // Mappa di comparatori: niente switch, coerente con lo stile del progetto.
  private readonly confronti: Record<string, (a: CartaVetrinaDTO, b: CartaVetrinaDTO) => number> = {
    'nome-asc':    (a, b) => a.nome.localeCompare(b.nome),
    'nome-desc':   (a, b) => b.nome.localeCompare(a.nome),
    'prezzo-asc':  (a, b) => this.prezzoOrd(a.prezzoDa, Infinity) - this.prezzoOrd(b.prezzoDa, Infinity),
    'prezzo-desc': (a, b) => this.prezzoOrd(b.prezzoDa, -Infinity) - this.prezzoOrd(a.prezzoDa, -Infinity),
    'numero-asc':  (a, b) => this.numColl(a.numeroCollezione) - this.numColl(b.numeroCollezione)
                           || a.numeroCollezione.localeCompare(b.numeroCollezione),
    'numero-desc': (a, b) => this.numColl(b.numeroCollezione) - this.numColl(a.numeroCollezione)
                           || b.numeroCollezione.localeCompare(a.numeroCollezione),
    'rarita-asc':  (a, b) => (this.RANGO_RARITA[a.rarita] ?? 99) - (this.RANGO_RARITA[b.rarita] ?? 99),
    'rarita-desc': (a, b) => (this.RANGO_RARITA[b.rarita] ?? 99) - (this.RANGO_RARITA[a.rarita] ?? 99),
  };

  ordinate = computed(() => {
    const cmp = this.confronti[this.ordinamento()] ?? this.confronti['numero-asc'];
    return [...this.carteFiltrate()].sort(cmp);
  });
  totalePagine = computed(() =>
    Math.max(1, Math.ceil(this.ordinate().length / this.PER_PAGINA)));
  visibili = computed(() => {
    const da = (this.pagina() - 1) * this.PER_PAGINA;
    return this.ordinate().slice(da, da + this.PER_PAGINA);
  });

  cambiaOrdinamento(v: string): void {
    this.ordinamento.set(v);
    this.pagina.set(1);
  }
  vaiPagina(p: number): void {
    if (p < 1 || p > this.totalePagine()) return;
    this.pagina.set(p);
    if (isPlatformBrowser(this.platformId)) window.scrollTo({ top: 0 });
  }

}