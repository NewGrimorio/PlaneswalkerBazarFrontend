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

const BASE = environment.apiUrl;

type Toast = { testo: string; errore: boolean } | null;

/**
 * Tutte le versioni di una carta (/carta/:slug/versioni).
 * Stesse tessere della vetrina del set E stessa interazione: il
 * click sulla tessera apre il MODALE delle varianti del negozio
 * (identico: getBySlug -> pannello -> Aggiungi per variante, con
 * il link "Dettaglio carta"). Un'unica esperienza in tutto il sito:
 * la tessera apre il modale, il modale porta al dettaglio.
 *
 * Filtri client-side sui dati gia' caricati (come nel negozio).
 */
@Component({
  selector: 'app-carta-versioni',
  imports: [MatIconModule, RouterLink, DecimalPipe, FormsModule],
  templateUrl: './carta-versioni.html',
  styleUrl: './carta-versioni.css',
})
export class CartaVersioni {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authS = inject(AuthServices);
  private carrelloS = inject(Carrello);
  private prodottoS = inject(Prodotto);
  private platformId = inject(PLATFORM_ID);

  protected readonly urlImmagine = urlImmagine;

  versioni = signal<CartaVetrinaDTO[]>([]);
  caricamento = signal(true);
  errore = signal(false);
  messaggio = signal<Toast>(null);
  prodottoAperto = signal<ProdottoDTO | null>(null);

  // ---- filtri ----
  fEspansioni = signal<Set<string>>(new Set());  // per codice
  fRarita = signal<Set<string>>(new Set());
  fSoloDisponibili = signal(false);
  fPrezzoMax = signal<number | null>(null);

  nomeCarta = computed(() => this.versioni()[0]?.nome ?? '');

  /** I set presenti tra le versioni: le opzioni della tendina
   *  nascono dai dati, non da una lista cablata. */
  espansioniPresenti = computed(() => {
    const visti = new Map<string, string>();
    for (const v of this.versioni())
      if (!visti.has(v.espansioneCodice)) visti.set(v.espansioneCodice, v.espansioneNome);
    return [...visti.entries()].map(([codice, nome]) => ({ codice, nome }));
  });

  filtrate = computed(() => this.versioni().filter(v =>
    (this.fEspansioni().size === 0 || this.fEspansioni().has(v.espansioneCodice))
    && (this.fRarita().size === 0 || this.fRarita().has(v.rarita))
    && (!this.fSoloDisponibili() || v.prezzoDa != null)
    && (this.fPrezzoMax() == null || (v.prezzoDa != null && v.prezzoDa <= this.fPrezzoMax()!))
  ));

  filtriAttivi = computed(() =>
    this.fEspansioni().size > 0 || this.fRarita().size > 0 ||
    this.fSoloDisponibili() || this.fPrezzoMax() != null);

  readonly ETICHETTA_RARITA: Record<string, string> = {
    COMMON: 'Comune', UNCOMMON: 'Non comune', RARE: 'Rara',
    MYTHIC: 'Mitica', SPECIAL: 'Speciale', BONUS: 'Bonus',
  };
  readonly RARITA_FILTRO = Object.entries(this.ETICHETTA_RARITA)
      .map(([valore, etichetta]) => ({ valore, etichetta }));

  constructor() {
    this.route.paramMap.subscribe(pm => {
      const slug = pm.get('slug');
      if (slug) this.carica(slug);
    });
  }

  private carica(slug: string): void {
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

  // ---------------- Modale varianti (identico al negozio) ----------------

  /** Qui sono tutti SINGLE: il click apre sempre il modale. */
  apri(slug: string): void {
    this.prodottoS.getBySlug(slug).subscribe({
      next: dett => this.prodottoAperto.set(dett),
      error: err => this.toast(err?.error?.msg ?? 'Prodotto non disponibile', true)
    });
  }

  chiudi(): void { this.prodottoAperto.set(null); }

  aggiungi(sku: MagazzinoSKUDTO): void {
    // Sfogliare e' libero, comprare no: l'ospite va al login invece
    // di sbattere contro un 401 incomprensibile.
    if (!this.authS.isAutentificated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Deterministico a prescindere dalla semantica di addVoce: se lo
    // sku e' gia' nel carrello (signal CONDIVISO del service), si
    // imposta quantita+1; altrimenti 1.
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

  // ---- filtri: Set immutabili (zoneless) ----
  toggleEspansione(codice: string): void {
    this.fEspansioni.update(s => {
      const n = new Set(s);
      n.has(codice) ? n.delete(codice) : n.add(codice);
      return n;
    });
  }
  toggleRarita(r: string): void {
    this.fRarita.update(s => {
      const n = new Set(s);
      n.has(r) ? n.delete(r) : n.add(r);
      return n;
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
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}