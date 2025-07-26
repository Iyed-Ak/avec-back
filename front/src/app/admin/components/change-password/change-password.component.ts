// src/app/admin/components/change-password/change-password.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-change-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  passwordForm!: FormGroup;
  isSubmitting = false;
  success = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onSubmit(): void {
    if (this.passwordForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.error = null;
      this.success = false;

      const { currentPassword, newPassword } = this.passwordForm.value;

      this.adminService.changePassword(currentPassword, newPassword).subscribe({
        next: (response) => {
          console.log('Mot de passe changé:', response);
          this.success = true;
          this.isSubmitting = false;
          this.passwordForm.reset();
          
          // Masquer le message de succès après 5 secondes
          setTimeout(() => {
            this.success = false;
          }, 5000);
        },
        error: (error) => {
          console.error('Erreur changement mot de passe:', error);
          this.error = error.error?.message || 'Erreur lors du changement de mot de passe';
          this.isSubmitting = false;
        }
      });
    }
  }

  // Méthodes pour l'affichage des erreurs
  getFieldError(fieldName: string): string | null {
    const field = this.passwordForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return 'Ce champ est requis';
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
    const field = this.passwordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}