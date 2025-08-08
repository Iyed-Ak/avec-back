// admin/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private formationsUrl = 'http://localhost:3000/api/formations';
  private inscriptionsUrl = 'http://localhost:3000/api/inscriptions';

  constructor(private http: HttpClient) {}

  // Gestion centralisée des erreurs
  private handleError(error: HttpErrorResponse) {
    console.error('Une erreur est survenue:', error);
    return throwError(() => error);
  }

  // Formations CRUD
  getAllFormations(): Observable<any[]> {
    return this.http.get<any[]>(this.formationsUrl).pipe(
      catchError(this.handleError)
    );
  }

  getFormationById(id: string): Observable<any> {
    return this.http.get<any>(`${this.formationsUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  addFormation(formation: any): Observable<any> {
    return this.http.post<any>(this.formationsUrl, formation).pipe(
      catchError(this.handleError)
    );
  }

  updateFormation(id: string, formation: any): Observable<any> {
    return this.http.put<any>(`${this.formationsUrl}/${id}`, formation).pipe(
      catchError(this.handleError)
    );
  }

  deleteFormation(id: string): Observable<any> {
    return this.http.delete<any>(`${this.formationsUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Inscriptions CRUD
// Remplacer la méthode getAllInscriptions() dans admin.service.ts

getAllInscriptions(): Observable<any[]> {
  const token = localStorage.getItem('admin_auth_token');
  console.log('AdminService.getAllInscriptions - Token available:', token ? 'Yes' : 'No');
  
  return this.http.get<any[]>(this.inscriptionsUrl).pipe(
    catchError((error) => {
      console.error('Error in getAllInscriptions:', error);
      console.error('Error status:', error.status);
      console.error('Error message:', error.message);
      return this.handleError(error);
    })
  );
}

  getInscriptionById(id: string): Observable<any> {
    return this.http.get<any>(`${this.inscriptionsUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  updateInscription(id: string, inscription: any): Observable<any> {
    return this.http.put<any>(`${this.inscriptionsUrl}/${id}`, inscription).pipe(
      catchError(this.handleError)
    );
  }

  deleteInscription(id: string): Observable<any> {
    return this.http.delete<any>(`${this.inscriptionsUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Statistiques
  getStats(): Observable<any> {
    return forkJoin({
      formations: this.getAllFormations(),
      inscriptions: this.getAllInscriptions()
    }).pipe(
      map(results => ({
        totalFormations: results.formations.length,
        totalInscriptions: results.inscriptions.length,
        // Vous pourriez ajouter d'autres statistiques ici
      })),
      catchError(this.handleError)
    );
  }

  // Gestion des admins
  getAdminsList(): Observable<any> {
    return this.http.get<any>('http://localhost:3000/api/admin/list').pipe(
      catchError(this.handleError)
    );
  }

  deleteAdmin(email: string): Observable<any> {
    return this.http.delete<any>(`http://localhost:3000/api/admin/delete?email=${email}`).pipe(
      catchError(this.handleError)
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put<any>('http://localhost:3000/api/admin/change-password', {
      currentPassword,
      newPassword
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Création et gestion des rôles d'admin
  createAdmin(adminData: any): Observable<any> {
    return this.http.post<any>('http://localhost:3000/api/admin/register', adminData).pipe(
      catchError(this.handleError)
    );
  }

  changeAdminRole(adminId: string, newRole: string): Observable<any> {
    return this.http.put<any>('http://localhost:3000/api/admin/change-role', {
      adminId,
      newRole
    }).pipe(
      catchError(this.handleError)
    );
  }

  verifyToken(): Observable<any> {
    return this.http.get<any>('http://localhost:3000/api/admin/verify').pipe(
      catchError(this.handleError)
    );
  }
}