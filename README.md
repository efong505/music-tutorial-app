# Music Tutorial Web Application – Full Step-by-Step Guide (Standalone Angular + AWS)

**Updated:** 2025-09-02 23:40 UTC  
**Goal:** Build and deploy a music tutorial web app with a **standalone Angular** frontend and a **serverless AWS backend** (API Gateway + Lambda + DynamoDB + S3 + Cognito + Stripe).  
This version includes a **detailed architecture diagram** and **all original code** in the appendices.

---

## 🔭 Architecture (Detailed)


```text
                                   +---------------------+
                                   |    CloudFront       |
                                   |  (Global CDN, SSL)  |
                                   +----------+----------+
                                              |
                                              v
                                   +---------------------+
                                   |  S3 Website Bucket  |
                                   |  Angular Frontend   |
                                   +----------+----------+
                                              |
                       (HTTPS, JWT)           |                         (HLS/Static assets)
                                              |                         +---------------------+
                                              |-----------------------> | S3 Content Bucket   |
                                              |                         | (Videos/Materials)  |
                                              |                         +----------+----------+
                                              |                                    |
                                              |                         +----------v----------+
                                              |                         |   CloudFront (VOD)  |
                                              |                         |   (Video delivery)  |
                                              |                         +---------------------+
                                              |
                                              v
                                   +---------------------+
                                   |   API Gateway       |
                                   | (REST Endpoints)    |
                                   +----------+----------+
                                              |
                                (JWT via Cognito authorizer)
                                              |
                                              v
                             +----------------+----------------+
                             |                                 |
                     +-------v-------+                 +-------v-------+
                     |   Lambda      |                 |    Lambda     |
                     |  (Auth)       |                 |  (Courses)    |
                     +-------+-------+                 +-------+-------+
                             |                                 |
                             |                                 |
               +-------------v-------------+        +---------v-----------+
               |  Cognito User Pool       |        |   DynamoDB Tables    |
               |  (Users, Tokens, Roles)  |        | (users, courses,     |
               +-------------+------------+        |  enrollments)        |
                             |                     +---------+-----------+
                             |                               |
                             |                               |
                             |                               v
                             |                     +---------+-----------+
                             |                     |  Lambda (Payments) |
                             |                     |  (Stripe Checkout) |
                             |                     +---------+-----------+
                             |                               |
                             |                               v
                             |                  +------------+------------+
                             |                  |      Stripe             |
                             |                  | (Checkout, Webhooks)    |
                             |                  +-------------------------+
```

---

## 🧭 How to Use This Guide

Each phase explains **what** you’re doing, **why** it matters, and **exactly** where each file or command goes.  
At the end, see **Appendix A/B** for the **verbatim original code** from your two source files.

Project layout we’ll create:
```
music-tutorial-app/
├── frontend/          # Angular standalone app
├── backend/           # Lambda functions + Serverless config
├── infrastructure/    # Optional infra helper files (Cognito/S3/DynamoDB configs)
└── shared/            # (optional) shared types/interfaces
```

---

# Phase 1 — AWS Infrastructure Setup

### 1.1 Install & Configure AWS CLI
**Why:** You’ll deploy buckets, Lambdas, and distributions from your machine.
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws configure  # enter keys, region (e.g., us-east-1), and output format
```

### 1.2 Create DynamoDB Tables
**Why:** Store users, courses, and enrollments. Save the snippet below as `infrastructure/tables.js` if using scripts, or replicate in IaC/CDK.
[Full code in Appendix A “DynamoDB Tables”.]

### 1.3 Create S3 Buckets
**Why:** One bucket for **frontend hosting** (website), another for **course content** (videos/materials).  
Save as `infrastructure/s3-config.yaml` (optional helper file).  
[Full code in Appendix A “S3 Buckets Configuration”.]

### 1.4 Set Up Cognito User Pool
**Why:** Managed auth (sign-up, sign-in, JWT).  
Save as `infrastructure/cognito-config.js` (optional helper file).  
[Full code in Appendix A “Cognito User Pool Setup”.]

> ✅ Tip: You can do these steps via the AWS Console if you prefer UI over code. Just ensure your **User Pool ID** and **Client ID** are noted for later.

---

# Phase 2 — Backend (Lambda + API Gateway + Stripe)

### 2.1 Initialize Backend Project
```bash
mkdir -p backend/functions/{auth,courses,payments,admin} backend/layers/shared backend/utils
cd backend
npm init -y
npm install aws-sdk stripe uuid bcryptjs jsonwebtoken
npm install --save-dev @types/node @types/aws-lambda typescript serverless serverless-offline
```

Create `tsconfig.json`:
- Use the config from **Appendix B “2.1 Complete Project Setup”**.

### 2.2 Shared Utilities Layer
Create file: `backend/layers/shared/nodejs/utils/database.ts`  
Copy the **DatabaseClient** implementation from **Appendix B “2.2 Shared Utilities Layer”**.

### 2.3 Authentication Lambdas
Create file: `backend/functions/auth/handler.ts`  
Paste code from **Appendix A/B “Authentication Lambda”** (identical in both).  
**What it does:**  
- `signUp`: creates a Cognito user and row in DynamoDB.  
- `signIn`: authenticates and returns tokens.

### 2.4 Courses Lambdas
Create file: `backend/functions/courses/handler.ts`  
Paste code from **Appendix A/B “Course Management Lambda”**.  
**What it does:**  
- `createCourse` (admin-only) — writes to DynamoDB.  
- `uploadContent` — returns an S3 **pre-signed URL** to upload videos.  
- `getCourses` — combines all courses with the current user’s enrollments.

### 2.5 Payments Lambdas (Stripe)
Create file: `backend/functions/payments/handler.ts`  
Paste code from **Appendix A/B “Payment Processing Lambda”**.  
**What it does:**  
- `createCheckoutSession` — creates a Stripe Checkout and redirects the user.  
- `handleWebhook` — on successful payment, enrolls the user (DynamoDB insert).

**Required env vars** (set via Serverless or console):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`  
- `COGNITO_CLIENT_ID`, `AWS_REGION`

### 2.6 Serverless Framework Config
Create `backend/serverless.yml` and paste the content from **Appendix A/B “Deploy Backend with Serverless Framework”**.  
Then deploy:
```bash
cd backend
npx serverless deploy
```

---

# Phase 3 — Angular Frontend (Standalone, No NgModules)

### 3.1 Create Project
```bash
npm install -g @angular/cli
ng new music-tutorial-frontend --standalone --routing --style=scss
cd music-tutorial-frontend
npm install @aws-amplify/auth @aws-amplify/storage aws-amplify @angular/material @angular/cdk @stripe/stripe-js
```

### 3.2 Create Services
- `src/app/core/services/auth.service.ts` → paste code from **Appendix A/B “Authentication Service”**.  
- `src/app/core/services/course.service.ts` → paste code from **Appendix A/B “Course Service”**.  
Update `environment.ts` files with your `apiUrl`, Cognito IDs, and Stripe public key (see **Phase 4.3**).

### 3.3 Create Components
- **Admin**: `src/app/features/admin/admin-dashboard/admin-dashboard.component.ts` → paste from **Appendix A/B**.  
- **Courses**: `src/app/features/courses/course-list/course-list.component.ts` → paste from **Appendix A/B**.

> If Angular CLI generated `.component.ts` files with standalone imports, keep them and replace the class bodies/templates to match.  
> For Material styles, run `ng add @angular/material` if you want theme scaffolding.

### 3.4 Guards
- `src/app/core/guards/auth.guard.ts` → paste from **Appendix A/B**.  
- Ensure **standalone routing** is set up in `app.routes.ts` and that routes use the guards.

### 3.5 HTTP Interceptor
- `src/app/core/interceptors/auth.interceptor.ts` → paste from **Appendix A/B**.  
- Register interceptor in the **standalone** providers (e.g., via `provideHttpClient(withInterceptors([authInterceptor]))` in `main.ts` depending on Angular version).

### 3.6 Run Dev Server
```bash
ng serve
```

> Make sure `apiUrl` points to the deployed API Gateway domain from **Phase 2.6**.

---

# Phase 4 — Deployment

### 4.1 Backend (Serverless)
Deploy or update using:
```bash
cd backend
npx serverless deploy
```

### 4.2 Frontend (S3 + CloudFront)
```bash
cd ../frontend/music-tutorial-frontend
ng build --configuration production

# Create/confirm S3 website bucket
aws s3api create-bucket --bucket music-tutorial-website --region us-east-1
aws s3 website s3://music-tutorial-website/ --index-document index.html --error-document error.html

# Upload
aws s3 sync dist/music-tutorial-frontend/ s3://music-tutorial-website/ --acl public-read

# CloudFront distribution (pointing at the website bucket or S3 static hosting URL)
aws cloudfront create-distribution   --origin-domain-name music-tutorial-website.s3.amazonaws.com   --default-root-object index.html
```

### 4.3 Angular Environment Config
Create or update `src/environments/environment.prod.ts` (from **Appendix A “Environment Configuration”**).  
Make sure `apiUrl`, `cognitoUserPoolId`, `cognitoClientId`, `stripePublicKey`, and `s3BucketUrl` are set correctly.

---

# Phase 5 — Security & Performance

- WAF on API Gateway  
- Rate limiting (API Gateway usage plans)  
- Secrets Manager/Parameter Store for secrets  
- CloudTrail & CloudWatch for logging/alarms  
- Angular lazy loading, CloudFront caching, S3 Transfer Acceleration

See **Appendix A “Security & Optimization”** for the original checklist.

---

# Phase 6 — Testing

Add unit tests for Angular services/components.  
See **Appendix A “Testing Strategy”** for a `CourseService` example.

---

# ✅ Appendices (Full, Verbatim Code)

## Appendix A — Original File: music-tutorial-app-guideOpus4.1.md
Below is the COMPLETE, unedited content of your original file.


# Music Tutorial Web Application with Angular and AWS

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
music-tutorial-app/
├── frontend/          # Angular application
├── backend/           # Lambda functions
├── infrastructure/    # AWS CDK or CloudFormation
└── shared/           # Shared types/interfaces
```

## Phase 1: AWS Infrastructure Setup

### 1.1 Create AWS Account and Configure CLI
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
```

### 1.2 Set Up Core Services

#### DynamoDB Tables
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

#### S3 Buckets Configuration
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

### 1.3 Cognito User Pool Setup
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

## Phase 2: Backend Development (Lambda Functions)

### 2.1 Project Structure
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

### 2.2 Authentication Lambda
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

### 2.3 Course Management Lambda
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

### 2.4 Payment Processing Lambda
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

## Phase 3: Angular Frontend Development

### 3.1 Initialize Angular Project
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

### 3.2 Project Structure
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

### 3.3 Authentication Service
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

### 3.4 Course Service
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

### 3.5 Admin Dashboard Component
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

### 3.6 Course List Component (Student View)
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

### 3.7 Auth Guard
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

### 3.8 HTTP Interceptor
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

## Phase 4: Deployment

### 4.1 Deploy Backend with Serverless Framework
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

### 4.2 Deploy Frontend to S3/CloudFront
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

### 4.3 Environment Configuration
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.your-domain.com',
  cognitoUserPoolId: 'us-east-1_xxxxx',
  cognitoClientId: 'xxxxxxxxxxxxx',
  cognitoRegion: 'us-east-1',
  stripePublicKey: 'pk_live_xxxxx',
  s3BucketUrl: 'https://music-tutorial-content.s3.amazonaws.com'
};
```

## Phase 5: Security & Optimization

### 5.1 Security Best Practices
- Enable AWS WAF on API Gateway
- Implement rate limiting on Lambda functions
- Use AWS Secrets Manager for API keys
- Enable CloudTrail for audit logging
- Implement CORS properly
- Use Parameter Store for configuration

### 5.2 Performance Optimization
- Enable CloudFront caching for static assets
- Implement lazy loading in Angular
- Use DynamoDB Global Secondary Indexes
- Enable Lambda provisioned concurrency
- Implement video streaming with HLS
- Use S3 Transfer Acceleration for uploads

### 5.3 Monitoring Setup
```javascript
// CloudWatch Alarms
const alarms = {
  highErrorRate: {
    MetricName: 'Errors',
    Threshold: 10,
    Period: 300,
    EvaluationPeriods: 2
  },
  highLatency: {
    MetricName: 'Duration',
    Threshold: 3000,
    Period: 300,
    EvaluationPeriods: 2
  }
};
```

## Testing Strategy

### Unit Tests (Angular)
```typescript
// course.service.spec.ts
describe('CourseService', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CourseService]
    });
    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('should fetch courses', () => {
    const mockCourses = [
      { courseId: '1', title: 'Guitar Basics', price: 49.99 }
    ];
    
    service.getCourses().subscribe(courses => {
      expect(courses).toEqual(mockCourses);
    });
    
    const req = httpMock.expectOne(`${environment.apiUrl}/courses`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCourses);
  });
});
```

## Next Steps

1. **Enhanced Features**:
   - Live streaming capabilities
   - Student progress tracking
   - Discussion forums
   - Certificate generation
   - Mobile app with Ionic

2. **Advanced AWS Services**:
   - AWS Elemental MediaConvert for video processing
   - Amazon Personalize for course recommendations
   - AWS Step Functions for complex workflows
   - Amazon SES for email notifications

3. **Scaling Considerations**:
   - Implement API caching with ElastiCache
   - Use Aurora Serverless for relational data
   - Set up multi-region deployment
   - Implement CDN for global content delivery

4. **Business Features**:
   - Subscription models
   - Affiliate program
   - Analytics dashboard
   - Multi-instructor support
   - Course bundling

This architecture provides a scalable, serverless solution that can grow with your music tutorial business while keeping costs minimal during the initial stages.

---

## Appendix B — Original File: music-tutorial-app-guideOpus4.1.part2.md
Below is the COMPLETE, unedited content of your second file.


## Phase 2: Backend Development (Lambda Functions)

### 2.1 Complete Project Setup
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

### 2.2 Shared Utilities Layer
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
music-tutorial-app/
├── frontend/          # Angular application
├── backend/           # Lambda functions
├── infrastructure/    # AWS CDK or CloudFormation
└── shared/           # Shared types/interfaces
```

## Phase 1: AWS Infrastructure Setup

### 1.1 Create AWS Account and Configure CLI
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
```

### 1.2 Set Up Core Services

#### DynamoDB Tables
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

#### S3 Buckets Configuration
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

### 1.3 Cognito User Pool Setup
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

## Phase 2: Backend Development (Lambda Functions)

### 2.1 Project Structure
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

### 2.2 Authentication Lambda
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

### 2.3 Course Management Lambda
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

### 2.4 Payment Processing Lambda
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

## Phase 3: Angular Frontend Development

### 3.1 Initialize Angular Project
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

### 3.2 Project Structure
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

### 3.3 Authentication Service
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

### 3.4 Course Service
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

### 3.5 Admin Dashboard Component
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

### 3.6 Course List Component (Student View)
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

### 3.7 Auth Guard
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

### 3.8 HTTP Interceptor
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

## Phase 4: Deployment

### 4.1 Deploy Backend with Serverless Framework
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

### 4.2 Deploy Frontend to S3/CloudFront
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

### 4.3 Environment Configuration
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.your-domain.com',
  cognitoUserPoolId: 'us-east-1_xxxxx',
  cognitoClientId: 'xxxxxxxxxxxxx',
  cognitoRegion: 'us-east-1',
  stripePublicKey: 'pk_live_xxxxx',
  s3BucketUrl: 'https://music-tutorial-content.s3.amazonaws.com'
};
```

## Phase 5: Security & Optimization

### 5.1 Security Best Practices
- Enable AWS WAF on API Gateway
- Implement rate limiting on Lambda functions
- Use AWS Secrets Manager for API keys
- Enable CloudTrail for audit logging
- Implement CORS properly
- Use Parameter Store for configuration

### 5.2 Performance Optimization
- Enable CloudFront caching for static assets
- Implement lazy loading in Angular
- Use DynamoDB Global Secondary Indexes
- Enable Lambda provisioned concurrency
- Implement video streaming with HLS
- Use S3 Transfer Acceleration for uploads

### 5.3 Monitoring Setup
```javascript
// CloudWatch Alarms
const alarms = {
  highErrorRate: {
    MetricName: 'Errors',
    Threshold: 10,
    Period: 300,
    EvaluationPeriods: 2
  },
  highLatency: {
    MetricName: 'Duration',
    Threshold: 3000,
    Period: 300,
    EvaluationPeriods: 2
  }
};
```

## Testing Strategy

### Unit Tests (Angular)
```typescript
// course.service.spec.ts
describe('CourseService', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CourseService]
    });
    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('should fetch courses', () => {
    const mockCourses = [
      { courseId: '1', title: 'Guitar Basics', price: 49.99 }
    ];
    
    service.getCourses().subscribe(courses => {
      expect(courses).toEqual(mockCourses);
    });
    
    const req = httpMock.expectOne(`${environment.apiUrl}/courses`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCourses);
  });
});
```

## Next Steps

1. **Enhanced Features**:
   - Live streaming capabilities
   - Student progress tracking
   - Discussion forums
   - Certificate generation
   - Mobile app with Ionic

2. **Advanced AWS Services**:
   - AWS Elemental MediaConvert for video processing
   - Amazon Personalize for course recommendations
   - AWS Step Functions for complex workflows
   - Amazon SES for email notifications

3. **Scaling Considerations**:
   - Implement API caching with ElastiCache
   - Use Aurora Serverless for relational data
   - Set up multi-region deployment
   - Implement CDN for global content delivery

4. **Business Features**:
   - Subscription models
   - Affiliate program
   - Analytics dashboard
   - Multi-instructor support
   - Course bundling

This architecture provides a scalable, serverless solution that can grow with your music tutorial business while keeping costs minimal during the initial stages.

