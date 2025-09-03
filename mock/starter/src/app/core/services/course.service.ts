// src/app/core/services/course.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CourseService {
  getCourses() {
    return [{ id: 1, title: 'Guitar Basics' }];
  }
}
