import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthServices } from './auth-services';

export const autentificateGuard: CanActivateFn = (route, state) => {
    const authServices = inject(AuthServices);
    const router = inject(Router);
    return authServices.isAutentificated()
        ? true
        : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
