import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthServices } from '../auth/auth-services';
import { Utente } from '../services/utente';
import { LoginDTO } from '../modelli/login-dto';

/**
 * Una sola rotazione condivisa alla volta: se tre chiamate ricevono
 * 401 nello stesso istante (access scaduto), UNA fa il refresh e
 * tutte e tre riprovano col token nuovo. shareReplay(1) e' cio' che
 * le fa accodare alla stessa richiesta invece di farne tre.
 */
let refreshInCorso$: Observable<LoginDTO> | null = null;

/**
 * /api/auth NON e' tutto uguale — lezione imparata a caro prezzo:
 * questi QUATTRO endpoint sono pubblici (si autenticano con
 * credenziali o cookie, mai col Bearer) e un loro 401 e' una risposta
 * DEFINITIVA, non un token da rinnovare. Tutto il resto — /me
 * compreso — e' protetto come qualunque altro endpoint: Bearer si',
 * e retry con refresh su un 401 inatteso.
 * (La versione precedente escludeva TUTTO /api/auth/: /me partiva
 *  senza Authorization e rispondeva 401 sempre.)
 */
const AUTH_PUBBLICI = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/registrazione',
  '/api/auth/logout',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // SSR: il server NON ha sessione (niente cookie, niente token) e non
  // deve fingerla — soprattutto niente retry con refresh, che sul
  // server falliva sempre e affogava il processo in uncaughtException.
  // In piu' refreshInCorso$ e' stato di modulo: sul server sarebbe
  // CONDIVISO tra richieste di utenti diversi. Qui: puro passacarte.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return next(req);

  const authS = inject(AuthServices);
  const utenteS = inject(Utente);
  const router = inject(Router);

  // Si toccano SOLO le chiamate verso il nostro backend
  if (!req.url.startsWith(environment.serverUrl)) return next(req);

  // withCredentials su tutto il backend: serve davvero solo a
  // /api/auth (cookie di refresh), altrove e' innocuo
  const conCredenziali = req.clone({ withCredentials: true });

  const endpointPubblicoAuth = AUTH_PUBBLICI.some(u => req.url.includes(u));

  const conToken = (r: HttpRequest<unknown>): HttpRequest<unknown> => {
    const t = authS.token();
    return t && !endpointPubblicoAuth
        ? r.clone({ setHeaders: { Authorization: `Bearer ${t}` } })
        : r;
  };

  return next(conToken(conCredenziali)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || endpointPubblicoAuth) return throwError(() => err);

      // Access scaduto a meta' navigazione: UNA rotazione, poi retry
      refreshInCorso$ ??= utenteS.refresh().pipe(shareReplay(1));

      return refreshInCorso$.pipe(
        switchMap(() => {
          refreshInCorso$ = null;
          return next(conToken(conCredenziali));   // riprova col token nuovo
        }),
        catchError(refreshErr => {
          // Anche il refresh e' morto: la sessione non c'e' piu'.
          refreshInCorso$ = null;
          authS.resetAll();
          router.navigate(['/login']);
          return throwError(() => refreshErr);
        })
      );
    })
  );
};