import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrdineDTO } from '../modelli/ordine-dto';

const BASE = environment.apiUrl;

/**
 * Ordini del cliente — FASE C: l'utente e' nel token. Il checkout
 * consuma il carrello, paga dal portafoglio e crea l'ordine CREATO;
 * gli servono solo l'indirizzo di spedizione (l'id nel body).
 */
@Injectable({ providedIn: 'root' })
export class Ordine {
  private http = inject(HttpClient);

  checkout(indirizzoId: number): Observable<OrdineDTO> {
    return this.http.post<OrdineDTO>(`${BASE}/ordini/checkout`, { indirizzoId });
  }

  list(): Observable<OrdineDTO[]> {
    return this.http.get<OrdineDTO[]>(`${BASE}/ordini`);
  }
}