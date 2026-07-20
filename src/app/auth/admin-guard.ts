import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthServices } from './auth-services';

/**
 * Due proprieta', entrambe imparate sul campo:
 *
 * 1) SSR si astiene: il server non conosce la sessione (cookie
 *    HttpOnly + bootstrap solo browser), quindi renderizza il guscio
 *    e il verdetto spetta al client.
 *
 * 2) Il client ATTENDE il bootstrap: la initial navigation corre in
 *    parallelo al /refresh (sono entrambi initializer), quindi senza
 *    l'await il guard giudicava una sessione non ancora arrivata —
 *    e l'F5 su una pagina admin rimbalzava login -> dashboard.
 */
export const adminGuard: CanActivateFn = async (route, state) => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;   // SSR: decide il client

    const authServices = inject(AuthServices);
    const router = inject(Router);

    await authServices.pronta();   // la sessione ha avuto la sua occasione

    if (authServices.isRoleAdmin()) return true;
    return authServices.isAutentificated()
        ? router.createUrlTree(['/'])        // loggato ma non admin
        : router.createUrlTree(['/login']);  // ospite
};