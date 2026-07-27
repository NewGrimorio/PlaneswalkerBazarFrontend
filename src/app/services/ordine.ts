import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrdineDTO } from '../modelli/ordine-dto';
import {StoricoStatoOrdineDTO} from '../modelli/storico-stato-ordine-dto';

const BASE = environment.apiUrl;

/**
 * Ordini del cliente — FASE C: l'utente e' nel token. Il checkout
 * consuma il carrello, paga dal portafoglio e crea l'ordine CREATO;
 * gli servono solo l'indirizzo di spedizione (l'id nel body).
 */
@Injectable({ providedIn: 'root' })
export class Ordine {
  private http = inject(HttpClient);

  /** Il tipoSpedizione e' una PREFERENZA: il server ricalcola sempre
   *  (sopra soglia diventa express offerta, qualunque cosa mandiamo). */
  checkout(indirizzoId: number, tipoSpedizione: string): Observable<OrdineDTO> {
    return this.http.post<OrdineDTO>(`${BASE}/ordini/checkout`,
        { indirizzoId, tipoSpedizione });
  }


  /** Lista dei miei ordini, dal piu' recente (senza voci). */
  list(): Observable<OrdineDTO[]> {
    return this.http.get<OrdineDTO[]>(`${BASE}/ordini`);
  }

  /** Dettaglio con le voci (ownership check nel service backend). */
  dettaglio(id: number): Observable<OrdineDTO> {
    return this.http.get<OrdineDTO>(`${BASE}/ordini/${id}`);
  }

  timeline(id: number): Observable<StoricoStatoOrdineDTO[]> {
    return this.http.get<StoricoStatoOrdineDTO[]>(`${BASE}/ordini/${id}/timeline`);
  }

  /** Transizioni cliente: path kebab-case, identita' dal token. */
  transizione(id: number, azione: string): Observable<OrdineDTO> {
    return this.http.post<OrdineDTO>(`${BASE}/ordini/${id}/${azione}`, null);
  }

}