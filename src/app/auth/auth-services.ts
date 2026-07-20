import { Injectable, signal } from '@angular/core';
import { UtenteDTO } from '../modelli/utente-dto';
import { LoginDTO } from '../modelli/login-dto';

/**
 * Stato di autenticazione. L'access token vive SOLO in memoria; la
 * persistenza tra un F5 e l'altro e' il cookie HttpOnly + il /refresh
 * di bootstrap avviato in app.config.
 *
 * pronta(): la Promise del bootstrap. Serve ai GUARD: gli initializer
 * di Angular girano in PARALLELO, e con SSR+hydration la initial
 * navigation del router e' essa stessa un initializer — quindi i
 * guard possono correre PRIMA che il refresh sia atterrato. L'attesa
 * sta dentro chi deve decidere: i guard fanno await di pronta() e
 * solo dopo giudicano. Sul server (e nei test) e' gia' risolta.
 */
@Injectable({ providedIn: 'root' })
export class AuthServices {

    /** L'utente loggato (null = ospite). Unica fonte di verita'. */
    utente = signal<UtenteDTO | null>(null);

    /** Mai esposto ai template: lo legge solo l'interceptor via token(). */
    private accessToken: string | null = null;

    /** Bootstrap: parte gia' risolta (server/test); il browser la
     *  sostituisce con la Promise del /refresh in app.config. */
    private bootstrapPromise: Promise<void> = Promise.resolve();

    avviaBootstrap(p: Promise<void>): void {
        this.bootstrapPromise = p;
    }

    /** "La sessione e' stata (ri)tentata": i guard attendono questa. */
    pronta(): Promise<void> {
        return this.bootstrapPromise;
    }

    /** Login e refresh passano di qui (tap in services/utente.ts). */
    sessione(r: LoginDTO): void {
        this.accessToken = r.accessToken;
        this.utente.set(r.utente);
    }

    /** Aggiornamento del SOLO utente (profilo, avatar, email). */
    login(utente: UtenteDTO): void {
        this.utente.set(utente);
    }

    resetAll(): void {
        this.accessToken = null;
        this.utente.set(null);
    }

    token(): string | null {
        return this.accessToken;
    }

    isAutentificated(): boolean { return this.utente() !== null; }
    isRoleAdmin(): boolean { return this.utente()?.ruolo === 'ADMIN'; }
}