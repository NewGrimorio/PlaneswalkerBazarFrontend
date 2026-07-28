import { Component, ElementRef, inject, signal, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Ordine } from '../../../services/ordine';
import { Recensione, RecensioneSaveReq } from '../../../services/recensione';
import { OrdineDTO } from '../../../modelli/ordine-dto';
import { RecensioneDTO } from '../../../modelli/recensione-dto';
import { StoricoStatoOrdineDTO } from '../../../modelli/storico-stato-ordine-dto';

type Toast = { testo: string; errore: boolean } | null;

/** Un'azione disponibile su un ordine, con la conferma da chiedere. */
interface Azione {
  path: string;
  label: string;
  icona: string;
  conferma?: string;
  distruttiva?: boolean;
  /** L'azione richiede una motivazione: apre il dialog, niente POST diretto. */
  richiedeNota?: boolean;
}

/**
 * "I miei ordini": lista + dettaglio a scomparsa (voci e timeline) e
 * le transizioni CLIENTE della state machine.
 *
 * Le azioni dipendono dallo stato ed e' il BACKEND a stabilirlo
 * (caricaEValidaStatoOwner): qui si mostrano solo quelle legali, cosi'
 * l'utente non incontra rifiuti — ma la verita' resta lato server.
 *
 * DUE <dialog> nativi (showModal: focus trap, ESC e backdrop gratis;
 * nessuna API browser in SSR, si aprono solo al click):
 *  - RESO: motivazione obbligatoria (max 300 — V15)
 *  - RECENSIONE: stelle + titolo + testo; una per prodotto (upsert),
 *    stati con diritto = CONSEGNATO/RESO_RICHIESTO/RIMBORSATO come il
 *    Set del backend. MODERAZIONE PREVENTIVA: dopo l'invio si avvisa
 *    che sara' visibile solo dopo l'approvazione.
 */
@Component({
  selector: 'app-ordini-cliente',
  imports: [DecimalPipe, DatePipe, MatIconModule, RouterLink],
  templateUrl: './ordini.html',
  styleUrl: './ordini.css',
})
export class OrdiniCliente {
  private ordineS = inject(Ordine);
  private recensioneS = inject(Recensione);
  private platformId = inject(PLATFORM_ID);

  private dialogReso = viewChild.required<ElementRef<HTMLDialogElement>>('dialogReso');
  private dialogRecensione = viewChild.required<ElementRef<HTMLDialogElement>>('dialogRecensione');

  ordini = signal<OrdineDTO[]>([]);
  caricando = signal(true);
  apertoId = signal<number | null>(null);
  dettaglio = signal<OrdineDTO | null>(null);
  timeline = signal<StoricoStatoOrdineDTO[]>([]);
  inCorso = signal<number | null>(null);
  messaggio = signal<Toast>(null);

  // --- Stato del dialog reso ---
  resoPerOrdine = signal<OrdineDTO | null>(null);   // null = dialog chiuso
  notaReso = signal('');
  erroreReso = signal<string | null>(null);

  // --- Stato del dialog recensione ---
  recensionePerOrdine = signal<OrdineDTO | null>(null);
  mieRecensioni = signal<RecensioneDTO[]>([]);      // per l'ordine aperto
  prodottoSel = signal<number | null>(null);
  votoSel = signal(0);
  titoloRec = signal('');
  testoRec = signal('');
  erroreRecensione = signal<string | null>(null);
  inviandoRec = signal(false);

  /** Speculare a STATI_CON_DIRITTO del backend: chi ha RICEVUTO giudica. */
  readonly STATI_RECENSIBILI = ['CONSEGNATO', 'RESO_RICHIESTO', 'RIMBORSATO'];

  readonly ETICHETTA_STATO: Record<string, string> = {
    CREATO: 'In preparazione',
    SPEDITO: 'Spedito',
    CONSEGNATO: 'Consegnato',
    NON_CONSEGNATO: 'Non consegnato',
    RESO_RICHIESTO: 'Reso richiesto',
    RIMBORSATO: 'Rimborsato',
    ANNULLATO: 'Annullato',
    CANCELLATO: 'Cancellato',
  };

  /** Azioni per stato: rispecchia gli Set.of(...) del service backend. */
  private readonly AZIONI: Record<string, Azione[]> = {
    CREATO: [
      { path: 'annulla', label: 'Annulla ordine', icona: 'cancel',
        conferma: 'Annullare l\'ordine? Il credito ti verrà restituito.',
        distruttiva: true },
    ],
    SPEDITO: [
      { path: 'conferma-consegna', label: 'Spedizione arrivata', icona: 'check_circle' },
      { path: 'segnala-non-consegnato', label: 'Spedizione non arrivata', icona: 'report_problem',
        conferma: 'Segnalare che la spedizione non è arrivata?' },
    ],
    CONSEGNATO: [
      // Niente `conferma`: il dialog E' la conferma (e chiede di piu')
      { path: 'richiedi-reso', label: 'Richiedi reso', icona: 'keyboard_return',
        richiedeNota: true },
    ],
  };

  azioniDi(o: OrdineDTO): Azione[] {
    const azioni = this.AZIONI[o.stato] ?? [];
    // La finestra del reso e' DERIVATA dalla timeline gia' caricata:
    // niente campi nuovi nel DTO. Qui si nasconde il bottone per non
    // far incontrare rifiuti; la verita' resta il server (V16).
    if (o.stato === 'CONSEGNATO' && this.resoScaduto())
      return azioni.filter(a => a.path !== 'richiedi-reso');
    return azioni;
  }

  /** Speculare ad app.ordini.reso-giorni del backend. */
  readonly RESO_GIORNI = 14;

  /** True se la consegna (dalla timeline) e' oltre la finestra di reso. */
  resoScaduto(): boolean {
    const consegna = this.timeline().filter(t => t.statoA === 'CONSEGNATO').at(-1);
    if (!consegna) return false;           // timeline non ancora arrivata: decide il server
    const limite = new Date(consegna.creationDate);
    limite.setDate(limite.getDate() + this.RESO_GIORNI);
    return limite.getTime() < Date.now();
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.carica();
    else this.caricando.set(false);
  }

  private carica(): void {
    this.caricando.set(true);
    this.ordineS.list().subscribe({
      next: l => { this.ordini.set(l); this.caricando.set(false); },
      error: err => {
        this.ordini.set([]); this.caricando.set(false);
        this.toast(err?.error?.msg ?? 'Impossibile caricare gli ordini', true);
      }
    });
  }

  /** La lista NON porta le voci: il dettaglio si chiede all'apertura. */
  apri(o: OrdineDTO): void {
    if (this.apertoId() === o.id) { this.apertoId.set(null); return; }
    this.apertoId.set(o.id);
    this.caricaDettaglio(o.id);
  }

  /** Estratto da apri(): cosi' dopo un'azione si RICARICA senza toggle. */
  private caricaDettaglio(id: number): void {
    this.dettaglio.set(null);
    this.timeline.set([]);
    this.mieRecensioni.set([]);
    this.ordineS.dettaglio(id).subscribe({
      next: d => this.dettaglio.set(d),
      error: () => {}
    });
    this.ordineS.timeline(id).subscribe({
      next: t => this.timeline.set(t),
      error: () => {}
    });
    const o = this.ordini().find(x => x.id === id);
    if (o && this.puoRecensire(o)) {
      this.recensioneS.mieByOrdine(id).subscribe({
        next: r => this.mieRecensioni.set(r),
        error: () => {}
      });
    }
  }

  esegui(o: OrdineDTO, a: Azione): void {
    if (a.richiedeNota) { this.apriReso(o); return; }
    if (a.conferma && !this.conferma(a.conferma)) return;
    this.inCorso.set(o.id);
    this.ordineS.transizione(o.id, a.path).subscribe({
      next: agg => {
        this.inCorso.set(null);
        this.aggiornaOrdine(agg);
      },
      error: err => {
        this.inCorso.set(null);
        this.toast(err?.error?.msg ?? 'Operazione non riuscita', true);
      }
    });
  }

  // ------------------------------------------------------------------
  // Dialog reso: motivazione obbligatoria (max 300 — V15)
  // ------------------------------------------------------------------

  private apriReso(o: OrdineDTO): void {
    this.resoPerOrdine.set(o);
    this.notaReso.set('');
    this.erroreReso.set(null);
    this.dialogReso().nativeElement.showModal();
  }

  chiudiReso(): void {
    this.dialogReso().nativeElement.close();
    // lo stato lo pulisce l'evento (close) del dialog, che copre anche ESC
  }

  aggiornaNota(event: Event): void {
    this.erroreReso.set(null);
    this.notaReso.set((event.target as HTMLTextAreaElement).value);
  }

  confermaReso(): void {
    const o = this.resoPerOrdine();
    const nota = this.notaReso().trim();
    if (!o || nota.length === 0) return;
    this.inCorso.set(o.id);
    this.erroreReso.set(null);
    this.ordineS.richiediReso(o.id, nota).subscribe({
      next: agg => {
        this.inCorso.set(null);
        this.chiudiReso();
        this.aggiornaOrdine(agg);
      },
      error: err => {
        this.inCorso.set(null);
        // il dialog RESTA aperto: l'utente non perde quello che ha scritto
        this.erroreReso.set(err?.error?.msg ?? 'Operazione non riuscita');
      }
    });
  }

  // ------------------------------------------------------------------
  // Dialog recensione: una per prodotto, moderazione preventiva
  // ------------------------------------------------------------------

  puoRecensire(o: OrdineDTO): boolean {
    return this.STATI_RECENSIBILI.includes(o.stato);
  }

  /** Prodotti DISTINTI dietro le voci del dettaglio aperto. */
  prodottiRecensibili(): { id: number; nome: string }[] {
    const d = this.dettaglio();
    if (!d?.voci) return [];
    const mappa = new Map<number, string>();
    for (const v of d.voci)
      if (v.prodottoId != null) mappa.set(v.prodottoId, v.prodottoNome ?? v.descrizione);
    return [...mappa.entries()].map(([id, nome]) => ({ id, nome }));
  }

  recensioneDi(prodottoId: number): RecensioneDTO | undefined {
    return this.mieRecensioni().find(r => r.prodottoId === prodottoId);
  }

  /** "Lascia una recensione" finche' resta qualcosa da recensire. */
  etichettaRecensione(): string {
    const prodotti = this.prodottiRecensibili();
    const recensiti = prodotti.filter(p => this.recensioneDi(p.id)).length;
    return prodotti.length > 0 && recensiti === prodotti.length
        ? 'Le tue recensioni' : 'Lascia una recensione';
  }

  apriRecensione(o: OrdineDTO): void {
    this.recensionePerOrdine.set(o);
    this.erroreRecensione.set(null);
    const prodotti = this.prodottiRecensibili();
    // un solo prodotto: dritti al form; piu' d'uno: prima le chip
    this.selezionaProdotto(prodotti.length === 1 ? prodotti[0].id : null);
    this.dialogRecensione().nativeElement.showModal();
  }

  chiudiRecensione(): void {
    this.dialogRecensione().nativeElement.close();
  }

  /** Cambio prodotto: il form si precompila se la recensione esiste. */
  selezionaProdotto(prodottoId: number | null): void {
    this.prodottoSel.set(prodottoId);
    this.erroreRecensione.set(null);
    const esistente = prodottoId != null ? this.recensioneDi(prodottoId) : undefined;
    this.votoSel.set(esistente?.voto ?? 0);
    this.titoloRec.set(esistente?.titolo ?? '');
    this.testoRec.set(esistente?.testo ?? '');
  }

  aggiornaTitolo(event: Event): void {
    this.titoloRec.set((event.target as HTMLInputElement).value);
  }

  aggiornaTesto(event: Event): void {
    this.erroreRecensione.set(null);
    this.testoRec.set((event.target as HTMLTextAreaElement).value);
  }

  confermaRecensione(): void {
    const o = this.recensionePerOrdine();
    const prodottoId = this.prodottoSel();
    if (!o || prodottoId == null || this.votoSel() === 0) return;
    this.inviandoRec.set(true);
    this.erroreRecensione.set(null);
    const req: RecensioneSaveReq = {
      prodottoId,
      ordineId: o.id,
      voto: this.votoSel(),
      titolo: this.titoloRec().trim() || null,
      testo: this.testoRec().trim() || null,
    };
    this.recensioneS.save(req).subscribe({
      next: r => {
        this.inviandoRec.set(false);
        // il DTO del save non porta prodottoId: lo aggiungiamo noi
        // per tenere coerente la cache locale (spunte e precompilazione)
        const salvata: RecensioneDTO = { ...r, prodottoId };
        this.mieRecensioni.update(l =>
            [...l.filter(x => x.prodottoId !== prodottoId), salvata]);
        this.chiudiRecensione();
        // MODERAZIONE PREVENTIVA: dirlo, o l'utente la cerchera' in pagina
        this.toast('Recensione inviata: sarà visibile dopo l\'approvazione.', false);
      },
      error: err => {
        this.inviandoRec.set(false);
        this.erroreRecensione.set(err?.error?.msg ?? 'Operazione non riuscita');
      }
    });
  }

  /** Sostituzione puntuale in lista + ricarica del pannello se aperto. */
  private aggiornaOrdine(agg: OrdineDTO): void {
    this.ordini.update(l => l.map(x => x.id === agg.id ? agg : x));
    if (this.apertoId() === agg.id) this.caricaDettaglio(agg.id);
    this.toast(`Ordine #${agg.id}: ${this.ETICHETTA_STATO[agg.stato] ?? agg.stato}.`, false);
  }

  private conferma(msg: string): boolean {
    return isPlatformBrowser(this.platformId) ? window.confirm(msg) : false;
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 3000);
  }

}