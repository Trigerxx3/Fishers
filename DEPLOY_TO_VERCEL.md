# Deploying JSK Fishers to Vercel with Supabase 🚀

This application is built for seamless deployment using:
- **Database**: **Supabase** (Cloud PostgreSQL)
- **Frontend & API**: **Vercel** (Vite React + Express Serverless Functions)

---

## 🟢 Step 1: Set Up Supabase (1-Click SQL Script)

1. Open your project on **[supabase.com](https://supabase.com)**.
2. In the left menu, click **SQL Editor** (`>_`).
3. Click **"New Query"**.
4. Open the file [`supabase_setup.sql`](./supabase_setup.sql) in this repository, copy all contents, paste it into the query box, and click **RUN**.
5. You will see:
   ```text
   ✅ JSK Fishers Supabase Database Initialized Successfully!
   ```
   *(This automatically creates all 9 tables, indexes, triggers, initial fish varieties, default settings, and `admin` / `staff` accounts!)*

---

## 🔑 Step 2: Get your Supabase Connection String

1. In Supabase, go to **Project Settings** (gear icon at the bottom left) → **Database**.
2. Scroll to the **Connection string** section.
3. Select the **URI** tab.
4. Choose either:
   - **Transaction pooler (Port 65432)** *(Recommended for Vercel)*:
     `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:65432/postgres`
   - Or **Session / Direct (Port 5432)**:
     `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
5. Replace `[YOUR-PASSWORD]` with your actual Supabase database password.
   *(Note: If your password has special characters like `@` or `#`, URL-encode them, e.g. `@` becomes `%40`)*.

---

## ⚡ Step 3: Deploy to Vercel

### Method A: Deploy via GitHub (Recommended)

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy JSK Fishers with Supabase"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. Go to **[vercel.com](https://vercel.com)** and click **"Add New Project"**.
3. Import your GitHub repository.
4. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | *(Your Supabase connection string from Step 2)* |
   | `JWT_SECRET` | `fishmarket_super_secret_jwt_key_2026` |
   | `NODE_ENV` | `production` |
5. Click **Deploy**.

---

### Method B: Deploy using Vercel CLI

In PowerShell inside this project folder (`d:\fish`):
```powershell
npx vercel
```
1. Follow the terminal prompts to log in and link your project.
2. Once the preview link is created, go to the Vercel Dashboard for this project → **Settings → Environment Variables**, and add `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV`.
3. Deploy to production:
   ```powershell
   npx vercel --prod
   ```

---

## 🐟 Default Login Accounts
- **Admin**: `admin` / `admin123`
- **Staff**: `staff` / `staff123`
