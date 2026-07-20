# Deployment & Management Guide

This document explains step by step how to deploy your licensed Electron application, manage the database, and distribute it to your users.

## 1. How to create the Supabase tables

1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Once your project is ready, navigate to the **SQL Editor** in the left sidebar.
3. Click "New Query" and copy the entire content of `database/schema.sql` from your project directory.
4. Paste the SQL code into the editor and click **Run**. This will create your `users` table and the necessary triggers for `updated_at`.

## 2. Where to place environment variables

You have two sets of environment variables: one for your Vercel backend API and one for your local Admin Scripts.

**For Vercel (Backend API):**
You will add these directly into the Vercel dashboard later (Step 4), but keep them handy:
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase `service_role` key (found in Project Settings > API). **DO NOT** use the anon/public key.
- `JWT_SECRET`: A long, random string you generate (e.g., using a password generator) used to sign user tokens.
- `ADMIN_SECRET`: A secure string used to protect admin endpoints (like resetting the machine ID).

**For Admin Scripts (Local Machine):**
1. Navigate to the `scripts/` folder in your project.
2. Create a file named `.env`.
3. Add the following lines:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

## 3. How to push the project to GitHub

1. Open a terminal in your main project directory (`f:\Svg-Convertor`).
2. Initialize Git if you haven't already:
   ```bash
   git init
   ```
3. Add your new files:
   ```bash
   git add .
   ```
4. Commit your changes:
   ```bash
   git commit -m "Added licensing, Vercel API, and Admin Scripts"
   ```
5. Go to GitHub and create a new private repository.
6. Link your local repo to GitHub and push:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

## 4. How to deploy the API on Vercel

1. Go to [Vercel](https://vercel.com/) and log in with your GitHub account.
2. Click **Add New** > **Project**.
3. Import the repository you just pushed to GitHub.
4. Leave the Framework Preset as `Other`.
5. Open the **Environment Variables** section and add the four variables mentioned in Step 2 (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `ADMIN_SECRET`).
6. Click **Deploy**. Vercel will automatically detect the `api/` folder and deploy your serverless functions.
7. Once deployed, copy the **Domain URL** Vercel gives you (e.g., `https://your-project.vercel.app`).

## 5. How to connect Electron to the deployed API

1. Go to your `frontend/` folder and create (or edit) a file named `.env`.
2. Add the Vercel API URL:
   ```env
   VITE_API_URL=https://your-project.vercel.app/api
   ```
   *Note: Ensure there is no trailing slash.*
3. When Vite builds the frontend, it will embed this URL, and your Electron app will use it to communicate with Vercel for login and verification.

## 6. How to build the final Electron installer

1. Ensure your frontend `.env` is correctly pointing to your live Vercel URL.
2. Open a terminal in your project root (`f:\Svg-Convertor`).
3. Run the build script:
   ```bash
   npm run build
   ```
   *This command runs the Vite build for the frontend and then uses `electron-builder` to package your `Setup.exe`.*
4. You will find your installer inside the `dist/` folder. Send this `Setup.exe` to your customers.

## 7. How to create new users

You manage users manually using the Node.js scripts provided.
1. Open a terminal in the `scripts/` folder.
2. Make sure you have run `npm install` inside the `scripts/` folder at least once to install dependencies.
3. Run the create user script:
   ```bash
   node create-user.js customer@email.com securePassword123
   ```
4. Provide the email and password to your customer.

## 8. How to disable a customer remotely

If a user subscription expires, or you want to block their access:
1. Open a terminal in the `scripts/` folder.
2. Run the disable script:
   ```bash
   node disable-user.js customer@email.com
   ```
3. The next time the customer opens the app, the session check will fail, and they will be locked out immediately.

## 9. How to reset a customer's machine

If a customer buys a new computer or formats their PC, their `machine_id` will change, and they will be blocked from logging in.
1. Open a terminal in the `scripts/` folder.
2. Run the reset machine script:
   ```bash
   node reset-machine.js customer@email.com
   ```
3. The customer can now log in on their new computer. The app will lock to the new machine automatically.

## 10. How to update the application in the future

1. Make changes to your local project (e.g., update the React frontend or Electron main code).
2. If you changed the Vercel backend (`api/` folder), simply push your code to GitHub. Vercel will automatically redeploy the backend in seconds.
3. If you changed the Electron app or Frontend UI, you must rebuild the installer:
   ```bash
   npm run build
   ```
4. Distribute the new `Setup.exe` to your users. They can run it to upgrade their existing installation.
