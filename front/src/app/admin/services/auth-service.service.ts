// src/app/admin/services/auth-service.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

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
  
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
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
        error: () => {
          this.logout();
        }
      });
    }
  }

  verifyToken(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/verify`);
  }
}