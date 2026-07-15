import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthServices } from './auth-services';

export const adminGuard: CanActivateFn = (route, state) => {
    const authServices = inject(AuthServices);
    const router = inject(Router);
    if (authServices.isRoleAdmin()) return true;
    return authServices.isAutentificated()
        ? router.createUrlTree(['/'])        // loggato ma non admin
        : router.createUrlTree(['/login']);  // ospite
};