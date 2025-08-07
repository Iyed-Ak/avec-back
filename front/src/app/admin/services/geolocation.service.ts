// services/geolocation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  // API OpenStreetMap Nominatim pour la géolocalisation
  private nominatimUrl = 'https://nominatim.openstreetmap.org/search';
  // Cache pour stocker les résultats de géocodage
  private geoCache: Map<string, [number, number]> = new Map();

  constructor(private http: HttpClient) {}

  /**
   * Récupère les coordonnées d'une adresse en Tunisie
   * @param ville - Nom de la ville
   * @param gouvernorat - Nom du gouvernorat
   * @returns Observable avec les coordonnées [lat, lng]
   */
  getCoordinatesFromAddress(ville: string, gouvernorat: string): Observable<[number, number]> {
    // Normalisation des entrées et création d'une clé de cache
    ville = (ville || '').trim();
    gouvernorat = (gouvernorat || '').trim();
    const cacheKey = `${ville}|${gouvernorat}`;
    
    // Vérifier si les coordonnées sont déjà en cache
    if (this.geoCache.has(cacheKey)) {
      return of(this.geoCache.get(cacheKey)!);
    }
    
    // Si les entrées sont vides, retourner des coordonnées par défaut
    if (!ville && !gouvernorat) {
      return of([34.80, 10.18] as [number, number]);
    }

    // Construction de la requête
    const query = ville ? `${ville}, ${gouvernorat}, Tunisia` : `${gouvernorat}, Tunisia`;

    // Configuration des paramètres de la requête
    let params = new HttpParams()
      .set('q', query)
      .set('format', 'json')
      .set('limit', '1')
      .set('accept-language', 'fr');

    // Ajout d'un paramètre countrycodes pour limiter les résultats à la Tunisie
    params = params.set('countrycodes', 'tn');

    // Envoi de la requête avec gestion des erreurs et timeout
    return this.http.get<any[]>(this.nominatimUrl, { params }).pipe(
      // Timeout après 5 secondes pour éviter les attentes trop longues
      timeout(5000),
      map(response => {
        if (response && response.length > 0) {
          const coordinates: [number, number] = [
            parseFloat(response[0].lat), 
            parseFloat(response[0].lon)
          ];
          
          // Stocker dans le cache
          this.geoCache.set(cacheKey, coordinates);
          
          return coordinates;
        }
        
        // Coordonnées par défaut si pas de résultat
        const defaultCoords: [number, number] = [34.80, 10.18];
        this.geoCache.set(cacheKey, defaultCoords);
        return defaultCoords;
      }),
      catchError(error => {
        console.error('Erreur de géolocalisation:', error);
        
        // En cas d'erreur, utiliser les coordonnées par défaut
        const defaultCoords: [number, number] = [34.80, 10.18];
        this.geoCache.set(cacheKey, defaultCoords);
        return of(defaultCoords);
      })
    );
  }
  
  /**
   * Vide le cache de géolocalisation
   */
  clearCache(): void {
    this.geoCache.clear();
  }
}