import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminListComponent } from './components/admin-list/admin-list.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';


@NgModule({
  declarations: [
  ],
  providers: [ ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    AdminListComponent,
    ChangePasswordComponent
  ]
})
export class AdminModule { }
