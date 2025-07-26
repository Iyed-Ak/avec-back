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
  imports: [CommonModule,RouterModule]
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
    this.adminService.getAllFormations().subscribe(data => {
      this.formations = data;
    });
  }

  editFormation(formation: any): void {
    this.router.navigate(['/admin/formation/edit', formation.id]);
  }

  deleteFormation(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) {
      this.adminService.deleteFormation(id).subscribe(() => {
        alert('Formation supprimée avec succès');
        this.loadFormations();
      });
    }
  }
}