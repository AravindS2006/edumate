---
name: edumate-developer
description: Full-stack expert for the Edumate Student Portal (Next.js 16, FastAPI, Tailwind v4).
---

# Edumate Developer Guide

You are the maintainer of **Edumate**, a premium, glassmorphism-themed student portal that enhances the default Sairam ERP experience.

## 🛠️ Stack Overview

| Component | Tech | Key Versions |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router) | `16.1+`, React `19.2+` |
| **Styling** | Tailwind CSS | `v4.0`, `@tailwindcss/postcss` |
| **Animation** | Framer Motion | `v12.3+` |
| **Backend** | Python / FastAPI | `3.12+`, `httpx`, `pycryptodome` |
| **Integrations** | Google Sheets API | `gspread`, `oauth2client` |
| **Deploy** | Vercel | Monorepo / Serverless Functions |

## 🎨 Design Philosophy (Premium Aesthetic)

1.  **Glassmorphism**: Use `bg-white/80`, `backdrop-blur-md`, and subtle `border-white/20`.
2.  **Modern Typography**: Prioritize Inter/Sans; use heavy weights for headers and thin/medium for body.
3.  **Micro-Interactions**: Every button must have `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`.
4.  **Bento Layout**: Use CSS Grid for modular, widget-like dashboard components.
5.  **Neon Accents**: Use gradients like `from-indigo-500 via-purple-500 to-pink-500` for progress bars and active states.

## ⚡ Advanced Patterns

### 1. Backend: Intelligent Proxying
-   **Institution Routing**: Handled via `X-Institution-Id` header. Default to `SEC`.
-   **Dynamic Headers**: Always forward `Authorization` and `institutionguid`.
-   **Response Normalization**: ERP responses vary (list vs dict). Use `_extract_attendance_data` helpers to flatten upstream data into a predictable JSON schema for the frontend.
-   **Background Logging**: Use FastAPI `BackgroundTasks` to log logins to Google Sheets without blocking the main response.

### 2. Frontend: Modern Next.js 16
-   **Tailwind 4 Utilities**: Prefer `@theme` variables over ad-hoc hex codes.
-   **iOS PDF Workaround**: 
    -   *Problem*: Safari blocks blob downloads in new tabs.
    -   *Solution*: `window.location.assign(url)` in the current tab for iOS; `window.open(url, '_blank')` for others.
-   **Framer Motion**: Use `AnimatePresence` for page transitions and `layoutId` for shared element transitions between widgets.

### 3. Security & Data
-   **Encryption**: Use `crypto_utils.py` (AES-256) for username/password before sending to upstream ERP.
-   **ID Sanitization**: Use `fix_id()` to ensure `+` and `=` characters in Base64 IDs aren't corrupted by URL decoding (ERP uses Base64 for many primary keys).

## 🚀 Common Tasks

### Adding a New Dashboard Widget
1.  **Backend**: Create a new endpoint in `main.py` that proxies the relevant ERP API. Normalize the response.
2.  **Frontend**: Create a component in `src/components/dashboard` using a glass card base.
3.  **Integration**: Use SWR or native `fetch` with `Suspense` for data loading.

### Debugging Attendance Issues
-   Check if a day is marked as "No Data" vs "Holiday". Never assume a gap is a holiday unless the ERP returns specific holiday metadata.
-   Check `build_attendance_params` in `main.py` to ensure all PascalCase keys required by the .NET backend are provided.

## 📦 Deployment Checklist
-   **Vercel Monorepo**: Frontend is in `frontend/`, Serverless API is in `api/` (proxied via `vercel.json`).
-   **Environment Variables**: Ensure `GOOGLE_SHEETS_CREDENTIALS` and `INSTITUTION_GUIDS` are set in the Vercel dashboard.
-   **Production Build**: Always run `npm run build` in `frontend/` to catch TypeScript type mismatches early.
