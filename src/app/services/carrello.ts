import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CarrelloDTO } from '../modelli/carrello-dto';

const BASE = environment.apiUrl;

/**
 * Carrello — FASE C: l'utente NON viaggia piu' nell'URL, l'identita'
 * la mette il backend dal Bearer token (che l'interceptor allega da
 * solo). Ogni mutazione restituisce il carrello aggiornato: niente
 * GET di refresh, si aggiorna lo stato con cio' che torna.
 *
 * STATO CONDIVISO (signal, stesso pattern del saldo portafoglio):
 * carrelloCorrente e' l'unica fonte per chiunque lo mostri — il badge
 * in topbar, il negozio, il dettaglio prodotto, il checkout. Il tap
 * su ogni operazione lo aggiorna da solo: aggiungi da QUALSIASI
 * pagina e il badge si muove in tempo reale, senza cablare nulla.
 */
@Injectable({ providedIn: 'root' })
export class Carrello {
  private http = inject(HttpClient);

  /** Il carrello dell'utente loggato; null = non caricato / ospite. */
  carrelloCorrente = signal<CarrelloDTO | null>(null);

  /** Rilegge dal server (login, hydration). */
  refresh(): void {
    this.get().subscribe({ error: () => this.carrelloCorrente.set(null) });
  }

  /** Al logout: un carrello fantasma non deve sopravvivere. */
  azzera(): void {
    this.carrelloCorrente.set(null);
  }

  /** GET /api/carrello — il MIO carrello. */
  get(): Observable<CarrelloDTO> {
    return this.http.get<CarrelloDTO>(`${BASE}/carrello`)
      .pipe(tap(c => this.carrelloCorrente.set(c)));
  }

  /** Il backend INCREMENTA se la variante e' gia' in carrello. */
  addVoce(skuId: number, quantita: number): Observable<CarrelloDTO> {
    return this.http.post<CarrelloDTO>(`${BASE}/carrello/voci`, { skuId, quantita })
      .pipe(tap(c => this.carrelloCorrente.set(c)));
  }

  /** Imposta la quantita' ASSOLUTA di una voce (per skuId). */
  updateVoce(skuId: number, quantita: number): Observable<CarrelloDTO> {
    return this.http.put<CarrelloDTO>(`${BASE}/carrello/voci`, { skuId, quantita })
      .pipe(tap(c => this.carrelloCorrente.set(c)));
  }

  removeVoce(voceId: number): Observable<CarrelloDTO> {
    return this.http.delete<CarrelloDTO>(`${BASE}/carrello/voci/${voceId}`)
      .pipe(tap(c => this.carrelloCorrente.set(c)));
  }

  svuota(): Observable<void> {
    // Il DELETE non restituisce il carrello: dopo, un refresh esplicito
    return this.http.delete<void>(`${BASE}/carrello`)
      .pipe(tap(() => this.refresh()));
  }
}