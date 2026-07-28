import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ContoBancarioDTO } from '../modelli/conto-bancario-dto';

const BASE = environment.apiUrl;

/** Il body del POST: l'utente lo mette il token (FASE C). */
export interface ContoSaveReq {
  intestatario: string;
  iban: string;
  bic: string | null;
}

/**
 * Conti bancari per il ritiro credito — FASE C: id dal token.
 * Solo lista, creazione e rimozione (soft delete): l'update non
 * esiste di proposito, il ledger referenzia il conto usato.
 */
@Injectable({ providedIn: 'root' })
export class Conto {
  private http = inject(HttpClient);

  /** I conti ATTIVI, con IBAN gia' mascherato dal server. */
  list(): Observable<ContoBancarioDTO[]> {
    return this.http.get<ContoBancarioDTO[]>(`${BASE}/conti`);
  }

  /** L'IBAN puo' arrivare con spazi: normalizza il backend. */
  create(req: ContoSaveReq): Observable<ContoBancarioDTO> {
    return this.http.post<ContoBancarioDTO>(`${BASE}/conti`, req);
  }

  /** Soft delete con ownership check lato service. */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/conti/${id}`);
  }
}