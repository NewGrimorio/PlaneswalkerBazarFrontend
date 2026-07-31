import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CartaVetrinaDTO } from '../../modelli/carta-vetrina-dto';
import { ProdottoDTO } from '../../modelli/prodotti-dto';
import { MagazzinoSKUDTO } from '../../modelli/magazzino-sku-dto';
import { urlImmagine } from '../../utils/url-immagine';
import { environment } from '../../../environments/environment';
import { AuthServices } from '../../auth/auth-services';
import { Carrello } from '../../services/carrello';
import { Prodotto } from '../../services/prodotto';
import { Ricerca, RisultatoRicercaDTO } from '../../services/ricerca';

const BASE = environment.apiUrl;

type Toast = { testo: string; errore: boolean } | null;

/**
 * Pagina a DUE ancore, stessa vetrina:
 *
 *  - /carta/:slug/versioni  -> tutte le stampe di UNA carta
 *    (tessere per set, filtri espansione/rarita'/disponibili/prezzo,
 *    modale varianti identico al negozio);
 *
 *  - /ricerca?q=...         -> risultati COMPLETI della ricerca
 *    (Invio nella barra): carte aggregate ("N versioni") E prodotti
 *    generici insieme, con filtri per TIPO che nascono dai risultati
 *    presenti — se la ricerca non trova mazzi, il chip Mazzi non c'e'.
 *
 * Il click sulle tessere segue le stesse regole del menu della barra:
 * carta con piu' versioni -> pagina versioni; una sola -> dettaglio;
 * generico -> pagina prodotto.
 */
@Component({
  selector: 'app-prodotto-versioni',
  imports: [MatIconModule, RouterLink, DecimalPipe, FormsModule],
  templateUrl: './prodotto-versioni.html',
  styleUrl: './prodotto-versioni.css',
})
export class ProdottoVersioni {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authS = inject(AuthServices);
  private carrelloS = inject(Carrello);
  private prodottoS = inject(Prodotto);
  private ricercaS = inject(Ricerca);
  private platformId = inject(PLATFORM_ID);

  protected readonly urlImmagine = urlImmagine;

  /** 'carta' = versioni di una carta; 'ricerca' = risultati query. */
  modo = signal<'carta' | 'ricerca'>('carta');
  caricamento = signal(true);
  errore = signal(false);
  messaggio = signal<Toast>(null);
  prodottoAperto = signal<ProdottoDTO | null>(null);

  // ---- modo 'carta' ----
  versioni = signal<CartaVetrinaDTO[]>([]);
  nomeCarta = computed(() => this.versioni()[0]?.nome ?? '');
  fEspansioni = signal<Set<string>>(new Set());
  fRarita = signal<Set<string>>(new Set());
  fSoloDisponibili = signal(false);
  fPrezzoMax = signal<number | null>(null);

  // ---- modo 'ricerca' ----
  query = signal('');
  risultati = signal<RisultatoRicercaDTO[]>([]);
  fTipi = signal<Set<string>>(new Set());

  readonly ETICHETTA_RARITA: Record<string, string> = {
    COMMON: 'Comune', UNCOMMON: 'Non comune', RARE: 'Rara',
    MYTHIC: 'Mitica', SPECIAL: 'Speciale', BONUS: 'Bonus',
  };
  readonly RARITA_FILTRO = Object.entries(this.ETICHETTA_RARITA)
      .map(([valore, etichetta]) => ({ valore, etichetta }));
  readonly ETICHETTA_TIPO: Record<string, string> = {
    CARTA: 'Carte', BOOSTER: 'Bustine', BOOSTER_BOX: 'Box', MAZZO: 'Mazzi',
    SET_LOTTO: 'Lotti', SIGILLATO: 'Bundle', ACCESSORIO: 'Accessori',
  };

  espansioniPresenti = computed(() => {
    const visti = new Map<string, string>();
    for (const v of this.versioni())
      if (!visti.has(v.espansioneCodice)) visti.set(v.espansioneCodice, v.espansioneNome);
    return [...visti.entries()].map(([codice, nome]) => ({ codice, nome }));
  });

  /** FILTRI DINAMICI: i chip tipo esistono solo per i tipi PRESENTI
   *  nei risultati, nell'ordine fisso del catalogo. */
  tipiPresenti = computed(() => {
    const presenti = new Set(this.risultati().map(r => r.tipo));
    return Object.entries(this.ETICHETTA_TIPO)
        .filter(([tipo]) => presenti.has(tipo))
        .map(([tipo, etichetta]) => ({ tipo, etichetta }));
  });

  filtrate = computed(() => this.versioni().filter(v =>
    (this.fEspansioni().size === 0 || this.fEspansioni().has(v.espansioneCodice))
    && (this.fRarita().size === 0 || this.fRarita().has(v.rarita))
    && (!this.fSoloDisponibili() || v.prezzoDa != null)
    && (this.fPrezzoMax() == null || (v.prezzoDa != null && v.prezzoDa <= this.fPrezzoMax()!))
  ));

  risultatiFiltrati = computed(() => this.risultati().filter(r =>
    this.fTipi().size === 0 || this.fTipi().has(r.tipo)
  ));

  filtriAttivi = computed(() =>
    this.fEspansioni().size > 0 || this.fRarita().size > 0 ||
    this.fSoloDisponibili() || this.fPrezzoMax() != null ||
    this.fTipi().size > 0);

  constructor() {
    // L'ancora la decide la rotta: slug presente = versioni carta,
    // altrimenti query string = risultati ricerca.
    this.route.paramMap.subscribe(pm => {
      const slug = pm.get('slug');
      if (slug) { this.modo.set('carta'); this.caricaVersioni(slug); }
    });
    this.route.queryParamMap.subscribe(qm => {
      const q = qm.get('q');
      if (q != null && !this.route.snapshot.paramMap.get('slug')) {
        this.modo.set('ricerca');
        this.query.set(q);
        this.caricaRicerca(q);
      }
    });
  }

  private caricaVersioni(slug: string): void {
    this.caricamento.set(true);
    this.errore.set(false);
    this.azzeraFiltri();
    this.prodottoAperto.set(null);
    this.http.get<CartaVetrinaDTO[]>(`${BASE}/public/prodotti/carta/${slug}/versioni`)
      .subscribe({
        next: v => { this.versioni.set(v); this.caricamento.set(false); },
        error: () => { this.errore.set(true); this.caricamento.set(false); },
      });
  }

  private caricaRicerca(q: string): void {
    this.caricamento.set(true);
    this.errore.set(false);
    this.azzeraFiltri();
    this.prodottoAperto.set(null);
    this.ricercaS.cerca(q, 30).subscribe({
      next: r => { this.risultati.set(r); this.caricamento.set(false); },
      error: () => { this.errore.set(true); this.caricamento.set(false); },
    });
  }

  // ---------------- Navigazione dalle tessere ----------------

  /** Modo carta: il modale varianti (identico al negozio). */
  apri(slug: string): void {
    this.prodottoS.getBySlug(slug).subscribe({
      next: dett => this.prodottoAperto.set(dett),
      error: err => this.toast(err?.error?.msg ?? 'Prodotto non disponibile', true)
    });
  }

  /** Modo ricerca: stesse regole del menu della barra. */
  vaiRisultato(r: RisultatoRicercaDTO): void {
    if (r.tipo !== 'CARTA') {
      this.router.navigate(['/prodotto', r.slug]);
      return;
    }
    if ((r.versioni ?? 1) > 1)
      this.router.navigate(['/carta', r.slug, 'versioni']);
    else
      this.router.navigate(['/carta', r.slug]);
  }

  dettaglioRisultato(r: RisultatoRicercaDTO): string {
    if (r.tipo === 'CARTA') return r.dettaglio ?? 'Carta';
    const tipo = this.ETICHETTA_TIPO[r.tipo] ?? r.tipo;
    return r.dettaglio ? `${tipo} · ${r.dettaglio}` : tipo;
  }

  chiudi(): void { this.prodottoAperto.set(null); }

  aggiungi(sku: MagazzinoSKUDTO): void {
    if (!this.authS.isAutentificated()) {
      this.router.navigate(['/login']);
      return;
    }
    const c = this.carrelloS.carrelloCorrente();
    const esistente = c?.voci.find(v => v.skuId === sku.id);
    const chiamata = esistente
      ? this.carrelloS.updateVoce(sku.id, esistente.quantita + 1)
      : this.carrelloS.addVoce(sku.id, 1);
    chiamata.subscribe({
      next: () => this.toast('Aggiunto al carrello', false),
      error: err => this.toast(err?.error?.msg ?? 'Impossibile aggiungere', true)
    });
  }

  // ---------------- Filtri: Set immutabili (zoneless) ----------------

  toggleEspansione(codice: string): void {
    this.fEspansioni.update(s => {
      const n = new Set(s); n.has(codice) ? n.delete(codice) : n.add(codice); return n;
    });
  }
  toggleRarita(r: string): void {
    this.fRarita.update(s => {
      const n = new Set(s); n.has(r) ? n.delete(r) : n.add(r); return n;
    });
  }
  toggleTipo(t: string): void {
    this.fTipi.update(s => {
      const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n;
    });
  }
  cambiaSoloDisponibili(v: boolean): void { this.fSoloDisponibili.set(v); }
  cambiaPrezzoMax(v: number | null): void {
    this.fPrezzoMax.set(v == null || v === ('' as unknown) ? null : Number(v));
  }
  azzeraFiltri(): void {
    this.fEspansioni.set(new Set());
    this.fRarita.set(new Set());
    this.fSoloDisponibili.set(false);
    this.fPrezzoMax.set(null);
    this.fTipi.set(new Set());
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}