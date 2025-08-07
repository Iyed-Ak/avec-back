// admin/components/inscriptions-map/inscriptions-map.component.ts
import { Component, OnInit, Input, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { GeolocationService } from '../services/geolocation.service';

@Component({
  selector: 'app-inscriptions-map',
  templateUrl: './inscriptions-map.component.html',
  styleUrls: ['./inscriptions-map.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class InscriptionsMapComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() inscriptions: any[] = [];
  @Input() focusOnId: string | null = null;
  
  private map: L.Map | undefined;
  private markers: L.LayerGroup = L.layerGroup();
  private markerMap: Map<string, L.Marker> = new Map(); // Pour stocker les marqueurs par ID
  private defaultIcon: L.Icon;
  private highlightedIcon: L.Icon;
  
  // Coordonnées des gouvernorats tunisiens (utilisées comme fallback)
  private gouvernoratCoordinates: { [key: string]: [number, number] } = {
    'Tunis': [36.8065, 10.1815],
    'Ariana': [36.8625, 10.1956],
    'Ben Arous': [36.7533, 10.2281],
    'Manouba': [36.8081, 10.0863],
    'Nabeul': [36.4515, 10.7420],
    'Zaghouan': [36.4108, 10.1433],
    'Béja': [36.7256, 9.1817],
    'Jendouba': [36.5014, 8.7753],
    'Kasserine': [35.1721, 8.8308],
    'Kairouan': [35.6784, 10.0984],
    'Sidi Bouzid': [35.0383, 9.4845],
    'Siliana': [36.0891, 9.3645],
    'Monastir': [35.7778, 10.8262],
    'Mahdia': [35.5025, 11.0618],
    'Sousse': [35.8298, 10.6409],
    'Kebili': [33.7048, 8.9695],
    'Gabès': [33.8881, 10.0982],
    'Medenine': [33.3399, 10.4918],
    'Tozeur': [33.9197, 8.1335],
    'Gafsa': [34.4311, 8.7757],
    'Tataouine': [32.9211, 10.4509],
    'Sfax': [34.7398, 10.7600],
    'Bizerte': [37.2746, 9.8712],
    'Médnine': [33.3399, 10.4918]
  };

  constructor(private geolocationService: GeolocationService) {
    // Création d'une icône standard pour les marqueurs
    this.defaultIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNS4wOTljLTYuOSAwLTEyLjUgNS42LTEyLjUgMTIuNSAwIDIuOCAxIDUuNCAxLjggNy44bDEwLjIgMTkuNyAxMC42LTIxLjJjLjQtMS40IDEuNC0zLjcgMS40LTYuM0MyNC45IDUuNyAxOS40LjEgMTIuNS4xeiIgZmlsbD0iIzM4NzhDNSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxlbGxpcHNlIGZpbGw9IiNmZmYiIGN4PSIxMi41IiBjeT0iMTIuNSIgcng9IjUuNSIgcnk9IjUuNSIvPjwvc3ZnPg==',
      iconSize: [25, 41],
      iconAnchor: [12, 41], // Pointe en bas du milieu de l'icône
      popupAnchor: [1, -34] // Point d'où s'ouvre la popup (au-dessus de l'icône)
    });
    
    // Icône mise en évidence pour le marqueur sélectionné (rouge)
    this.highlightedIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNS4wOTljLTYuOSAwLTEyLjUgNS42LTEyLjUgMTIuNSAwIDIuOCAxIDUuNCAxLjggNy44bDEwLjIgMTkuNyAxMC42LTIxLjJjLjQtMS40IDEuNC0zLjcgMS40LTYuM0MyNC45IDUuNyAxOS40LjEgMTIuNS4xeiIgZmlsbD0iI2RjMzU0NSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxlbGxpcHNlIGZpbGw9IiNmZmYiIGN4PSIxMi41IiBjeT0iMTIuNSIgcng9IjUuNSIgcnk9IjUuNSIvPjwvc3ZnPg==',
      iconSize: [30, 49], // Légèrement plus grand pour se démarquer
      iconAnchor: [15, 49],
      popupAnchor: [1, -40]
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
    if (this.inscriptions.length > 0) {
      this.displayInscriptions();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['inscriptions'] || changes['focusOnId']) && this.map) {
      this.displayInscriptions();
    }
  }

  private initMap(): void {
    // Vérifier si l'élément existe
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Élément #map introuvable dans le DOM');
      return;
    }

    try {
      // Centre initial sur la Tunisie
      this.map = L.map('map', {
        minZoom: 6,  // Empêcher un zoom trop éloigné
        maxBounds: L.latLngBounds(
          L.latLng(30, 7),   // Sud-ouest de la Tunisie
          L.latLng(38, 13)   // Nord-est de la Tunisie
        )
      }).setView([34.80, 10.18], 7);

      // Ajout de la couche OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Création du groupe de marqueurs
      this.markers = L.layerGroup().addTo(this.map);
      
      console.log('Carte initialisée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
    }
  }

  private displayInscriptions(): void {
    if (!this.map) {
      console.error('La carte n\'est pas initialisée');
      return;
    }
    
    // Nettoyage des marqueurs existants
    this.markers.clearLayers();
    this.markerMap.clear();

    // Compteur pour suivre le nombre d'inscriptions traitées
    let processedCount = 0;
    const totalInscriptions = this.inscriptions.length;
    
    // Si aucune inscription, recentrer sur la Tunisie et sortir
    if (totalInscriptions === 0) {
      this.map.setView([34.80, 10.18], 7);
      return;
    }

    this.inscriptions.forEach(inscription => {
      if (!inscription || !inscription.user) {
        console.warn('Données d\'inscription invalides:', inscription);
        processedCount++;
        return;
      }

      const user = inscription.user;
      // Valeurs par défaut si les propriétés sont absentes
      const gouvernorat = user.gouvernorat || 'Tunis';
      const ville = user.ville || '';
      const isSelected = this.focusOnId === inscription.id;

      // Récupérer les coordonnées du gouvernorat comme fallback
      const fallbackCoords = this.gouvernoratCoordinates[gouvernorat] || [34.80, 10.18];

      // Utiliser le service de géolocalisation pour obtenir des coordonnées précises
      this.geolocationService.getCoordinatesFromAddress(ville, gouvernorat)
        .subscribe(
          coordinates => {
            // Créer le marqueur avec l'icône appropriée
            const marker = L.marker(coordinates, {
              icon: isSelected ? this.highlightedIcon : this.defaultIcon
            }).addTo(this.markers);
            
            // Stocker le marqueur par ID pour pouvoir y accéder plus tard
            if (inscription.id) {
              this.markerMap.set(inscription.id, marker);
            }

            // Créer le contenu du popup
            const popupContent = `
              <div class="marker-popup">
                <h4>${user.prenom || ''} ${user.name || ''}</h4>
                <p><strong>Email:</strong> ${user.email || 'Non spécifié'}</p>
                <p><strong>Téléphone:</strong> ${user.telephone || 'Non spécifié'}</p>
                <p><strong>Formation:</strong> ${inscription.formation?.name || 'Non spécifiée'}</p>
                <p><strong>Gouvernorat:</strong> ${gouvernorat}</p>
                ${ville ? `<p><strong>Ville:</strong> ${ville}</p>` : ''}
                ${user.codePostal ? `<p><strong>Code postal:</strong> ${user.codePostal}</p>` : ''}
              </div>
            `;
            
            marker.bindPopup(popupContent);
            
            // Si c'est le marqueur sélectionné, ouvrir son popup automatiquement
            if (isSelected) {
              marker.openPopup();
            }

            // Vérifier si toutes les inscriptions ont été traitées pour ajuster la vue
            processedCount++;
            if (processedCount === totalInscriptions) {
              this.adjustMapView();
            }
          },
          error => {
            console.error('Erreur lors de la géolocalisation pour:', gouvernorat, ville, error);
            
            // En cas d'erreur, utiliser les coordonnées de fallback
            const marker = L.marker(fallbackCoords, {
              icon: isSelected ? this.highlightedIcon : this.defaultIcon
            }).addTo(this.markers);
            
            if (inscription.id) {
              this.markerMap.set(inscription.id, marker);
            }

            // Même contenu de popup
            const popupContent = `
              <div class="marker-popup">
                <h4>${user.prenom || ''} ${user.name || ''}</h4>
                <p><strong>Email:</strong> ${user.email || 'Non spécifié'}</p>
                <p><strong>Téléphone:</strong> ${user.telephone || 'Non spécifié'}</p>
                <p><strong>Formation:</strong> ${inscription.formation?.name || 'Non spécifiée'}</p>
                <p><strong>Gouvernorat:</strong> ${gouvernorat}</p>
                ${ville ? `<p><strong>Ville:</strong> ${ville}</p>` : ''}
                ${user.codePostal ? `<p><strong>Code postal:</strong> ${user.codePostal}</p>` : ''}
              </div>
            `;
            
            marker.bindPopup(popupContent);
            
            if (isSelected) {
              marker.openPopup();
            }

            processedCount++;
            if (processedCount === totalInscriptions) {
              this.adjustMapView();
            }
          }
        );
    });
  }

  private adjustMapView(): void {
    if (!this.map || this.markers.getLayers().length === 0) {
      console.warn('Pas de marqueurs à afficher ou carte non initialisée');
      return;
    }

    try {
      // Si un ID spécifique est ciblé, centrer la carte sur ce marqueur
      if (this.focusOnId && this.markerMap.has(this.focusOnId)) {
        const targetMarker = this.markerMap.get(this.focusOnId);
        if (targetMarker) {
          const position = targetMarker.getLatLng();
          this.map.setView(position, 12);  // Zoom plus important pour un seul marqueur
          return;
        }
      }
      
      // Sinon, ajuster la vue pour montrer tous les marqueurs
      const group = L.featureGroup(this.markers.getLayers() as L.Layer[]);
      this.map.fitBounds(group.getBounds().pad(0.1)); // 10% de padding autour des marqueurs
    } catch (error) {
      console.error('Erreur lors de l\'ajustement de la vue de la carte:', error);
      // En cas d'erreur, revenir à la vue par défaut
      this.map.setView([34.80, 10.18], 7);
    }
  }
}