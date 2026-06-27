# FlowMind AI — GCP Cloud Run Deployment Guide

This guide provides the final, step-by-step commands to build and deploy your secured FlowMind AI container to **Google Cloud Run**.

---

## 🔒 Runtime Environment Injection Design
By implementing **Runtime Config Injection**, you do not need your `.env` file during the Docker build stage. The container is environment-agnostic. 

To deploy to production, you simply supply the environment variables to **Google Cloud Run** at runtime.

---

## 🚀 Deployment Steps

### Step 1: Install & Initialize Google Cloud SDK
1. Make sure you have the [Google Cloud CLI installed](https://cloud.google.com/sdk/docs/install).
2. Authenticate and select your target GCP Project ID:
   ```bash
   gcloud auth login
   gcloud init
   ```

### Step 2: Enable GCP APIs
Enable the Artifact Registry and Cloud Run services in your project:
```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com
```

### Step 3: Create Artifact Registry Repository
Create a repository named `flowmind-repo` to host your Docker image (e.g., in `us-central1`):
```bash
gcloud artifacts repositories create flowmind-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="FlowMind AI Container Repository"
```

---

### Step 4: Build the Docker Image on GCP (Recommended ⚡)
Run this command from your project root. Google Cloud Build will package and compile your code in the cloud safely (without needing any local secrets):
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/flowmind-repo/flowmind-ai:latest
```
*(Replace `YOUR_PROJECT_ID` with your actual GCP Project ID).*

---

### Step 5: Deploy to Google Cloud Run
Deploy the built container image to Cloud Run. Pass all configuration variables using the `--set-env-vars` flag:

```bash
gcloud run deploy flowmind-ai \
    --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/flowmind-repo/flowmind-ai:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars GEMINI_API_KEY="your-gemini-key",VITE_FIREBASE_API_KEY="your-firebase-api-key",VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain",VITE_FIREBASE_PROJECT_ID="your-project-id",VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket",VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id",VITE_FIREBASE_APP_ID="your-app-id",VITE_FIRESTORE_DATABASE_ID="your-database-id",NODE_ENV="production"
```
*(Replace `YOUR_PROJECT_ID` and env values with your actual values from `.env`).*

Once finished, Cloud Run will print the public service URL (e.g., `https://flowmind-ai-xxxxxx.run.app`).

---

## 🌐 Post-Deployment Checklist

1. **Firebase Authorized Domains**:
   - Copy your Cloud Run URL (`https://flowmind-ai-xxxxxx.run.app`).
   - Go to the **Firebase Console > Authentication > Settings > Authorized Domains**.
   - Add your Cloud Run domain to the list. This ensures Google OAuth sign-in functions correctly on your live deployment.

2. **Secret Manager (Optional but Recommended 🔒)**:
   - For a production-ready setup, avoid passing your `GEMINI_API_KEY` in plain text during deployment.
   - Instead, store it in GCP **Secret Manager** and link it to your Cloud Run environment variables.
