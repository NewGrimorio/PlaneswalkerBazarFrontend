import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { UtenteDTO } from '../modelli/utente-dto';
import { LoginDTO } from '../modelli/login-dto';
import { environment } from '../../environments/environment';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class Utente {
  private http = inject(HttpClient);

  /**
   * Fase B: il backend risponde LoginDTO (accessToken + utente) e
   * imposta il refresh token in un cookie HttpOnly — da qui il
   * withCredentials, senza il quale il browser scarta il cookie.
   * Per ora esponiamo solo l'utente (contratto invariato verso i
   * componenti); l'adozione dell'accessToken arriva col prossimo
   * blocco (AuthServices + interceptor).
   */
  loginUtente(identificativo: string, password: string): Observable<UtenteDTO> {
    return this.http.post<LoginDTO>(`${BASE}/auth/login`,
        { identificativo, password }, { withCredentials: true })
      .pipe(map(r => r.utente));
  }

  registraUtente(dati: {
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    dataNascita: string;
    codiceFiscale: string;
    password: string;
  }): Observable<UtenteDTO> {
    return this.http.post<UtenteDTO>(`${BASE}/auth/registrazione`, dati);
  }

  getById(id: number): Observable<UtenteDTO> {
    return this.http.get<UtenteDTO>(`${BASE}/utenti/${id}`);
  }

  updateProfilo(dati: {
    id: number; nome: string; cognome: string; username: string;
    telefono: string | null; dataNascita: string | null; codiceFiscale: string | null;
  }): Observable<UtenteDTO> {
    return this.http.put<UtenteDTO>(`${BASE}/utenti/profilo`, dati);
  }

  changeEmail(utenteId: number, nuovaEmail: string, password: string): Observable<UtenteDTO> {
    return this.http.put<UtenteDTO>(`${BASE}/utenti/email`,
      { utenteId, nuovaEmail, password });
  }

  changePassword(utenteId: number, vecchiaPassword: string, nuovaPassword: string): Observable<UtenteDTO> {
    return this.http.put<UtenteDTO>(`${BASE}/utenti/password`,
      { utenteId, vecchiaPassword, nuovaPassword });
  }

}