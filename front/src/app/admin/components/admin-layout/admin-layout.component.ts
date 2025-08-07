import { Component,OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterModule,CommonModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {

  currentUser: any = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }
}
