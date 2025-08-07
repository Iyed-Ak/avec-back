// app-routing.module.ts (mise à jour pour lazy loading)
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AcceuilComponent } from './acceuil/acceuil.component';
import { FormationComponent } from './formation/formation.component';
import { FormationDetailComponent } from './details/details.component';
import { ContactComponent } from './contact/contact.component';

export const routes: Routes = [
    {
        path:'',
        redirectTo:'acc',
        pathMatch:'full'

    },
    { path: 'acc', component: AcceuilComponent },
    { path: 'form', component: FormationComponent },
    { path: 'formations/:name', component: FormationDetailComponent},
    { path: 'contact', component: ContactComponent },
    { 
        path: 'admin', 
        loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
        // Nous ne mettons pas le guard ici car il sera dans le module admin
    },
    { path: '**', redirectTo: '' }
];
@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }