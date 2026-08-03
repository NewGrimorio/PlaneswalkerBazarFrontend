import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RecensioneDTO, RecensioneStatisticheDTO } from '../modelli/recensione-dto';

const BASE = environment.apiUrl;

/** Il body del POST: l'autore lo mette il token (FASE C), qui non c'e'. */
export interface RecensioneSaveReq {
  prodottoId: number;
  ordineId: number;
  voto: number;
  titolo: string | null;
  testo: string | null;
}

/**
 * Recensioni dell'utente autenticato. MODERAZIONE PREVENTIVA (V15):
 * il salvataggio — creazione O modifica — torna sempre IN_ATTESA,
 * quindi la UI deve dire "sara' visibile dopo l'approvazione".
 * Le letture pubbliche (pagina prodotto) vivono su /api/public:
 * niente token, indicizzabili, e nel payload arrivano SOLO le
 * APPROVATE con autore gia' anonimizzato dal server.
 */
@Injectable({ providedIn: 'root' })
export class Recensione {
  private http = inject(HttpClient);

  /** Crea o AGGIORNA (upsert una-per-prodotto lato server). */
  save(req: RecensioneSaveReq): Observable<RecensioneDTO> {
    return this.http.post<RecensioneDTO>(`${BASE}/recensioni`, req);
  }

  /** TUTTE le mie recensioni, dalla piu' aggiornata (con prodottoNome e ordineId). */
  mie(): Observable<RecensioneDTO[]> {
    return this.http.get<RecensioneDTO[]>(`${BASE}/recensioni/mie`);
  }

  /** Le MIE recensioni sui prodotti di un MIO ordine (con prodottoId). */
  mieByOrdine(ordineId: number): Observable<RecensioneDTO[]> {
    return this.http.get<RecensioneDTO[]>(`${BASE}/recensioni/ordine/${ordineId}`);
  }

  // ---------------- Letture pubbliche (pagina prodotto) ----------------

  /** Le recensioni APPROVATE di un prodotto, per la pagina pubblica. */
  pubblicheByProdotto(prodottoId: number): Observable<RecensioneDTO[]> {
    return this.http.get<RecensioneDTO[]>(`${BASE}/public/recensioni/prodotto/${prodottoId}`);
  }

  /** Media e conteggio per la testata della sezione. */
  statisticheByProdotto(prodottoId: number): Observable<RecensioneStatisticheDTO> {
    return this.http.get<RecensioneStatisticheDTO>(`${BASE}/public/recensioni/prodotto/${prodottoId}/statistiche`);
  }
}