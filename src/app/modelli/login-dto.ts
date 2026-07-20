import { UtenteDTO } from './utente-dto';

/**
 * Risposta di /auth/login e /auth/refresh (stesso shape).
 * Il refresh token NON e' qui: vive nel cookie HttpOnly,
 * invisibile per design a questo codice.
 */
export interface LoginDTO {
  accessToken: string;
  tokenType: string;      // "Bearer"
  utente: UtenteDTO;
}