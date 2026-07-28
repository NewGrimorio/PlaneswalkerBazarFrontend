import { Component, ElementRef, computed, inject, signal, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Conto } from '../../../services/conto';
import { ContoBancarioDTO } from '../../../modelli/conto-bancario-dto';

type Toast = { testo: string; errore: boolean } | null;

/** Stesso pattern della Req backend: 2 lettere, 2 cifre, poi 10-30 alfanumerici. */
const IBAN_RE = /^[A-Za-z]{2}[0-9]{2}[A-Za-z0-9]{10,30}$/;
const BIC_RE = /^[A-Za-z0-9]{8,11}$/;

/**
 * "Conti bancari": i conti su cui l'utente puo' farsi ritirare il
 * credito. Tre operazioni, non quattro — la MODIFICA non esiste di
 * proposito: i prelievi gia' eseguiti referenziano il conto usato e
 * devono continuare a dire la verita' (regola del ledger). Un IBAN
 * sbagliato si rimuove e se ne aggiunge uno nuovo, e la pagina lo
 * spiega invece di lasciar cercare un bottone che non c'e'.
 *
 * L'IBAN completo non torna MAI dal server: in lista si vede solo
 * mascherato ("IT60 **** 3456").
 */
@Component({
  selector: 'app-conti-cliente',
  imports: [MatIconModule, RouterLink],
  templateUrl: './conti.html',
  styleUrl: './conti.css',
})
export class ContiCliente {
  private contoS = inject(Conto);
  private platformId = inject(PLATFORM_ID);

  private dialogRimozione = viewChild.required<ElementRef<HTMLDialogElement>>('dialogRimozione');

  conti = signal<ContoBancarioDTO[]>([]);
  caricando = signal(true);
  inCorso = signal(false);
  messaggio = signal<Toast>(null);

  // --- Form nuovo conto ---
  formAperto = signal(false);
  intestatario = signal('');
  iban = signal('');
  bic = signal('');
  erroreForm = signal<string | null>(null);

  /** Spazi tollerati: l'IBAN si incolla com'e' scritto sull'home banking. */
  ibanPulito = computed(() => this.iban().replace(/\s/g, '').toUpperCase());
  bicPulito = computed(() => this.bic().replace(/\s/g, '').toUpperCase());

  ibanValido = computed(() => IBAN_RE.test(this.ibanPulito()));
  bicValido = computed(() => this.bicPulito() === '' || BIC_RE.test(this.bicPulito()));

  formValido = computed(() =>
      this.intestatario().trim().length > 0 && this.ibanValido() && this.bicValido());

  // --- Rimozione ---
  contoDaRimuovere = signal<ContoBancarioDTO | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.carica();
    else this.caricando.set(false);
  }

  private carica(): void {
    this.caricando.set(true);
    this.contoS.list().subscribe({
      next: c => { this.conti.set(c); this.caricando.set(false); },
      error: err => {
        this.conti.set([]); this.caricando.set(false);
        this.toast(err?.error?.msg ?? 'Impossibile caricare i conti', true);
      }
    });
  }

  // ------------------------------------------------------------------
  // Nuovo conto
  // ------------------------------------------------------------------

  apriForm(): void {
    this.intestatario.set('');
    this.iban.set('');
    this.bic.set('');
    this.erroreForm.set(null);
    this.formAperto.set(true);
  }

  chiudiForm(): void {
    this.formAperto.set(false);
    this.erroreForm.set(null);
  }

  aggiornaIntestatario(e: Event): void {
    this.intestatario.set((e.target as HTMLInputElement).value);
  }

  aggiornaIban(e: Event): void {
    this.erroreForm.set(null);
    this.iban.set((e.target as HTMLInputElement).value);
  }

  aggiornaBic(e: Event): void {
    this.bic.set((e.target as HTMLInputElement).value);
  }

  salva(): void {
    if (!this.formValido() || this.inCorso()) return;
    this.inCorso.set(true);
    this.erroreForm.set(null);
    this.contoS.create({
      intestatario: this.intestatario().trim(),
      iban: this.ibanPulito(),
      bic: this.bicPulito() || null,
    }).subscribe({
      next: () => {
        this.inCorso.set(false);
        this.formAperto.set(false);
        this.carica();
        this.toast('Conto aggiunto.', false);
      },
      error: err => {
        this.inCorso.set(false);
        this.erroreForm.set(err?.error?.msg ?? 'Salvataggio non riuscito');
      }
    });
  }

  // ------------------------------------------------------------------
  // Rimozione (soft delete: i prelievi passati restano intatti)
  // ------------------------------------------------------------------

  chiediRimozione(c: ContoBancarioDTO): void {
    this.contoDaRimuovere.set(c);
    this.dialogRimozione().nativeElement.showModal();
  }

  chiudiRimozione(): void {
    this.dialogRimozione().nativeElement.close();
  }

  confermaRimozione(): void {
    const c = this.contoDaRimuovere();
    if (!c || this.inCorso()) return;
    this.inCorso.set(true);
    this.contoS.remove(c.id).subscribe({
      next: () => {
        this.inCorso.set(false);
        this.chiudiRimozione();
        this.carica();
        this.toast('Conto rimosso.', false);
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