import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { UtenteDTO } from '../modelli/utente-dto';

@Injectable({ providedIn: 'root' })
export class AuthServices {

    private platformId = inject(PLATFORM_ID);

    /** L'utente loggato (null = ospite). Unica fonte di verita'. */
    utente = signal<UtenteDTO | null>(this.restore());

    login(utente: UtenteDTO) {
        this.utente.set(utente);
        if (isPlatformBrowser(this.platformId))
            localStorage.setItem('utente', JSON.stringify(utente));
    }

    resetAll() {
        this.utente.set(null);
        if (isPlatformBrowser(this.platformId))
            localStorage.removeItem('utente');
    }

    // Nomi compatibili coi tuoi guard: nessuna modifica necessaria li'
    isAutentificated(): boolean { return this.utente() !== null; }
    isRoleAdmin(): boolean { return this.utente()?.ruolo === 'ADMIN'; }

    private restore(): UtenteDTO | null {
        if (!isPlatformBrowser(this.platformId)) return null;
             try {
                const salvato = localStorage.getItem('utente');
                return salvato ? JSON.parse(salvato) : null;
            } catch {
                localStorage.removeItem('utente'); // dato corrotto: pulisci e riparti da ospite
                 return null;
        }
    }
}