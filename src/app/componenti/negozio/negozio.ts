import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Prodotto } from '../../services/prodotto';
import { Carrello } from '../../services/carrello';
import { ProdottoDTO } from '../../modelli/prodotti-dto';
import { CarrelloDTO } from '../../modelli/carrello-dto';
import { VoceCarrelloDTO } from '../../modelli/voce-carrello-dto';
import { MagazzinoSKUDTO } from '../../modelli/magazzino-sku-dto';
import { urlImmagine } from '../../utils/url-immagine';
import { Router } from '@angular/router';
import { AuthServices } from '../../auth/auth-services';
import { Utente } from '../../services/utente';

type Toast = { testo: string; errore: boolean } | null;

/**
 * Pagina NEGOZIO (temporanea): vetrina prodotti + carrello, il minimo
 * per iniziare un ordine mentre la homepage e' in lavorazione altrove.
 *
 * Flusso: la lista (listByTipo) NON porta le varianti -> click sul
 * prodotto -> dettaglio (getBySlug) con gli skus -> "Aggiungi" mette
 * lo sku nel carrello. Il carrello si popola solo nel browser (serve
 * il token); i prodotti sono pubblici e caricano anche in SSR.
 */
@Component({
  selector: 'app-negozio',
  imports: [DecimalPipe, MatIconModule],
  templateUrl: './negozio.html',
  styleUrl: './negozio.css',
})
export class Negozio {
  private prodottoS = inject(Prodotto);
  private carrelloS = inject(Carrello);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  //logout temporaneo
  private authS = inject(AuthServices);
  private utenteS = inject(Utente); 

  /** Esposta al template: le funzioni importate non sono visibili da sole. */
  protected readonly urlImmagine = urlImmagine;

  tipi = [
    { v: 'SINGLE',      l: 'Carte singole' },
    { v: 'BOOSTER_BOX', l: 'Box' },
    { v: 'MAZZO',       l: 'Mazzi' },
    { v: 'ACCESSORIO',  l: 'Accessori' },
  ];

  prodotti = signal<ProdottoDTO[]>([]);
  tipoSel = signal<string>('SINGLE');
  caricando = signal(false);

  prodottoAperto = signal<ProdottoDTO | null>(null);
  carrello = signal<CarrelloDTO | null>(null);
  messaggio = signal<Toast>(null);

  constructor() {
    this.caricaProdotti(this.tipoSel());
    // Il carrello richiede il token: solo nel browser. In SSR non c'e'
    // sessione, quindi qui non si tenta nemmeno (niente 401 nel render).
    if (isPlatformBrowser(this.platformId)) this.caricaCarrello();
  }

  // ---------------- Vetrina ----------------

  cambiaTipo(tipo: string): void {
    if (this.tipoSel() === tipo) return;
    this.tipoSel.set(tipo);
    this.caricaProdotti(tipo);
  }

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
      error: () => {}   // ospite/SSR: silenzio, il client riprova dopo l'hydration
    });
  }

  aggiungi(sku: MagazzinoSKUDTO): void {
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
    // Il carrello e' pronto: si va al checkout (riepilogo, credito,
    // indirizzo, conferma). Il backend fa il resto.
    this.router.navigate(['/checkout']);
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
  
  //Logout temporaneo
  esci(): void {
    this.utenteS.logout().subscribe({
      next: () => this.chiudiSessione(),
      error: () => this.chiudiSessione()
    });
  }
 
  private chiudiSessione(): void {
    this.authS.resetAll();
    this.router.navigate(['/login']);
  }


}