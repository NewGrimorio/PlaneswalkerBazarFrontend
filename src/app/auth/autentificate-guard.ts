import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthServices } from './auth-services';

/**
 * Stesso principio di adminGuard: SSR si astiene, il client attende
 * il bootstrap (await pronta()) e SOLO POI giudica.
 */
export const autentificateGuard: CanActivateFn = async (route, state) => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;   // SSR: decide il client

    const authServices = inject(AuthServices);
    const router = inject(Router);

    await authServices.pronta();

    return authServices.isAutentificated()
        ? true
        : router.createUrlTree(['/login']);
};