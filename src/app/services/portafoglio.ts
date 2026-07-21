import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PortafoglioDTO } from '../modelli/portafoglio-dto';

const BASE = environment.apiUrl;

/** Esito della ricarica (movimento). Serve solo a sapere che e' andata. */
export interface RicaricaEsito {
  id: number;
  stato: string;
  importo: number;
  commissione: number;
}

/**
 * Portafoglio — FASE C: id dal token. PAYPAL accredita SUBITO il netto
 * (movimento COMPLETATO); BONIFICO resta IN_ATTESA della conferma admin.
 * Per il self-service temporaneo si usa PAYPAL.
 */
@Injectable({ providedIn: 'root' })
export class Portafoglio {
  private http = inject(HttpClient);

  get(): Observable<PortafoglioDTO> {
    return this.http.get<PortafoglioDTO>(`${BASE}/portafoglio`);
  }

  ricarica(importo: number, metodo: string): Observable<RicaricaEsito> {
    return this.http.post<RicaricaEsito>(`${BASE}/portafoglio/ricarica`, { importo, metodo });
  }
}