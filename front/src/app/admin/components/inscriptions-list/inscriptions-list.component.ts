// admin/components/inscriptions-list/inscriptions-list.component.ts
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

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadInscriptions();
  }

  loadInscriptions(): void {
    this.adminService.getAllInscriptions().subscribe(data => {
      this.inscriptions = data;
    });
  }

  toggleView(): void {
    this.showMap = !this.showMap;
    this.selectedInscription = null; // Réinitialiser la sélection lors du changement de vue
  }

  deleteInscription(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette inscription ?')) {
      this.adminService.deleteInscription(id).subscribe(() => {
        alert('Inscription supprimée avec succès');
        this.loadInscriptions();
      });
    }
  }

  // Nouvelle fonction pour sélectionner un inscrit et afficher sa position sur la carte
  selectInscription(inscription: any): void {
    this.selectedInscription = inscription;
    
    // Si la carte n'est pas visible, activer la vue carte
    if (!this.showMap) {
      this.showMap = true;
    }
  }
}