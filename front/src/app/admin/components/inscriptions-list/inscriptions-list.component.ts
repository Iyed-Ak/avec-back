import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { InscriptionsMapComponent } from '../../inscriptions-map/inscriptions-map.component';

@Component({
  selector: 'app-inscriptions-list',
  templateUrl: './inscriptions-list.component.html',
  styleUrls: ['./inscriptions-list.component.css'],
  standalone: true,
  imports: [CommonModule, InscriptionsMapComponent]
})
export class InscriptionsListComponent implements OnInit {
  inscriptions: any[] = [];
  showMap: boolean = false;
  selectedInscription: any = null;
  loading: boolean = false;
  error: string | null = null;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadInscriptions();
  }

  loadInscriptions(): void {
    this.loading = true;
    this.error = null;
    
    this.adminService.getAllInscriptions().subscribe({
      next: (data) => {
        this.inscriptions = data;
        this.loading = false;
        console.log('Inscriptions chargées:', data); // Pour debug
        console.log('Premier élément:', data[0]); // Voir la structure
        console.log('ID du premier élément:', data[0]?._id || data[0]?.id); // Voir l'ID
      },
      error: (error) => {
        console.error('Erreur lors du chargement des inscriptions:', error);
        this.error = 'Erreur lors du chargement des inscriptions';
        this.loading = false;
      }
    });
  }

  toggleView(): void {
    this.showMap = !this.showMap;
    this.selectedInscription = null;
  }

  deleteInscription(id: string): void {
    // Vérification que l'ID existe
    if (!id) {
      alert('Erreur: ID de l\'inscription non trouvé');
      console.error('ID de l\'inscription est undefined ou null');
      return;
    }

    console.log('Tentative de suppression de l\'inscription avec ID:', id); // Pour debug

    if (confirm('Êtes-vous sûr de vouloir supprimer cette inscription ?')) {
      this.adminService.deleteInscription(id).subscribe({
        next: (response) => {
          alert('Inscription supprimée avec succès');
          console.log('Inscription supprimée:', response);
          this.loadInscriptions(); // Recharger la liste
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          alert('Erreur lors de la suppression de l\'inscription');
        }
      });
    }
  }

  selectInscription(inscription: any): void {
    this.selectedInscription = inscription;
    
    if (!this.showMap) {
      this.showMap = true;
    }
  }
}