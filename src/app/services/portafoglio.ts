import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PortafoglioDTO } from '../modelli/portafoglio-dto';
import { MovimentoDTO } from '../modelli/movimento-dto';

const BASE = environment.apiUrl;

/** Esito della ricarica (movimento). Serve solo a sapere che e' andata. */
export interface RicaricaEsito {
  id: number;
  stato: string;
  importo: number;
  commissione: number;
}

/**
 * Portafoglio — FASE C: id dal token.
 *
 * TRE comportamenti diversi, tutti decisi dal SERVER:
 *  - ricarica PAYPAL   -> accredito immediato del NETTO (commissione
 *                         5% + 0,35 calcolata dal backend), COMPLETATO
 *  - ricarica BONIFICO -> movimento IN_ATTESA: il saldo si muove solo
 *                         alla conferma admin
 *  - prelievo          -> decurtazione IMMEDIATA + movimento IN_ATTESA
 *                         (cosi' un doppio click non preleva due volte);
 *                         se l'admin rifiuta, l'importo torna indietro
 */
@Injectable({ providedIn: 'root' })
export class Portafoglio {
  private http = inject(HttpClient);

  /**
   * SALDO CONDIVISO (signal): un'unica fonte per chiunque lo mostri —
   * il chip in topbar, l'hub account, domani altro. Chi muove denaro
   * (ricarica, prelievo, checkout) chiama refreshSaldo() e tutti i
   * lettori si aggiornano da soli. null = non caricato / non loggato.
   */
  saldoCorrente = signal<number | null>(null);

  /** Rilegge il saldo dal server e aggiorna il signal condiviso. */
  refreshSaldo(): void {
    this.get().subscribe({
      next: p => this.saldoCorrente.set(p.saldo),
      error: () => this.saldoCorrente.set(null)   // sessione assente/scaduta
    });
  }

  /** Da chiamare al logout: un saldo fantasma non deve sopravvivere. */
  azzeraSaldo(): void {
    this.saldoCorrente.set(null);
  }

  get(): Observable<PortafoglioDTO> {
    return this.http.get<PortafoglioDTO>(`${BASE}/portafoglio`);
  }

  ricarica(importo: number, metodo: string): Observable<RicaricaEsito> {
    return this.http.post<RicaricaEsito>(`${BASE}/portafoglio/ricarica`, { importo, metodo });
  }

  /** Ritiro credito sul proprio conto (ownership verificata lato server). */
  preleva(importo: number, contoBancarioId: number): Observable<MovimentoDTO> {
    return this.http.post<MovimentoDTO>(`${BASE}/portafoglio/prelievo`,
        { importo, contoBancarioId });
  }

  /** Il ledger dell'utente, dal movimento piu' recente. */
  storico(): Observable<MovimentoDTO[]> {
    return this.http.get<MovimentoDTO[]>(`${BASE}/portafoglio/storico`);
  }
}