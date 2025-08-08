// src/app/admin/interceptors/jwt.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('admin_auth_token');
  
  console.log('JWT Interceptor triggered for:', req.url);
  console.log('Token found:', token ? 'Yes' : 'No');
  
  if (token) {
    console.log('Adding Authorization header with token');
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  }
  
  console.log('No token found, proceeding without auth header');
  return next(req);
};