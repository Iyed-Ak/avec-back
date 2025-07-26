// admin-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  imports: [CommonModule,ReactiveFormsModule], 
})
export class AdminDashboardComponent implements OnInit {
  formations: any[] = [];
  inscriptions: any[] = [];
  stats: any = {};

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.adminService.getAllFormations().subscribe(data => {
      this.formations = data;
    });
    
    this.adminService.getAllInscriptions().subscribe(data => {
      this.inscriptions = data;
    });
    
    this.adminService.getStats().subscribe(data => {
      this.stats = data;
    });
  }
}