// src/app/admin/components/admin-list/admin-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth-service.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-list',
  imports: [CommonModule,RouterModule],
  templateUrl: './admin-list.component.html',
  styleUrls: ['./admin-list.component.css']
})
export class AdminListComponent implements OnInit {
  admins: any[] = [];
  loading = false;
  error: string | null = null;
  currentAdmin: any = null;

  constructor(
    private adminService: AdminService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAdmins();
    this.loadCurrentAdmin();
  }

  loadAdmins(): void {
    this.loading = true;
    this.error = null;
    
    this.adminService.getAdminsList().subscribe({
      next: (response) => {
        this.admins = response.admins || [];
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des admins';
        this.loading = false;
        console.error('Erreur:', error);
      }
    });
  }

  loadCurrentAdmin(): void {
    this.adminService.verifyToken().subscribe({
      next: (response) => {
        this.currentAdmin = response.admin;
      },
      error: (error) => {
        console.error('Erreur verification token:', error);
      }
    });
  }

  canDeleteAdmin(admin: any): boolean {
    // Seul un superAdmin peut supprimer d'autres admins
    // Et il ne peut pas se supprimer lui-même
    return this.currentAdmin?.role === 'superAdmin' && 
           admin.id !== this.currentAdmin.id;
  }

  deleteAdmin(admin: any): void {
    if (!this.canDeleteAdmin(admin)) {
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer l'admin ${admin.email} ?`)) {
      this.adminService.deleteAdmin(admin.email).subscribe({
        next: (response) => {
          console.log('Admin supprimé:', response);
          this.loadAdmins(); // Recharger la liste
        },
        error: (error) => {
          this.error = 'Erreur lors de la suppression';
          console.error('Erreur suppression:', error);
        }
      });
    }
  }
  // Dans admin-list.component.ts, ajoutez ces méthodes :

canChangeRole(admin: any): boolean {
  return this.currentAdmin?.role === 'superAdmin' && 
         admin.id !== this.currentAdmin.id;
}

changeRole(admin: any): void {
  if (!this.canChangeRole(admin)) return;

  const newRole = admin.role === 'admin' ? 'superAdmin' : 'admin';
  const roleLabel = newRole === 'superAdmin' ? 'Super Admin' : 'Admin';

  if (confirm(`Changer le rôle de ${admin.email} vers ${roleLabel} ?`)) {
    this.adminService.changeAdminRole(admin.id, newRole).subscribe({
      next: (response) => {
        console.log('Rôle changé:', response);
        this.loadAdmins(); // Recharger la liste
      },
      error: (error) => {
        this.error = 'Erreur lors du changement de rôle';
        console.error('Erreur changement rôle:', error);
      }
    });
  }
}

  formatDate(date: string): string {
    if (!date) return 'Jamais';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}