import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Prodotto } from '../../services/prodotto';
import { Recensione } from '../../services/recensione';
import { RecensioneDTO, RecensioneStatisticheDTO } from '../../modelli/recensione-dto';
import { Carrello } from '../../services/carrello';
import { ProdottoDTO } from '../../modelli/prodotti-dto';
import { MagazzinoSKUDTO } from '../../modelli/magazzino-sku-dto';
import { AuthServices } from '../../auth/auth-services';
import { urlImmagine } from '../../utils/url-immagine';

type Toast = { testo: string; errore: boolean } | null;

/**
 * Pagina di DETTAGLIO dei prodotti non-single (/prodotto/:slug):
 * box, buste, mazzi, lotti, bundle, accessori. Il modale del negozio
 * resta per le single (che hanno gia' /carta/:slug) e per i prodotti
 * senza varianti; qui un prodotto da scaffale ha lo spazio che merita:
 * immagine grande, descrizione, varianti per lingua/finitura.
 *
 * URL condivisibile e indicizzabile — stesso principio delle vetrine.
 * Il catalogo e' pubblico (carica anche in SSR); il carrello solo nel
 * browser e da autenticati, come nel negozio.
 */
@Component({
  selector: 'app-dettaglio-prodotto',
  imports: [DecimalPipe, DatePipe, MatIconModule, RouterLink],
  templateUrl: './dettaglio-prodotto.html',
  styleUrl: './dettaglio-prodotto.css',
})
export class DettaglioProdotto {
  private prodottoS = inject(Prodotto);
  private recensioneS = inject(Recensione);
  private carrelloS = inject(Carrello);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  authS = inject(AuthServices);

  protected readonly urlImmagine = urlImmagine;

  prodotto = signal<ProdottoDTO | null>(null);
  caricando = signal(true);
  messaggio = signal<Toast>(null);

  // ---- Recensioni pubbliche (solo APPROVATE, autore anonimizzato) ----
  recensioni = signal<RecensioneDTO[]>([]);
  statistiche = signal<RecensioneStatisticheDTO | null>(null);

  /** Da dove tornare indietro: la vetrina del tipo del prodotto. */
  private readonly VETRINE: Record<string, string> = {
    BOOSTER: 'bustine', BOOSTER_BOX: 'box', MAZZO: 'mazzi',
    SET_LOTTO: 'lotti', SIGILLATO: 'sigillato', ACCESSORIO: 'accessori',
  };
  private readonly ETICHETTE: Record<string, string> = {
    BOOSTER: 'Bustine', BOOSTER_BOX: 'Box', MAZZO: 'Mazzi',
    SET_LOTTO: 'Lotti di carte', SIGILLATO: 'Bundle', ACCESSORIO: 'Accessori',
  };

  /**
   * Per i prodotti generici condizione (sempre NA) e finitura (sempre
   * NONFOIL) sono sentinelle del DB: non si mostrano. La LINGUA invece
   * conta (un box ENG e uno ITA sono varianti diverse) e si mostra in
   * parola, non in sigla.
   */
  private readonly LINGUE: Record<string, string> = {
    en: 'Inglese', it: 'Italiano', fr: 'Francese', de: 'Tedesco',
    es: 'Spagnolo', pt: 'Portoghese', ja: 'Giapponese', ko: 'Coreano',
    ru: 'Russo', zhs: 'Cinese semplificato', zht: 'Cinese tradizionale',
  };
  lingua(s: MagazzinoSKUDTO): string {
    return this.LINGUE[s.lingua] ?? s.lingua;
  }

  // ---------------- Quantita' per variante ----------------
  // Signal aggiornato IMMUTABILMENTE (zoneless: mutare una proprieta'
  // plain non triggera la change detection). Default 1, tetto alla
  // giacenza: piu' di cosi' non si puo' nemmeno chiedere.
  private qta = signal<Record<number, number>>({});

  qtaDi(s: MagazzinoSKUDTO): number {
    return this.qta()[s.id] ?? 1;
  }
  cambiaQta(s: MagazzinoSKUDTO, delta: number): void {
    const v = Math.min(Math.max(this.qtaDi(s) + delta, 1), Math.max(s.quantita, 1));
    this.qta.update(m => ({ ...m, [s.id]: v }));
  }

  constructor() {
    // paramMap come stream: navigando tra due prodotti il componente
    // e' riusato e il costruttore non gira di nuovo (stesso principio
    // del negozio con combineLatest).
    this.route.paramMap.subscribe(p => {
      const slug = p.get('slug');
      if (slug) this.carica(slug);
    });

    // Niente GET del carrello qui: lo stato vive nel SIGNAL CONDIVISO
    // del service, caricato dalla shell (UserLayout) al login. Questa
    // pagina lo legge e basta — una fonte, zero chiamate doppie.
  }

  private carica(slug: string): void {
    this.caricando.set(true);
    this.recensioni.set([]);          // navigando tra prodotti: reset,
    this.statistiche.set(null);       // niente recensioni "fantasma"
    this.prodottoS.getBySlug(slug).subscribe({
      next: dett => {
        this.prodotto.set(dett);
        this.caricando.set(false);
        this.caricaRecensioni(dett.id);
      },
      error: () => { this.prodotto.set(null); this.caricando.set(false); }
    });
  }

  /** Dati pubblici: caricano anche in SSR (recensioni indicizzabili).
   *  Best-effort: se falliscono, la sezione semplicemente non compare
   *  — la pagina prodotto non deve rompersi per le recensioni. */
  private caricaRecensioni(prodottoId: number): void {
    this.recensioneS.statisticheByProdotto(prodottoId).subscribe({
      next: st => this.statistiche.set(st),
      error: () => this.statistiche.set(null),
    });
    this.recensioneS.pubblicheByProdotto(prodottoId).subscribe({
      next: r => this.recensioni.set(r),
      error: () => this.recensioni.set([]),
    });
  }

  /** 5 posizioni piene/vuote per il voto (interi 1..5); per la media
   *  si arrotonda al piu' vicino — la precisione sta nel numero. */
  stelle(voto: number): boolean[] {
    const pieno = Math.round(voto);
    return [1, 2, 3, 4, 5].map(i => i <= pieno);
  }

  linkVetrina(): string {
    return '/' + (this.VETRINE[this.prodotto()?.tipoProdotto ?? ''] ?? '');
  }
  etichettaTipo(): string {
    return this.ETICHETTE[this.prodotto()?.tipoProdotto ?? ''] ?? 'Catalogo';
  }

  /** Stessa logica deterministica del negozio, con la QUANTITA'
   *  scelta: esistente -> quantita esistente + n, altrimenti n. */
  aggiungi(sku: MagazzinoSKUDTO): void {
    if (!this.authS.isAutentificated()) {
      this.router.navigate(['/login']);
      return;
    }
    const n = this.qtaDi(sku);
    const c = this.carrelloS.carrelloCorrente();
    const esistente = c?.voci.find(v => v.skuId === sku.id);
    const chiamata = esistente
      ? this.carrelloS.updateVoce(sku.id, esistente.quantita + n)
      : this.carrelloS.addVoce(sku.id, n);

    // Il tap nel service aggiorna il signal (e il badge in topbar):
    // qui resta solo il feedback all'utente.
    chiamata.subscribe({
      next: () => this.toast('Aggiunto al carrello', false),
      error: err => this.toast(err?.error?.msg ?? 'Impossibile aggiungere', true)
    });
  }

  vaiAlCarrello(): void {
    this.router.navigate(['/checkout']);
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}