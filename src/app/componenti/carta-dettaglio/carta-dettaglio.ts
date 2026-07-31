import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Prodotto } from '../../services/prodotto';
import { Carrello } from '../../services/carrello';
import { ProdottoDTO } from '../../modelli/prodotti-dto';
import { CarrelloDTO } from '../../modelli/carrello-dto';
import { MagazzinoSKUDTO } from '../../modelli/magazzino-sku-dto';
import { AuthServices } from '../../auth/auth-services';
import { urlImmagine } from '../../utils/url-immagine';
import { SimboliManaPipe } from '../../utils/simboli-mana-pipe';

type Toast = { testo: string; errore: boolean } | null;

/**
 * Pagina carta (stile Scryfall/TCGPlayer): dati oracle, legalita',
 * varianti in negozio. Pubblica -> renderizza anche in SSR; solo
 * l'acquisto richiede il login.
 */
@Component({
  selector: 'app-carta-dettaglio',
  imports: [DecimalPipe, MatIconModule, RouterLink, SimboliManaPipe],
  templateUrl: './carta-dettaglio.html',
  styleUrl: './carta-dettaglio.css',
})
export class CartaDettaglio {
  private prodottoS = inject(Prodotto);
  private carrelloS = inject(Carrello);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  authS = inject(AuthServices);

  protected readonly urlImmagine = urlImmagine;

  prodotto = signal<ProdottoDTO | null>(null);
  carrello = signal<CarrelloDTO | null>(null);
  messaggio = signal<Toast>(null);

  private readonly FORMATI = ['standard', 'pioneer', 'modern', 'legacy',
    'vintage', 'commander', 'pauper', 'brawl', 'oathbreaker', 'penny'];
  readonly STATO_LEGALE: Record<string, string> = {
    legal: 'Legale', not_legal: 'Non legale', banned: 'Bandita', restricted: 'Limitata',
  };

  /**
   * Link esterni della stampa. Scryfall usa l'URL canonico
   * set/numero (gia' nel DTO, minuscolo dalla normalizzazione);
   * encodeURIComponent per i numeri con caratteri speciali
   * (promo tipo "1★"). Gatherer solo se il multiverseId esiste:
   * molte stampe moderne non sono sul database Wizards.
   */
  linkScryfall = computed(() => {
    const s = this.prodotto()?.stampa;
    if (!s) return null;
    return `https://scryfall.com/card/${s.espansioneCodice}/${encodeURIComponent(s.numeroCollezione)}`;
  });

  linkGatherer = computed(() => {
    const id = this.prodotto()?.stampa?.multiverseId;
    return id ? `https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${id}` : null;
  });

  /** legal e' JSON grezzo dal backend: si interpreta qui (come da contratto). */
  legalita = computed(() => {
    const raw = this.prodotto()?.carta?.legal;
    if (!raw) return [];
    try {
      const obj = JSON.parse(raw) as Record<string, string>;
      return this.FORMATI.filter(f => f in obj).map(f => ({ formato: f, stato: obj[f] }));
    } catch { return []; }
  });

  constructor() {
    // subscribe, non snapshot: navigando tra carte il componente e' riusato
    this.route.paramMap.subscribe(p => {
      const slug = p.get('slug');
      if (slug) this.carica(slug);
    });
    if (isPlatformBrowser(this.platformId) && this.authS.isAutentificated())
      this.carrelloS.get().subscribe({ next: c => this.carrello.set(c), error: () => {} });
  }

  private carica(slug: string): void {
    this.prodottoS.getBySlug(slug).subscribe({
      next: p => this.prodotto.set(p),
      error: () => this.toast('Carta non trovata', true)
    });
  }

  aggiungi(sku: MagazzinoSKUDTO): void {
    if (!this.authS.isAutentificated()) { this.router.navigate(['/login']); return; }
    const esistente = this.carrello()?.voci.find(v => v.skuId === sku.id);
    const chiamata = esistente
      ? this.carrelloS.updateVoce(sku.id, esistente.quantita + 1)
      : this.carrelloS.addVoce(sku.id, 1);
    chiamata.subscribe({
      next: agg => { this.carrello.set(agg); this.toast('Aggiunto al carrello', false); },
      error: err => this.toast(err?.error?.msg ?? 'Impossibile aggiungere', true)
    });
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
  
}