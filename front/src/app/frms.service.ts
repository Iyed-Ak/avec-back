import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';


@Injectable({
  providedIn: 'root',
})
export class FormationService {
  private apiUrl = 'http://localhost:3000/api/formations';  // URL de JSON Server pour les formations
  private inscriptionsUrl = 'http://localhost:3000/api/inscriptions';
 // URL pour les inscriptions

  constructor(private http: HttpClient) {}

  // Récupérer toutes les formations depuis JSON Server
  getFormations(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Ajouter une formation dans la base de données
  addFormation(formation: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, formation);
  }

  // Ajouter une inscription
  addInscription(inscription: any): Observable<any> {
    return this.http.post<any>(this.inscriptionsUrl, inscription);
  }

  // Récupérer toutes les inscriptions
  getInscriptions(): Observable<any[]> {
    return this.http.get<any[]>(this.inscriptionsUrl);
  }
  // Chercher une formation par son nom
getFormationByName(name: string): Observable<any | undefined> {
  return this.getFormations().pipe(
    map(formations => formations.find(f => f.name === name))
  );
}

}
