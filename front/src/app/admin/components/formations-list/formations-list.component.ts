// admin/components/formations-list/formations-list.component.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-formations-list',
  templateUrl: './formations-list.component.html',
  styleUrls: ['./formations-list.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class FormationsListComponent implements OnInit {
  formations: any[] = [];

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFormations();
  }

  loadFormations(): void {
    this.adminService.getAllFormations().subscribe({
      next: (data) => {
        this.formations = data;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des formations:', error);
        alert('Erreur lors du chargement des formations');
      }
    });
  }

  editFormation(formation: any): void {
    // Utilisation de _id au lieu de id
    this.router.navigate(['/admin/formation/edit', formation._id]);
  }

  deleteFormation(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) {
      this.adminService.deleteFormation(id).subscribe({
        next: () => {
          alert('Formation supprimée avec succès');
          this.loadFormations(); // Recharger la liste
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          alert('Erreur lors de la suppression de la formation');
        }
      });
    }
  }
}