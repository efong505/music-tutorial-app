// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app/app.routes';
import { CourseListComponent } from './app/features/courses/course-list/course-list.component';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

bootstrapApplication(CourseListComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
}).catch(err => console.error(err));
