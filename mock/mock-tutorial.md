# Music Tutorial Web Application – Beginner-Friendly, End-to-End Guide (Standalone Angular + AWS)

Welcome! This guide helps you build a **music tutorial web app** with a **standalone Angular frontend** and an **AWS serverless backend**.  
You’ll start locally with a **mock backend** so you can run the app immediately, then swap in AWS later.

---

## 🔭 Architecture Overview

```text
User (Angular) → CloudFront → S3 Website
Angular → API Gateway → Lambda (Auth, Courses, Payments) → DynamoDB/S3/Stripe
S3 Content → CloudFront (video delivery)
```

---

# Phase 1 — AWS Infrastructure Setup

> If you are starting in **mock mode**, you can skip to **Phase 3** for now and come back when ready to connect AWS.

### 1.1 Install AWS CLI
```
music-tutorial-app/
├── frontend/          # Angular application
├── backend/           # Lambda functions
├── infrastructure/    # AWS CDK or CloudFormation
└── shared/           # Shared types/interfaces
```

### 1.2 Create DynamoDB Tables
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
```

### 1.3 Create S3 Buckets
```javascript
// infrastructure/tables.js
const tables = {
  Users: {
    TableName: 'music-tutorial-users',
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [{
      IndexName: 'email-index',
      Keys: { email: 'HASH' }
    }]
  },
  Courses: {
    TableName: 'music-tutorial-courses',
    KeySchema: [
      { AttributeName: 'courseId', KeyType: 'HASH' }
    ]
  },
  Enrollments: {
    TableName: 'music-tutorial-enrollments',
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'courseId', KeyType: 'RANGE' }
    ]
  }
};
```

### 1.4 Create Cognito User Pool
```yaml
# infrastructure/s3-config.yaml
Buckets:
  ContentBucket:
    Name: music-tutorial-content
    Versioning: Enabled
    Cors:
      - AllowedOrigins: ['*']
        AllowedMethods: [GET, PUT, POST]
        AllowedHeaders: ['*']
  
  WebsiteBucket:
    Name: music-tutorial-website
    WebsiteConfiguration:
      IndexDocument: index.html
      ErrorDocument: error.html
```

---

# Phase 2 — Backend (Lambda + API Gateway + Stripe)

### 2.1 Project Setup
```bash
# Create backend directory structure
mkdir -p backend/{functions/{auth,courses,payments,admin},layers/shared,utils}
cd backend

# Initialize package.json
npm init -y

# Install dependencies
npm install aws-sdk stripe uuid bcryptjs jsonwebtoken
npm install --save-dev @types/node @types/aws-lambda typescript serverless serverless-offline

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "exclude": ["node_modules", "dist"]
}
EOF
```

### 2.2 Shared Database Utility
```typescript
// backend/layers/shared/nodejs/utils/database.ts
import * as AWS from 'aws-sdk';

export class DatabaseClient {
  private dynamodb: AWS.DynamoDB.DocumentClient;
  
  constructor() {
    this.dynamodb = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }
  
  async get(tableName: string, key: any) {
    const params = {
      TableName: tableName,
      Key: key
    };
    const result = await this.dynamodb.get(params).promise();
    return result.Item;
  }
  
  async put(tableName: string, item: any) {
    const params = {
      TableName: tableName,
      Item: item
    };
    return await this.dynamodb.put(params).promise();
  }
  
  async update(tableName: string, key: any, updateExpression: string, expressionAttributeValues: any) {
    const params = {
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    const result = await this.dynamodb.update(params).promise();
    return result.Attributes;
  }
  
  async query(params: AWS.DynamoDB.DocumentClient.QueryInput) {
    const result = await this.dynamodb.query(params).promise();
    return result.Items || [];
  }
  
  async scan(tableName: string, filter?: any) {
    const params: AWS.DynamoDB.DocumentClient.ScanInput = {
      TableName: tableName
    };
    if (filter) {
      params.FilterExpression = filter.expression;
      params.ExpressionAttributeValues = filter.values;
    }
    const result = await this.dynamodb.scan(params).promise();
    return result.Items || [];
  }
  
  async delete(tableName: string, key: any) {
    const params = {
      TableName: tableName,
      Key: key
    };
    return await this.dynamodb.delete(params).promise();
  }
  
  async batchWrite(tableName: string, items: any[]) {
    const chunks = [];
    for (let i = 0; i < items.length; i += 25) {
      chunks.push(items.slice(i, i + 25));
    }
    
    for (const chunk of chunks) {
      const params = {
        RequestItems: {
          [# Music Tutorial Web Application with Angular and AWS

## Architecture Overview

### AWS Services Stack
- **Frontend Hosting**: S3 + CloudFront
- **Authentication**: AWS Cognito
- **API Layer**: API Gateway + Lambda
- **Database**: DynamoDB
- **File Storage**: S3 (for videos/materials)
- **Payment Processing**: Stripe integration via Lambda
- **Video Streaming**: CloudFront with S3

### Application Structure
```

### 2.3 Auth Lambdas
Save as `backend/functions/auth/handler.ts`:
```javascript
// infrastructure/cognito-config.js
const userPoolConfig = {
  PoolName: 'music-tutorial-users',
  Policies: {
    PasswordPolicy: {
      MinimumLength: 8,
      RequireUppercase: true,
      RequireLowercase: true,
      RequireNumbers: true,
      RequireSymbols: true
    }
  },
  Schema: [
    {
      Name: 'email',
      AttributeDataType: 'String',
      Required: true,
      Mutable: false
    },
    {
      Name: 'name',
      AttributeDataType: 'String',
      Required: true,
      Mutable: true
    },
    {
      Name: 'custom:role',
      AttributeDataType: 'String',
      Mutable: true
    }
  ],
  AutoVerifiedAttributes: ['email'],
  MfaConfiguration: 'OPTIONAL'
};
```

### 2.4 Course Lambdas
Save as `backend/functions/courses/handler.ts`:
```
backend/
├── functions/
│   ├── auth/
│   ├── courses/
│   ├── payments/
│   └── admin/
├── layers/
│   └── shared/
└── package.json
```

### 2.5 Payments (Stripe) Lambdas
Save as `backend/functions/payments/handler.ts`:
```typescript
// backend/functions/auth/handler.ts
import * as AWS from 'aws-sdk';
import { APIGatewayProxyHandler } from 'aws-lambda';

const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

export const signUp: APIGatewayProxyHandler = async (event) => {
  const { email, password, name } = JSON.parse(event.body || '{}');
  
  try {
    // Create Cognito user
    const cognitoResponse = await cognito.signUp({
      ClientId: process.env.COGNITO_CLIENT_ID!,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name }
      ]
    }).promise();
    
    // Store user in DynamoDB
    await dynamodb.put({
      TableName: 'music-tutorial-users',
      Item: {
        userId: cognitoResponse.UserSub,
        email,
        name,
        createdAt: new Date().toISOString(),
        subscription: 'free'
      }
    }).promise();
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'User created successfully' })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

export const signIn: APIGatewayProxyHandler = async (event) => {
  const { email, password } = JSON.parse(event.body || '{}');
  
  try {
    const response = await cognito.initiateAuth({
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    }).promise();
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        accessToken: response.AuthenticationResult?.AccessToken,
        idToken: response.AuthenticationResult?.IdToken,
        refreshToken: response.AuthenticationResult?.RefreshToken
      })
    };
  } catch (error) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid credentials' })
    };
  }
};
```

### 2.6 Serverless Config & Deploy
Save as `backend/serverless.yml`:
```typescript
// backend/functions/courses/handler.ts
import * as AWS from 'aws-sdk';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

export const createCourse: APIGatewayProxyHandler = async (event) => {
  // Verify admin role from JWT
  const isAdmin = event.requestContext.authorizer?.claims['custom:role'] === 'admin';
  
  if (!isAdmin) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  const course = JSON.parse(event.body || '{}');
  const courseId = uuidv4();
  
  await dynamodb.put({
    TableName: 'music-tutorial-courses',
    Item: {
      courseId,
      ...course,
      createdAt: new Date().toISOString()
    }
  }).promise();
  
  return {
    statusCode: 201,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ courseId })
  };
};

export const uploadContent: APIGatewayProxyHandler = async (event) => {
  const { courseId, fileName, contentType } = JSON.parse(event.body || '{}');
  
  const key = `courses/${courseId}/${fileName}`;
  const signedUrl = s3.getSignedUrl('putObject', {
    Bucket: 'music-tutorial-content',
    Key: key,
    ContentType: contentType,
    Expires: 300
  });
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ uploadUrl: signedUrl, key })
  };
};

export const getCourses: APIGatewayProxyHandler = async (event) => {
  const userId = event.requestContext.authorizer?.claims.sub;
  
  // Get user's enrollments
  const enrollments = await dynamodb.query({
    TableName: 'music-tutorial-enrollments',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId }
  }).promise();
  
  // Get all courses
  const courses = await dynamodb.scan({
    TableName: 'music-tutorial-courses'
  }).promise();
  
  // Mark enrolled courses
  const coursesWithEnrollment = courses.Items?.map(course => ({
    ...course,
    enrolled: enrollments.Items?.some(e => e.courseId === course.courseId)
  }));
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(coursesWithEnrollment)
  };
};
```

Deploy:
```bash
cd backend
npx serverless deploy
```

---

# Phase 3 — Angular Frontend (Standalone, with Mock Mode)

We’ll scaffold the Angular app, run it with **mock backend** first, and show how to switch to AWS later.

### 3.1 Create Angular Project
```typescript
// backend/functions/payments/handler.ts
import Stripe from 'stripe';
import * as AWS from 'aws-sdk';
import { APIGatewayProxyHandler } from 'aws-lambda';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});
const dynamodb = new AWS.DynamoDB.DocumentClient();

export const createCheckoutSession: APIGatewayProxyHandler = async (event) => {
  const { courseId, userId } = JSON.parse(event.body || '{}');
  
  // Get course details
  const course = await dynamodb.get({
    TableName: 'music-tutorial-courses',
    Key: { courseId }
  }).promise();
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: course.Item?.title,
          description: course.Item?.description
        },
        unit_amount: course.Item?.price * 100
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/courses`,
    metadata: { courseId, userId }
  });
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ sessionUrl: session.url })
  };
};

export const handleWebhook: APIGatewayProxyHandler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig!,
      webhookSecret
    );
    
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const { courseId, userId } = session.metadata!;
      
      // Grant access to course
      await dynamodb.put({
        TableName: 'music-tutorial-enrollments',
        Item: {
          userId,
          courseId,
          enrolledAt: new Date().toISOString(),
          paymentId: session.payment_intent
        }
      }).promise();
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

### 3.2 Project Structure
```bash
# Install Angular CLI
npm install -g @angular/cli

# Create new project
ng new music-tutorial-frontend --routing --style=scss

# Install dependencies
cd music-tutorial-frontend
npm install @aws-amplify/auth @aws-amplify/storage aws-amplify
npm install @angular/material @angular/cdk
npm install @stripe/stripe-js
```

---

### 3.3 Authentication Service (Mock first)
Generate the file:
```bash
ng g service core/services/auth
```
Replace `src/app/core/services/auth.service.ts` with:
```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── features/
│   │   ├── auth/
│   │   ├── courses/
│   │   ├── admin/
│   │   └── student/
│   ├── shared/
│   └── app-routing.module.ts
├── environments/
└── assets/
```

> **Mock note:** In the starter project, this service returns a fake user and token when `environment.mock === true`.

---

### 3.4 Course Service (Mock first)
Generate the file:
```bash
ng g service core/services/course
```
Replace `src/app/core/services/course.service.ts` with:
```typescript
// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Auth } from 'aws-amplify';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  constructor() {
    this.checkAuthState();
  }
  
  async checkAuthState() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      this.currentUserSubject.next(user);
    } catch {
      this.currentUserSubject.next(null);
    }
  }
  
  async signUp(email: string, password: string, name: string) {
    try {
      const { user } = await Auth.signUp({
        username: email,
        password,
        attributes: { email, name }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }
  
  async signIn(email: string, password: string) {
    try {
      const user = await Auth.signIn(email, password);
      this.currentUserSubject.next(user);
      return user;
    } catch (error) {
      throw error;
    }
  }
  
  async signOut() {
    await Auth.signOut();
    this.currentUserSubject.next(null);
  }
  
  async getIdToken(): Promise<string> {
    const session = await Auth.currentSession();
    return session.getIdToken().getJwtToken();
  }
  
  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.attributes?.['custom:role'] === 'admin';
  }
}
```

> **Mock note:** In mock mode, this returns hard-coded course lists and enrollments.

---

### 3.5 Admin Dashboard Component
Generate:
```bash
ng g component features/admin/admin-dashboard --standalone
```
Replace code:
```typescript
// src/app/core/services/course.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Course {
  courseId: string;
  title: string;
  description: string;
  price: number;
  thumbnailUrl: string;
  videos: Video[];
  enrolled?: boolean;
}

export interface Video {
  videoId: string;
  title: string;
  url: string;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}
  
  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/courses`);
  }
  
  getCourse(courseId: string): Observable<Course> {
    return this.http.get<Course>(`${this.apiUrl}/courses/${courseId}`);
  }
  
  createCourse(course: Partial<Course>): Observable<{ courseId: string }> {
    return this.http.post<{ courseId: string }>(`${this.apiUrl}/admin/courses`, course);
  }
  
  uploadVideo(courseId: string, file: File): Observable<any> {
    return new Observable(observer => {
      // Get presigned URL
      this.http.post(`${this.apiUrl}/admin/upload`, {
        courseId,
        fileName: file.name,
        contentType: file.type
      }).subscribe((response: any) => {
        // Upload to S3
        this.http.put(response.uploadUrl, file, {
          headers: { 'Content-Type': file.type }
        }).subscribe(
          () => {
            observer.next({ key: response.key });
            observer.complete();
          },
          error => observer.error(error)
        );
      });
    });
  }
  
  enrollInCourse(courseId: string): Observable<{ sessionUrl: string }> {
    return this.http.post<{ sessionUrl: string }>(`${this.apiUrl}/payments/checkout`, {
      courseId
    });
  }
}
```

---

### 3.6 Course List Component (Student View)
Generate:
```bash
ng g component features/courses/course-list --standalone
```
Replace code:
```typescript
// src/app/features/admin/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CourseService } from '../../../core/services/course.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  courseForm: FormGroup;
  courses: any[] = [];
  uploading = false;
  selectedFile: File | null = null;
  
  constructor(
    private fb: FormBuilder,
    private courseService: CourseService
  ) {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      thumbnailUrl: ['']
    });
  }
  
  ngOnInit() {
    this.loadCourses();
  }
  
  loadCourses() {
    this.courseService.getCourses().subscribe(courses => {
      this.courses = courses;
    });
  }
  
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }
  
  async createCourse() {
    if (this.courseForm.valid) {
      const course = this.courseForm.value;
      
      this.courseService.createCourse(course).subscribe(response => {
        if (this.selectedFile && response.courseId) {
          this.uploadVideo(response.courseId);
        }
        this.loadCourses();
        this.courseForm.reset();
      });
    }
  }
  
  uploadVideo(courseId: string) {
    if (this.selectedFile) {
      this.uploading = true;
      this.courseService.uploadVideo(courseId, this.selectedFile).subscribe(
        response => {
          this.uploading = false;
          this.selectedFile = null;
        },
        error => {
          this.uploading = false;
          console.error('Upload failed:', error);
        }
      );
    }
  }
}
```

---

### 3.7 Route Guards
Generate:
```bash
ng g guard core/guards/auth --standalone
```
Replace code:
```typescript
// src/app/features/courses/course-list/course-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CourseService, Course } from '../../../core/services/course.service';
import { loadStripe } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss']
})
export class CourseListComponent implements OnInit {
  courses: Course[] = [];
  enrolledCourses: Course[] = [];
  availableCourses: Course[] = [];
  
  constructor(private courseService: CourseService) {}
  
  ngOnInit() {
    this.loadCourses();
  }
  
  loadCourses() {
    this.courseService.getCourses().subscribe(courses => {
      this.courses = courses;
      this.enrolledCourses = courses.filter(c => c.enrolled);
      this.availableCourses = courses.filter(c => !c.enrolled);
    });
  }
  
  async enrollInCourse(courseId: string) {
    this.courseService.enrollInCourse(courseId).subscribe(async response => {
      const stripe = await loadStripe(environment.stripePublicKey);
      if (stripe && response.sessionUrl) {
        window.location.href = response.sessionUrl;
      }
    });
  }
}
```

---

### 3.8 HTTP Interceptor
Generate:
```bash
ng g interceptor core/interceptors/auth
```
Replace code:
```typescript
// src/app/core/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user) {
          return true;
        }
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(): boolean {
    if (this.authService.isAdmin()) {
      return true;
    }
    this.router.navigate(['/courses']);
    return false;
  }
}
```

---

# Phase 4 — Build & Deploy

### 4.1 Deploy Backend
```bash
cd backend
npx serverless deploy
```

### 4.2 Frontend Build & Deploy to S3 + CloudFront
```bash
cd frontend/music-tutorial-frontend
ng build --configuration production

aws s3api create-bucket --bucket music-tutorial-website --region us-east-1
aws s3 website s3://music-tutorial-website/ --index-document index.html --error-document error.html

aws s3 sync dist/music-tutorial-frontend/ s3://music-tutorial-website/ --acl public-read

aws cloudfront create-distribution   --origin-domain-name music-tutorial-website.s3.amazonaws.com   --default-root-object index.html
```

### 4.3 Angular Environments
Update `src/environments/environment.prod.ts`:
```typescript
// src/app/core/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        const authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        return next.handle(authReq);
      })
    );
  }
}
```

---

# Phase 5 — Security & Optimization
```yaml
# serverless.yml
service: music-tutorial-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    COGNITO_USER_POOL_ID: ${self:custom.cognitoUserPoolId}
    COGNITO_CLIENT_ID: ${self:custom.cognitoClientId}
    STRIPE_SECRET_KEY: ${env:STRIPE_SECRET_KEY}
    FRONTEND_URL: ${self:custom.frontendUrl}

functions:
  signUp:
    handler: functions/auth/handler.signUp
    events:
      - http:
          path: auth/signup
          method: post
          cors: true
  
  signIn:
    handler: functions/auth/handler.signIn
    events:
      - http:
          path: auth/signin
          method: post
          cors: true
  
  createCourse:
    handler: functions/courses/handler.createCourse
    events:
      - http:
          path: admin/courses
          method: post
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: ${self:custom.authorizerId}
  
  getCourses:
    handler: functions/courses/handler.getCourses
    events:
      - http:
          path: courses
          method: get
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: ${self:custom.authorizerId}
  
  createCheckout:
    handler: functions/payments/handler.createCheckoutSession
    events:
      - http:
          path: payments/checkout
          method: post
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: ${self:custom.authorizerId}

resources:
  Resources:
    UserTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: music-tutorial-users
        AttributeDefinitions:
          - AttributeName: userId
            AttributeType: S
        KeySchema:
          - AttributeName: userId
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
    
    CourseTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: music-tutorial-courses
        AttributeDefinitions:
          - AttributeName: courseId
            AttributeType: S
        KeySchema:
          - AttributeName: courseId
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
```

# Phase 6 — Monitoring & Testing
```bash
# Build Angular app
ng build --prod

# Create S3 bucket for hosting
aws s3api create-bucket --bucket music-tutorial-app --region us-east-1

# Enable static website hosting
aws s3 website s3://music-tutorial-app/ \
  --index-document index.html \
  --error-document error.html

# Upload build files
aws s3 sync dist/music-tutorial-frontend/ s3://music-tutorial-app/ --acl public-read

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name music-tutorial-app.s3.amazonaws.com \
  --default-root-object index.html
```

---

## 🔁 Switching from Mock to AWS
1. Open `src/environments/environment.ts` and set `mock: false`.  
2. Fill in your `apiUrl`, `cognitoUserPoolId`, `cognitoClientId`, and `stripePublicKey`.  
3. Ensure CORS is configured on API Gateway and S3 buckets.

---

## 🖼️ Diagram
[Download PNG Diagram](sandbox:/mnt/data/music-app-architecture.png)
