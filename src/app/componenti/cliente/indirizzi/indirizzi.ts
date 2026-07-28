import { Component, ElementRef, computed, inject, signal, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Indirizzo } from '../../../services/indirizzo';
import { IndirizzoDTO } from '../../../modelli/indirizzo-dto';

type Toast = { testo: string; errore: boolean } | null;

/**
 * Rubrica indirizzi del cliente.
 *
 * Il PREDEFINITO non e' un flag dell'indirizzo ma la FK
 * utente.indirizzo_predefinito_id: strutturalmente "al massimo uno".
 * Di conseguenza qui non si TOGLIE il predefinito — se ne promuove
 * un altro — e la UI non offre un'azione che il backend rifiuterebbe.
 *
 * Il form e' lo stesso per creazione e modifica (id null = nuovo):
 * i campi sono identici, cambia solo il verbo. La rimozione e' soft
 * delete lato server, e se cade sul predefinito il backend azzera
 * prima la FK — quindi dopo puoi restare senza predefinito: la UI
 * lo segnala invece di far finta di niente.
 */
@Component({
  selector: 'app-indirizzi-cliente',
  imports: [MatIconModule, RouterLink],
  templateUrl: './indirizzi.html',
  styleUrl: './indirizzi.css',
})
export class IndirizziCliente {
  private indirizzoS = inject(Indirizzo);
  private platformId = inject(PLATFORM_ID);

  private dialogRimozione = viewChild.required<ElementRef<HTMLDialogElement>>('dialogRimozione');

  indirizzi = signal<IndirizzoDTO[]>([]);
  caricando = signal(true);
  inCorso = signal(false);
  messaggio = signal<Toast>(null);

  /** null = form chiuso; 0 = nuovo indirizzo; id = modifica. */
  formId = signal<number | null>(null);
  erroreForm = signal<string | null>(null);

  etichetta = signal('');
  destinatario = signal('');
  via = signal('');
  civico = signal('');
  cap = signal('');
  citta = signal('');
  provincia = signal('');
  nazione = signal('IT');

  indirizzoDaRimuovere = signal<IndirizzoDTO | null>(null);

  /** Speculare a IndirizzoReq: CAP 5 cifre, provincia 2 lettere. */
  capValido = computed(() => /^[0-9]{5}$/.test(this.cap().trim()));
  provinciaValida = computed(() => {
    const p = this.provincia().trim();
    return p === '' || /^[A-Za-z]{2}$/.test(p);
  });
  formValido = computed(() =>
      this.destinatario().trim() !== ''
      && this.via().trim() !== ''
      && this.civico().trim() !== ''
      && this.capValido()
      && this.citta().trim() !== ''
      && this.provinciaValida());

  /** Nessun predefinito: succede dopo aver rimosso quello attivo. */
  senzaPredefinito = computed(() =>
      this.indirizzi().length > 0 && !this.indirizzi().some(i => i.predefinito));

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.carica();
    else this.caricando.set(false);
  }

  private carica(): void {
    this.caricando.set(true);
    this.indirizzoS.list().subscribe({
      next: l => { this.indirizzi.set(l); this.caricando.set(false); },
      error: err => {
        this.indirizzi.set([]); this.caricando.set(false);
        this.toast(err?.error?.msg ?? 'Impossibile caricare gli indirizzi', true);
      }
    });
  }

  // ------------------------------------------------------------------
  // Form (creazione e modifica: stessi campi, cambia solo il verbo)
  // ------------------------------------------------------------------

  nuovo(): void {
    this.etichetta.set('');
    this.destinatario.set('');
    this.via.set('');
    this.civico.set('');
    this.cap.set('');
    this.citta.set('');
    this.provincia.set('');
    this.nazione.set('IT');
    this.erroreForm.set(null);
    this.formId.set(0);
  }

  modifica(i: IndirizzoDTO): void {
    this.etichetta.set(i.etichetta ?? '');
    this.destinatario.set(i.destinatario);
    this.via.set(i.via);
    this.civico.set(i.civico);
    this.cap.set(i.cap);
    this.citta.set(i.citta);
    this.provincia.set(i.provincia ?? '');
    this.nazione.set(i.nazione ?? 'IT');
    this.erroreForm.set(null);
    this.formId.set(i.id);
  }

  chiudiForm(): void {
    this.formId.set(null);
    this.erroreForm.set(null);
  }

  agg(s: ReturnType<typeof signal<string>>, e: Event): void {
    this.erroreForm.set(null);
    s.set((e.target as HTMLInputElement).value);
  }

  salva(): void {
    const id = this.formId();
    if (id === null || !this.formValido() || this.inCorso()) return;
    this.inCorso.set(true);
    this.erroreForm.set(null);

    const corpo = {
      etichetta: this.etichetta().trim() || null,
      destinatario: this.destinatario().trim(),
      via: this.via().trim(),
      civico: this.civico().trim(),
      cap: this.cap().trim(),
      citta: this.citta().trim(),
      provincia: this.provincia().trim().toUpperCase() || null,
      nazione: this.nazione().trim().toUpperCase() || null,
    };

    const chiamata = id === 0
        ? this.indirizzoS.create(corpo)
        : this.indirizzoS.update({ ...corpo, id });

    chiamata.subscribe({
      next: () => {
        this.inCorso.set(false);
        this.formId.set(null);
        this.carica();
        this.toast(id === 0 ? 'Indirizzo aggiunto.' : 'Indirizzo aggiornato.', false);
      },
      error: err => {
        this.inCorso.set(false);
        this.erroreForm.set(err?.error?.msg ?? 'Salvataggio non riuscito');
      }
    });
  }

  // ------------------------------------------------------------------
  // Predefinito e rimozione
  // ------------------------------------------------------------------

  setPredefinito(i: IndirizzoDTO): void {
    if (i.predefinito || this.inCorso()) return;
    this.inCorso.set(true);
    this.indirizzoS.setPredefinito(i.id).subscribe({
      next: () => {
        this.inCorso.set(false);
        this.carica();
        this.toast('Indirizzo predefinito aggiornato.', false);
      },
      error: err => {
        this.inCorso.set(false);
        this.toast(err?.error?.msg ?? 'Operazione non riuscita', true);
      }
    });
  }

  chiediRimozione(i: IndirizzoDTO): void {
    this.indirizzoDaRimuovere.set(i);
    this.dialogRimozione().nativeElement.showModal();
  }

  chiudiRimozione(): void {
    this.dialogRimozione().nativeElement.close();
  }

  confermaRimozione(): void {
    const i = this.indirizzoDaRimuovere();
    if (!i || this.inCorso()) return;
    this.inCorso.set(true);
    this.indirizzoS.remove(i.id).subscribe({
      next: () => {
        this.inCorso.set(false);
        this.chiudiRimozione();
        this.carica();
        this.toast('Indirizzo rimosso.', false);
      },
      error: err => {
        this.inCorso.set(false);
        this.chiudiRimozione();
        this.toast(err?.error?.msg ?? 'Rimozione non riuscita', true);
      }
    });
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 3000);
  }
}