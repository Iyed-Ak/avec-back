// src/app/admin/components/create-admin/create-admin.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth-service.service';

@Component({
  selector: 'app-create-admin',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-admin.component.html',
  styleUrls: ['./create-admin.component.css']
})
export class CreateAdminComponent implements OnInit {
  adminForm!: FormGroup;
  isSubmitting = false;
  success = false;
  error: string | null = null;
  currentUser: any = null;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // Vérifier si l'utilisateur est super admin
    if (!this.currentUser || this.currentUser.role !== 'superAdmin') {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.adminForm = this.fb.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['admin', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onSubmit(): void {
    if (this.adminForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.error = null;
      this.success = false;

      const formData = this.adminForm.value;
      delete formData.confirmPassword; // Ne pas envoyer la confirmation

      this.adminService.createAdmin(formData).subscribe({
        next: (response) => {
          console.log('Admin créé:', response);
          this.success = true;
          this.isSubmitting = false;
          this.adminForm.reset();
          this.adminForm.patchValue({ role: 'admin' });
          
          // Rediriger vers la liste après 2 secondes
          setTimeout(() => {
            this.router.navigate(['/admin/admins']);
          }, 2000);
        },
        error: (error) => {
          console.error('Erreur création admin:', error);
          this.error = error.error?.message || 'Erreur lors de la création de l\'admin';
          this.isSubmitting = false;
        }
      });
    }
  }

  // Méthodes pour l'affichage des erreurs
  getFieldError(fieldName: string): string | null {
    const field = this.adminForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return 'Ce champ est requis';
      }
      if (field.errors?.['email']) {
        return 'Email invalide';
      }
      if (field.errors?.['minlength']) {
        return 'Le mot de passe doit contenir au moins 6 caractères';
      }
      if (field.errors?.['passwordMismatch']) {
        return 'Les mots de passe ne correspondent pas';
      }
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.adminForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  cancel(): void {
    this.router.navigate(['/admin/admins']);
  }
}