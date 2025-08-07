// src/app/admin/services/auth-service.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'admin_auth_token';
  private apiUrl = 'http://localhost:3000/api/admin';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  constructor(private http: HttpClient) {
    this.loadCurrentUser();
  }
  
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          if (response.token) {
            localStorage.setItem(this.tokenKey, response.token);
            this.currentUserSubject.next(response.admin);
          }
        })
      );
  }
  
  logout(): Observable<any> {
    const token = this.getToken();
    
    if (token) {
      return this.http.post<any>(`${this.apiUrl}/logout`, {})
        .pipe(
          tap(() => {
            localStorage.removeItem(this.tokenKey);
            this.currentUserSubject.next(null);
            console.log('Déconnexion réussie avec révocation du token');
          }),
          catchError((error) => {
            localStorage.removeItem(this.tokenKey);
            this.currentUserSubject.next(null);
            console.error('Erreur lors de la révocation du token:', error);
            return throwError(() => error);
          })
        );
    } else {
      localStorage.removeItem(this.tokenKey);
      this.currentUserSubject.next(null);
      return new Observable(observer => {
        observer.next({ message: 'Déconnexion locale réussie' });
        observer.complete();
      });
    }
  }
  
  isAuthenticated(): boolean {
    return localStorage.getItem(this.tokenKey) !== null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  private loadCurrentUser(): void {
    const token = this.getToken();
    if (token) {
      // Vérifier le token au démarrage
      this.verifyToken().subscribe({
        next: (response) => {
          this.currentUserSubject.next(response.admin);
        },
        error: (error) => {
          console.log('Token invalide au démarrage, nettoyage local:', error);
          localStorage.removeItem(this.tokenKey);
          this.currentUserSubject.next(null);
        }
      });
    }
  }

  verifyToken(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/verify`);
  }

  startTokenValidityCheck(): void {
    if (this.isAuthenticated()) {
      // Vérifier toutes les 5 minutes
      setInterval(() => {
        if (this.isAuthenticated()) {
          this.verifyToken().subscribe({
            next: (response) => {
              this.currentUserSubject.next(response.admin);
            },
            error: (error) => {
              console.log('Token devenu invalide, déconnexion automatique:', error);
              localStorage.removeItem(this.tokenKey);
              this.currentUserSubject.next(null);
            }
          });
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  forceLogout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
    console.log('Déconnexion forcée - token révoqué');
  }
}
