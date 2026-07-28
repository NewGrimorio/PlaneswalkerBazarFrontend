import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrdineDTO } from '../modelli/ordine-dto';
import { StoricoStatoOrdineDTO } from '../modelli/storico-stato-ordine-dto';

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

  /**
   * Transizioni cliente SENZA body: annulla, conferma-consegna,
   * segnala-non-consegnato. Path kebab-case, identita' dal token.
   * Il reso NON passa da qui: ha un body con la motivazione.
   */
  transizione(id: number, azione: string): Observable<OrdineDTO> {
    return this.http.post<OrdineDTO>(`${BASE}/ordini/${id}/${azione}`, null);
  }

  /**
   * CONSEGNATO -> RESO_RICHIESTO. La motivazione e' OBBLIGATORIA
   * (max 300 caratteri): il backend la valida e la salva nella nota
   * della transizione — il cliente la ritrova nella timeline,
   * l'admin nella coda dei resi.
   */
  richiediReso(id: number, nota: string): Observable<OrdineDTO> {
    return this.http.post<OrdineDTO>(`${BASE}/ordini/${id}/richiedi-reso`, { nota });
  }
}