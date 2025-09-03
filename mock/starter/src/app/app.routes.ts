// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { CourseListComponent } from './features/courses/course-list/course-list.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'courses', pathMatch: 'full' },
  { path: 'courses', component: CourseListComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard] }
];
