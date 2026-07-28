import { Component, ElementRef, computed, inject, signal, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Recensione, RecensioneSaveReq } from '../../../services/recensione';
import { RecensioneDTO } from '../../../modelli/recensione-dto';

type Toast = { testo: string; errore: boolean } | null;

/**
 * "Le mie recensioni": tutte quelle scritte dall'utente, con lo stato
 * di moderazione ben visibile — e' l'informazione che qui manca
 * altrove (nella pagina prodotto una recensione IN_ATTESA e' invisibile
 * e l'autore non capirebbe perche').
 *
 * La MODIFICA riusa lo stesso <dialog> del dettaglio ordine e lo stesso
 * POST (upsert una-per-prodotto): serve l'ordineId che il DTO porta
 * apposta nella vista arricchita. Ogni modifica torna IN_ATTESA — la
 * pagina lo dice prima, non dopo.
 *
 * Niente cancellazione: il backend non la espone di proposito. Per far
 * sparire una recensione dal pubblico c'e' la moderazione admin.
 */
@Component({
  selector: 'app-recensioni-cliente',
  imports: [DatePipe, MatIconModule, RouterLink],
  templateUrl: './recensioni.html',
  styleUrl: './recensioni.css',
})
export class RecensioniCliente {
  private recensioneS = inject(Recensione);
  private platformId = inject(PLATFORM_ID);

  private dialogModifica = viewChild.required<ElementRef<HTMLDialogElement>>('dialogModifica');

  recensioni = signal<RecensioneDTO[]>([]);
  caricando = signal(true);
  inCorso = signal(false);
  messaggio = signal<Toast>(null);

  // --- Dialog di modifica ---
  inModifica = signal<RecensioneDTO | null>(null);
  votoSel = signal(0);
  titolo = signal('');
  testo = signal('');
  erroreDialog = signal<string | null>(null);

  /** Quante aspettano il via libera: si dice in cima, senza allarmismi. */
  inAttesa = computed(() => this.recensioni().filter(r => r.stato === 'IN_ATTESA').length);

  readonly ETICHETTA_STATO: Record<string, string> = {
    IN_ATTESA: 'In attesa di approvazione',
    APPROVATA: 'Pubblicata',
    RIFIUTATA: 'Non pubblicata',
  };

  readonly SPIEGA_STATO: Record<string, string> = {
    IN_ATTESA: 'Sarà visibile sulla pagina del prodotto dopo il controllo.',
    APPROVATA: 'Chiunque può leggerla sulla pagina del prodotto.',
    RIFIUTATA: 'Non è visibile pubblicamente. Puoi modificarla e riproporla.',
  };

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.carica();
    else this.caricando.set(false);
  }

  private carica(): void {
    this.caricando.set(true);
    this.recensioneS.mie().subscribe({
      next: l => { this.recensioni.set(l); this.caricando.set(false); },
      error: err => {
        this.recensioni.set([]); this.caricando.set(false);
        this.toast(err?.error?.msg ?? 'Impossibile caricare le recensioni', true);
      }
    });
  }

  stelle(voto: number): boolean[] {
    return [1, 2, 3, 4, 5].map(n => n <= voto);
  }

  // ------------------------------------------------------------------
  // Modifica (stesso POST del dettaglio ordine: upsert)
  // ------------------------------------------------------------------

  /** Senza ordineId non si puo' salvare: il diritto va giustificato. */
  modificabile(r: RecensioneDTO): boolean {
    return r.ordineId != null && r.prodottoId != null;
  }

  apriModifica(r: RecensioneDTO): void {
    if (!this.modificabile(r)) return;
    this.inModifica.set(r);
    this.votoSel.set(r.voto);
    this.titolo.set(r.titolo ?? '');
    this.testo.set(r.testo ?? '');
    this.erroreDialog.set(null);
    this.dialogModifica().nativeElement.showModal();
  }

  chiudiModifica(): void {
    this.dialogModifica().nativeElement.close();
  }

  aggiornaTitolo(e: Event): void {
    this.titolo.set((e.target as HTMLInputElement).value);
  }

  aggiornaTesto(e: Event): void {
    this.erroreDialog.set(null);
    this.testo.set((e.target as HTMLTextAreaElement).value);
  }

  salva(): void {
    const r = this.inModifica();
    if (!r || this.votoSel() === 0 || this.inCorso()) return;
    this.inCorso.set(true);
    this.erroreDialog.set(null);
    const req: RecensioneSaveReq = {
      prodottoId: r.prodottoId!,
      ordineId: r.ordineId!,
      voto: this.votoSel(),
      titolo: this.titolo().trim() || null,
      testo: this.testo().trim() || null,
    };
    this.recensioneS.save(req).subscribe({
      next: () => {
        this.inCorso.set(false);
        this.chiudiModifica();
        this.carica();
        this.toast('Recensione aggiornata: tornerà visibile dopo l\'approvazione.', false);
      },
      error: err => {
        this.inCorso.set(false);
        // il dialog RESTA aperto: niente testo perso
        this.erroreDialog.set(err?.error?.msg ?? 'Salvataggio non riuscito');
      }
    });
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 3600);
  }
}