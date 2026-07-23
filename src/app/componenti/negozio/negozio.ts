import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Prodotto } from '../../services/prodotto';
import { Carrello } from '../../services/carrello';
import { ProdottoDTO } from '../../modelli/prodotti-dto';
import { CarrelloDTO } from '../../modelli/carrello-dto';
import { VoceCarrelloDTO } from '../../modelli/voce-carrello-dto';
import { MagazzinoSKUDTO } from '../../modelli/magazzino-sku-dto';
import { urlImmagine } from '../../utils/url-immagine';
import { AuthServices } from '../../auth/auth-services';

type Toast = { testo: string; errore: boolean } | null;

/**
 * Vetrina + carrello. Vive dentro UserLayout: la nav e il logout
 * stanno nella shell, qui resta solo il catalogo.
 *
 * La CATEGORIA arriva dalla rotta (data.tipo), non da filtri locali:
 * ogni categoria ha un suo URL condivisibile e indicizzabile.
 *
 * Il catalogo e' PUBBLICO: i prodotti caricano anche in SSR e per un
 * ospite. Il carrello invece richiede il token, quindi si popola solo
 * nel browser e solo da autenticati.
 *
 * Flusso: la lista (listByTipo) NON porta le varianti -> click sul
 * prodotto -> dettaglio (getBySlug) con gli skus -> "Aggiungi".
 */
@Component({
  selector: 'app-negozio',
  imports: [DecimalPipe, MatIconModule, RouterLink],
  templateUrl: './negozio.html',
  styleUrl: './negozio.css',
})
export class Negozio {
  private prodottoS = inject(Prodotto);
  private carrelloS = inject(Carrello);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /** Pubblico: il template lo interroga per distinguere ospite e cliente. */
  authS = inject(AuthServices);

  /** Esposta al template: le funzioni importate non sono visibili da sole. */
  protected readonly urlImmagine = urlImmagine;

  private etichette: Record<string, string> = {
    SINGLE: 'Carte singole',
    BOOSTER: 'Bustine',
    BOOSTER_BOX: 'Box',
    MAZZO: 'Mazzi',
    SET_LOTTO: 'Lotti',
    SIGILLATO: 'Sigillato',
    ACCESSORIO: 'Accessori',
  };

  prodotti = signal<ProdottoDTO[]>([]);
  tipoSel = signal<string>('SINGLE');
  caricando = signal(false);

  prodottoAperto = signal<ProdottoDTO | null>(null);
  carrello = signal<CarrelloDTO | null>(null);
  messaggio = signal<Toast>(null);

  titolo = computed(() => this.etichette[this.tipoSel()] ?? 'Catalogo');

  constructor() {
    // subscribe, non snapshot: navigando tra categorie sorelle il
    // componente viene RIUSATO e il costruttore non gira di nuovo.
    this.route.data.subscribe(d => {
      this.tipoSel.set(d['tipo'] ?? 'SINGLE');
      this.caricaProdotti(this.tipoSel());
    });

    // Il carrello richiede il token: niente chiamata da ospite o in SSR,
    // altrimenti si spara una 401 a ogni apertura di pagina.
    if (isPlatformBrowser(this.platformId) && this.authS.isAutentificated())
      this.caricaCarrello();
  }

  // ---------------- Vetrina ----------------

  private caricaProdotti(tipo: string): void {
    this.caricando.set(true);
    this.prodottoS.listByTipo(tipo).subscribe({
      next: l => { this.prodotti.set(l); this.caricando.set(false); },
      error: () => { this.prodotti.set([]); this.caricando.set(false); }
    });
  }

  apri(p: ProdottoDTO): void {
    // Il dettaglio (slug) porta gli skus: senza, non c'e' nulla da aggiungere.
    this.prodottoS.getBySlug(p.slug).subscribe({
      next: dett => this.prodottoAperto.set(dett),
      error: err => this.toast(err?.error?.msg ?? 'Prodotto non disponibile', true)
    });
  }

  chiudi(): void { this.prodottoAperto.set(null); }

  // ---------------- Carrello ----------------

  private caricaCarrello(): void {
    this.carrelloS.get().subscribe({
      next: c => this.carrello.set(c),
      error: () => {}
    });
  }

  aggiungi(sku: MagazzinoSKUDTO): void {
    // Sfogliare e' libero, comprare no: l'ospite viene mandato al login
    // invece di sbattere contro un 401 incomprensibile.
    if (!this.authS.isAutentificated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Deterministico a prescindere dalla semantica di addVoce: se lo
    // sku e' gia' nel carrello, si imposta quantita+1; altrimenti 1.
    const c = this.carrello();
    const esistente = c?.voci.find(v => v.skuId === sku.id);
    const chiamata = esistente
      ? this.carrelloS.updateVoce(sku.id, esistente.quantita + 1)
      : this.carrelloS.addVoce(sku.id, 1);

    chiamata.subscribe({
      next: agg => { this.carrello.set(agg); this.toast('Aggiunto al carrello', false); },
      error: err => this.toast(err?.error?.msg ?? 'Impossibile aggiungere', true)
    });
  }

  incrementa(v: VoceCarrelloDTO): void {
    this.carrelloS.updateVoce(v.skuId, v.quantita + 1).subscribe({
      next: agg => this.carrello.set(agg),
      error: err => this.toast(err?.error?.msg ?? 'Errore', true)
    });
  }

  decrementa(v: VoceCarrelloDTO): void {
    if (v.quantita <= 1) { this.rimuovi(v); return; }
    this.carrelloS.updateVoce(v.skuId, v.quantita - 1).subscribe({
      next: agg => this.carrello.set(agg),
      error: err => this.toast(err?.error?.msg ?? 'Errore', true)
    });
  }

  rimuovi(v: VoceCarrelloDTO): void {
    this.carrelloS.removeVoce(v.id).subscribe({
      next: agg => this.carrello.set(agg),
      error: err => this.toast(err?.error?.msg ?? 'Errore', true)
    });
  }

  svuota(): void {
    this.carrelloS.svuota().subscribe({
      next: () => this.caricaCarrello(),
      error: err => this.toast(err?.error?.msg ?? 'Errore', true)
    });
  }

  procedi(): void {
    this.router.navigate(['/checkout']);
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}