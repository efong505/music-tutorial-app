# Music Tutorial Frontend (Angular 17)

This is a **ready-to-clone Angular starter project** for the Music Tutorial App.  
It includes:
- ✅ Standalone Angular (no NgModules)
- ✅ Mock backend mode (enabled by default)
- ✅ Routing between `/courses` and `/admin`
- ✅ Auth guard + HTTP interceptor
- ✅ Ready to connect to AWS backend later

---

## 🚀 Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run the dev server (mock mode enabled)
ng serve
```

Open your browser at **http://localhost:4200**

- `http://localhost:4200/courses` → Course List (student view)
- `http://localhost:4200/admin` → Admin Dashboard (guarded, mock-allowed)

---

## 🔁 Switching to AWS Mode

1. Open `src/environments/environment.ts`
2. Set `mock: false` and update `apiUrl` to your deployed backend API Gateway URL.
3. Rebuild and serve:
   ```bash
   ng build --configuration production
   ```

---

## 📂 Project Structure

```
src/
  app/
    core/
      services/        # auth + course services
      guards/          # auth.guard.ts
      interceptors/    # auth.interceptor.ts
    features/
      admin/           # admin dashboard component
      courses/         # course list component
    app.routes.ts      # routes config
  environments/        # dev + prod environments
  main.ts              # app bootstrap
angular.json
package.json
tsconfig.json
```

---

## ✅ Next Steps
- Integrate with AWS Cognito for real authentication
- Connect CourseService to DynamoDB via API Gateway + Lambda
- Secure `/admin` route with Cognito groups/roles
- Deploy frontend to S3 + CloudFront

---

Enjoy building your **Music Tutorial App** 🎸🥁🎹
