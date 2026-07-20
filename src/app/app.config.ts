import { ApplicationConfig, inject, PLATFORM_ID, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth-interceptor';
import { Utente } from './services/utente';
import { AuthServices } from './auth/auth-services';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),

    /**
     * Bootstrap di sessione — LEZIONE IMPARATA: gli initializer girano
     * in PARALLELO, e con SSR+hydration la initial navigation del
     * router e' essa stessa un initializer. Attendere qui non blocca
     * il router: la gara col guard la si perdeva comunque.
     * Quindi qui si AVVIA soltanto il /refresh e se ne deposita la
     * Promise in AuthServices; l'ATTESA sta nei guard (await pronta()),
     * cioe' dentro chi deve davvero decidere. Le pagine pubbliche non
     * aspettano nessuno. Fallimento = ospite, senza rumore.
     */
    provideAppInitializer(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
      const utenteS = inject(Utente);
      const authS = inject(AuthServices);
      authS.avviaBootstrap(
        firstValueFrom(utenteS.refresh()).then(() => {}, () => {})
      );
    }),
  ]

};