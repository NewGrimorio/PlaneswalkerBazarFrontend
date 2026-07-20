import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { UtenteDTO } from '../modelli/utente-dto';
import { LoginDTO } from '../modelli/login-dto';
import { AuthServices } from '../auth/auth-services';
import { environment } from '../../environments/environment';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class Utente {
  private http = inject(HttpClient);
  private authS = inject(AuthServices);

  loginUtente(identificativo: string, password: string): Observable<UtenteDTO> {
    return this.http.post<LoginDTO>(`${BASE}/auth/login`,
        { identificativo, password }, { withCredentials: true })
      .pipe(
        tap(r => this.authS.sessione(r)),
        map(r => r.utente)
      );
  }

  refresh(): Observable<LoginDTO> {
    return this.http.post<LoginDTO>(`${BASE}/auth/refresh`,
        {}, { withCredentials: true })
      .pipe(tap(r => this.authS.sessione(r)));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${BASE}/auth/logout`,
        {}, { withCredentials: true });
  }

  registraUtente(dati: {
    email: string;
    username: string;
    password: string;
    nome: string;
    cognome: string;
    telefono: string | null;
    dataNascita: string | null;
    codiceFiscale: string | null;
  }): Observable<UtenteDTO> {
    return this.http.post<UtenteDTO>(`${BASE}/auth/registrazione`, dati);
  }

  /**
   * FASE C: "chi sono" lo dice il token, non un id nell'URL.
   * Sostituisce il vecchio getById(id), che non esiste piu'.
   */
  me(): Observable<UtenteDTO> {
    return this.http.get<UtenteDTO>(`${BASE}/auth/me`);
  }

  /** FASE C: niente id nel body — lo mette il backend dal token. */
  updateProfilo(dati: {
    nome: string; cognome: string; username: string;
    telefono: string | null; dataNascita: string | null; codiceFiscale: string | null;
  }): Observable<UtenteDTO> {
    return this.http.put<UtenteDTO>(`${BASE}/utenti/profilo`, dati);
  }

  changeEmail(nuovaEmail: string, password: string): Observable<UtenteDTO> {
    return this.http.put<UtenteDTO>(`${BASE}/utenti/email`,
      { nuovaEmail, password });
  }

  changePassword(vecchiaPassword: string, nuovaPassword: string): Observable<UtenteDTO> {
    return this.http.put<UtenteDTO>(`${BASE}/utenti/password`,
      { vecchiaPassword, nuovaPassword });
  }

  /** FASE C: immagine profilo self-scoped — niente id nel path. */
  uploadImmagineProfilo(form: FormData): Observable<UtenteDTO> {
    return this.http.post<UtenteDTO>(`${BASE}/utenti/immagine-profilo`, form);
  }

  removeImmagineProfilo(): Observable<UtenteDTO> {
    return this.http.delete<UtenteDTO>(`${BASE}/utenti/immagine-profilo`);
  }

}