// src/app/admin/interceptors/jwt.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('admin_auth_token');
  
  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const errorCode = error.error?.code;
        
        if (['TOKEN_EXPIRED', 'TOKEN_REVOKED', 'INVALID_TOKEN', 'MISSING_TOKEN', 'INVALID_ADMIN'].includes(errorCode)) {
          console.log('Token invalide détecté, redirection vers login:', errorCode);
          
          localStorage.removeItem('admin_auth_token');
          
          router.navigate(['/contact']);
          
          return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
        }
      }
      
      if (error.status === 403) {
        console.log('Accès refusé:', error.error?.message);
        return throwError(() => new Error('Accès refusé - Permissions insuffisantes'));
      }
      
      if (error.status === 429) {
        const retryAfter = error.error?.retryAfter || 900; // 15 minutes par défaut
        console.log('Rate limit atteint, réessayer dans:', retryAfter, 'secondes');
        return throwError(() => new Error(`Trop de requêtes. Réessayez dans ${Math.round(retryAfter / 60)} minutes.`));
      }
      
      return throwError(() => error);
    })
  );
};
