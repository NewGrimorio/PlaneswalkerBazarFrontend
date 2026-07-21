import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CarrelloDTO } from '../modelli/carrello-dto';

const BASE = environment.apiUrl;

/**
 * Carrello — FASE C: l'utente NON viaggia piu' nell'URL, l'identita'
 * la mette il backend dal Bearer token (che l'interceptor allega da
 * solo). Ogni mutazione restituisce il carrello aggiornato: niente
 * GET di refresh, si aggiorna lo stato con cio' che torna.
 */
@Injectable({ providedIn: 'root' })
export class Carrello {
  private http = inject(HttpClient);

  /** GET /api/carrello — il MIO carrello. */
  get(): Observable<CarrelloDTO> {
    return this.http.get<CarrelloDTO>(`${BASE}/carrello`);
  }

  addVoce(skuId: number, quantita: number): Observable<CarrelloDTO> {
    return this.http.post<CarrelloDTO>(`${BASE}/carrello/voci`, { skuId, quantita });
  }

  /** Imposta la quantita' ASSOLUTA di una voce (per skuId). */
  updateVoce(skuId: number, quantita: number): Observable<CarrelloDTO> {
    return this.http.put<CarrelloDTO>(`${BASE}/carrello/voci`, { skuId, quantita });
  }

  removeVoce(voceId: number): Observable<CarrelloDTO> {
    return this.http.delete<CarrelloDTO>(`${BASE}/carrello/voci/${voceId}`);
  }

  svuota(): Observable<void> {
    return this.http.delete<void>(`${BASE}/carrello`);
  }
}