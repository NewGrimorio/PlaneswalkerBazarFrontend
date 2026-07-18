import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { ProdottoDTO } from '../../modelli/prodotti-dto';
import { MagazzinoSKUDTO } from '../../modelli/magazzino-sku-dto';
import { MagazzinoSKUReq } from '../../modelli/magazzino-sku-req';
import { EspansioneDTO } from '../../modelli/espansione-dto';

const BASE = environment.apiUrl;
const HOST = environment.serverUrl;

/** Riga editabile: copia locale dei campi modificabili + confronto per il flag sporco */
interface RigaSku {
  sku: MagazzinoSKUDTO;
  lingua: string;
  prezzo: number;
  quantita: number;
}

const CONDIZIONI = [
  { valore: 'MT', etichetta: 'Mint' },
  { valore: 'NM', etichetta: 'Near Mint' },
  { valore: 'EX', etichetta: 'Excellent' },
  { valore: 'GD', etichetta: 'Good' },
  { valore: 'LP', etichetta: 'Light Played' },
  { valore: 'PL', etichetta: 'Played' },
  { valore: 'PO', etichetta: 'Poor' },
] as const;   // NA escluso: sentinella tecnica, mai scelta dall'admin

const LINGUE = ['en', 'it', 'de', 'fr', 'es', 'pt', 'ja', 'ko', 'ru', 'zh'] as const;
const FINITURE = ['NONFOIL', 'FOIL', 'ETCHED'] as const;

@Component({
  selector: 'app-magazzino',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatIconModule],
  templateUrl: './magazzino.html',
  styleUrl: './magazzino.css',
})
export class Magazzino {

  private http = inject(HttpClient);

  /** Tab per lo sfoglia: SINGLE ha il flusso a due passi via espansione */
  tipiSfoglia = [
    { valore: 'SINGLE',      etichetta: 'Singole' },
    { valore: 'BOOSTER',     etichetta: 'Buste' },
    { valore: 'BOOSTER_BOX', etichetta: 'Box' },
    { valore: 'MAZZO',       etichetta: 'Mazzi' },
    { valore: 'SET_LOTTO',   etichetta: 'Lotti' },
    { valore: 'SIGILLATO',   etichetta: 'Sigillato' },
    { valore: 'ACCESSORIO',  etichetta: 'Accessori' },
  ] as const;

  condizioni = CONDIZIONI;
  lingue = LINGUE;
  finiture = FINITURE;

  // --- Ricerca e sfoglia (master) ---
  testoRicerca = '';
  risultati = signal<ProdottoDTO[]>([]);
  cercato = signal(false);
  tipoSfoglia = signal<string | null>(null);
  espansioni = signal<EspansioneDTO[]>([]);
  espansioneSel = signal<EspansioneDTO | null>(null);

  // --- Prodotto selezionato (detail) ---
  prodotto = signal<ProdottoDTO | null>(null);
  righe = signal<RigaSku[]>([]);
  rigaInModifica = signal<number | null>(null);

  // --- Form nuova variante / scorte ---
  formAperto = signal(false);
  fCondizione = 'NM';
  fLingua = 'en';
  fFinitura = 'NONFOIL';
  fPrezzo: number | null = null;
  fQuantita: number | null = null;

  messaggio = signal<{ testo: string; errore: boolean } | null>(null);
  inCorso = signal(false);

  get isSingle(): boolean {
    return this.prodotto()?.tipoProdotto === 'SINGLE';
  }

  /** Etichetta contestuale: le "varianti" sono gergo da singole */
  get etichettaBottoneNuova(): string {
    return this.isSingle ? 'Nuova variante' : 'Inserisci scorte';
  }

  // ============================================================
  // Navigazione master: ricerca, sfoglia per tipo, espansioni
  // ============================================================

  cerca(): void {
    const q = this.testoRicerca.trim();
    if (q.length < 2) return;
    this.chiudiDettaglio();
    this.tipoSfoglia.set(null);
    this.espansioneSel.set(null);
    this.http.get<ProdottoDTO[]>(`${BASE}/admin/catalogo/prodotti/search`,
        { params: { q } })
      .subscribe({
        next: lista => { this.risultati.set(lista); this.cercato.set(true); },
        error: err => this.mostraErrore(err)
      });
  }

  sfoglia(tipo: string): void {
    this.chiudiDettaglio();
    this.tipoSfoglia.set(tipo);
    this.testoRicerca = '';
    this.risultati.set([]);
    this.cercato.set(false);
    this.espansioneSel.set(null);
    this.messaggio.set(null);

    if (tipo === 'SINGLE') {
      // Passo 1: la scelta dell'espansione (lista caricata una volta sola)
      if (this.espansioni().length === 0) {
        this.http.get<EspansioneDTO[]>(`${BASE}/espansioni`)
          .subscribe({
            next: l => this.espansioni.set(l),
            error: err => this.mostraErrore(err)
          });
      }
    } else {
      this.http.get<ProdottoDTO[]>(`${BASE}/admin/catalogo/prodotti/tipo/${tipo}`)
        .subscribe({
          next: lista => { this.risultati.set(lista); this.cercato.set(true); },
          error: err => this.mostraErrore(err)
        });
    }
  }

  /** Passo 2 delle singole: le carte dell'espansione scelta */
  scegliEspansione(e: EspansioneDTO): void {
    this.chiudiDettaglio();
    this.espansioneSel.set(e);
    this.http.get<ProdottoDTO[]>(
        `${BASE}/admin/catalogo/prodotti/espansione/${e.id}`,
        { params: { tipo: 'SINGLE' } })
      .subscribe({
        next: lista => { this.risultati.set(lista); this.cercato.set(true); },
        error: err => this.mostraErrore(err)
      });
  }

  tornaAEspansioni(): void {
    this.chiudiDettaglio();
    this.espansioneSel.set(null);
    this.risultati.set([]);
    this.cercato.set(false);
  }

  /** Iniziare una nuova navigazione chiude il dettaglio aperto */
  private chiudiDettaglio(): void {
    this.prodotto.set(null);
    this.righe.set([]);
    this.formAperto.set(false);
    this.rigaInModifica.set(null);
  }

  // ============================================================
  // Dettaglio: SKU del prodotto selezionato
  // ============================================================

  seleziona(p: ProdottoDTO): void {
    this.prodotto.set(p);
    this.risultati.set([]);
    this.cercato.set(false);
    this.tipoSfoglia.set(null);
    this.espansioneSel.set(null);
    this.messaggio.set(null);
    this.formAperto.set(false);
    this.rigaInModifica.set(null);
    this.caricaSku(p.id);
  }

  private caricaSku(prodottoId: number): void {
    this.http.get<MagazzinoSKUDTO[]>(`${BASE}/admin/sku`,
        { params: { prodottoId } })
      .subscribe({
        next: lista => this.righe.set(lista.map(s => ({
          sku: s, lingua: s.lingua, prezzo: s.prezzo, quantita: s.quantita }))),
        error: err => this.mostraErrore(err)
      });
  }

  // --- Modifica inline per riga ---
  // Prezzo/quantita sempre; lingua SOLO per i non-SINGLE (per le carte la
  // lingua e' identita' fisica della variante: si crea una variante nuova).

  modificata(r: RigaSku): boolean {
    return r.prezzo !== r.sku.prezzo
        || r.quantita !== r.sku.quantita
        || (!this.isSingle && r.lingua !== r.sku.lingua);
  }

  inModifica(r: RigaSku): boolean {
    return this.rigaInModifica() === r.sku.id;
  }

  apriModifica(r: RigaSku): void {
    // Una riga alla volta: eventuali modifiche pendenti altrove si scartano
    const aperta = this.righe().find(x => this.inModifica(x));
    if (aperta) this.annullaModifica(aperta);
    r.lingua = r.sku.lingua;
    r.prezzo = r.sku.prezzo;
    r.quantita = r.sku.quantita;
    this.rigaInModifica.set(r.sku.id);
  }

  annullaModifica(r: RigaSku): void {
    r.lingua = r.sku.lingua;
    r.prezzo = r.sku.prezzo;
    r.quantita = r.sku.quantita;
    this.rigaInModifica.set(null);
  }

  salvaRiga(r: RigaSku): void {
    if (!this.modificata(r)) { this.rigaInModifica.set(null); return; }
    if (r.prezzo < 0 || r.quantita < 0) return;
    const corpo: any = { id: r.sku.id, prezzo: r.prezzo, quantita: r.quantita };
    if (!this.isSingle) corpo.lingua = r.lingua;
    this.http.put<MagazzinoSKUDTO>(`${BASE}/admin/sku`, corpo)
      .subscribe({
        next: agg => this.aggiornaRiga(agg),
        error: err => this.mostraErrore(err)
      });
  }

  toggleAttivo(r: RigaSku): void {
    this.http.put<MagazzinoSKUDTO>(`${BASE}/admin/sku`,
        { id: r.sku.id, attivo: !r.sku.attivo })
      .subscribe({
        next: agg => this.aggiornaRiga(agg),
        error: err => this.mostraErrore(err)
      });
  }

  private aggiornaRiga(agg: MagazzinoSKUDTO): void {
    this.righe.update(lista => lista.map(r =>
      r.sku.id === agg.id
        ? { sku: agg, lingua: agg.lingua, prezzo: agg.prezzo, quantita: agg.quantita }
        : r));
    this.rigaInModifica.set(null);
  }

  // ============================================================
  // Nuova variante / inserimento scorte: due percorsi, spedizione unica
  // ============================================================

  apriForm(): void {
    this.fCondizione = 'NM';
    this.fLingua = 'en';
    this.fFinitura = 'NONFOIL';
    this.fPrezzo = null;
    this.fQuantita = null;
    this.formAperto.set(true);
  }

  /** Dispatcher del bottone: instrada al percorso giusto */
  salvaVariante(): void {
    this.isSingle ? this.creaVariante() : this.creaVarianteProdotto();
  }

  /** SOLO carte singole: variante completa di condizione e finitura */
  creaVariante(): void {
    if (!this.isSingle) return;          // guardia: metodo riservato ai SINGLE
    const base = this.corpoBase();
    if (!base) return;
    this.inviaVariante({
      ...base,
      condizione: this.fCondizione,
      finitura: this.fFinitura,
    });
  }

  /** Prodotti non-SINGLE: solo lingua/prezzo/quantità.
   *  Condizione e finitura le mette il backend (sentinelle NA / NONFOIL). */
  creaVarianteProdotto(): void {
    if (this.isSingle) return;
    const base = this.corpoBase();
    if (!base) return;
    this.inviaVariante(base);
  }

  /** Validazione e campi comuni ai due percorsi */
  private corpoBase(): MagazzinoSKUReq | null {
    const p = this.prodotto();
    if (!p || this.fPrezzo === null || this.fQuantita === null || this.inCorso())
      return null;
    return {
      prodottoId: p.id,
      lingua: this.fLingua,
      prezzo: this.fPrezzo,
      quantita: this.fQuantita,
    };
  }

  /** Spedizione unica: POST, aggiornamento lista, errori — un posto solo */
  private inviaVariante(corpo: MagazzinoSKUReq): void {
    this.inCorso.set(true);
    this.messaggio.set(null);

    this.http.post<MagazzinoSKUDTO>(`${BASE}/admin/sku`, corpo)
      .subscribe({
        next: nuovo => {
          this.righe.update(lista => [...lista,
            { sku: nuovo, lingua: nuovo.lingua, prezzo: nuovo.prezzo, quantita: nuovo.quantita }]);
          this.formAperto.set(false);
          this.inCorso.set(false);
        },
        error: err => { this.mostraErrore(err); this.inCorso.set(false); }
      });
  }

  // ============================================================
  // Presentazione
  // ============================================================

  etichettaCondizione(codice: string): string {
    if (codice === 'NA') return '—';
    return CONDIZIONI.find(c => c.valore === codice)?.etichetta ?? codice;
  }

  urlImmagine(percorso: string | null): string | null {
    if (!percorso) return null;
    return percorso.startsWith('http') ? percorso : HOST + percorso;
  }

  private mostraErrore(err: any): void {
    this.messaggio.set({
      testo: err.error?.msg ?? 'Errore di comunicazione col server',
      errore: true
    });
  }
}