# 🚀 TaskFlow Pro (mytask) — Dynamic Thread & Kanban Task Manager

A high-performance, full-stack Task Management & Kanban workspace built with **Next.js 16 (App Router)**, **Mongoose / MongoDB**, and **dnd-kit**. Features thread-scoped task collections, dynamic custom statuses, O(1) fractional float drag-and-drop, automated Web Push notification reminders via serverless cron & GitHub Actions, archived task management with complete history purging, deep-linking URL routing, and a mobile-optimized glassmorphic UI.

---

## ⚡ 1-Click Deploy to Vercel

Deploy your own instance of TaskFlow Pro to Vercel in seconds:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Froushan-kr%2Fmytask&env=AUTH_EMAIL,AUTH_PASSWORD,AUTH_SECRET,MONGODB_URI,NEXT_PUBLIC_VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,VAPID_SUBJECT,CRON_SECRET&envDescription=Required%20environment%20credentials%20for%20authentication,%20MongoDB,%20and%20Web%20Push%20notifications&envLink=https%3A%2F%2Fgithub.com%2Froushan-kr%2Fmytask%23environment-variables)

---

## 📸 Workspace Showcase

![TaskFlow Pro Dashboard](public/dashboard-preview.png)

---

## ✨ Key Features

- 🧵 **Thread-Based Workspace**: Organize tasks across isolated threads (e.g. `Main Project Thread`, `Sprint 24`, `Mobile App`) from the left sidebar.
- 🏷️ **Dynamic Thread-Level Custom Tags (Kanban Columns)**: Each thread defines its own status workflow (`Todo`, `Done`, `Schedule Latter` or custom statuses) with color customization, renaming, and safe task migration upon deletion.
- 🔔 **Automated Web Push Notifications**:
  - Configure custom reminder frequencies (e.g., every 12h, 24h, 48h, 72h, or any custom interval).
  - VAPID web-push infrastructure with automatic dead-endpoint pruning (HTTP 410/404).
  - High-speed serverless cron endpoint (`/api/cron/todos`) using MongoDB `$expr` arithmetic (`< 30ms` execution).
  - Automated hourly GitHub Action workflow (`.github/workflows/todo-notifications.yml`) with manual trigger.
- 📦 **Archived Tasks & Complete History Purging**:
  - Dedicated archived task manager to search, filter, and inspect task timelines.
  - One-click restore back to the original Kanban column.
  - Permanent delete (`findByIdAndDelete`) that atomically purges the task and its entire embedded history from MongoDB.
- 🎯 **Fractional Float Ordering**: Cards maintain order using fractional midpoints `(prev + next) / 2`, eliminating O(N) bulk updates during reordering, with automatic sequence rebalancing.
- ⚡ **Converged Drag-and-Drop & Fast Shift**: Move tasks seamlessly via drag-and-drop or with the 1-click status dropdown selector. Both trigger the same unified mutation action.
- 🕒 **Bounded 100-Event Audit Trail**: Every creation, movement, and priority change logs timestamps (`{ action, fromTag, toTag, timestamp, details }`). Capped at 100 events per task to keep document sizes `< 20 KB` (well below MongoDB's 16 MB limit).
- 🔗 **Deep-Linking URL Routing**: Synchronizes `/?thread=<thread_id>` with browser history and back/forward navigation. Server Actions use fine-grained thread-scoped cache revalidation.
- 📱 **Mobile-Optimized Experience**:
  - Slide-out navigation drawer with smooth backdrop blur overlay.
  - CSS Scroll Snap columns (`snap-x snap-mandatory`).
  - Adaptive modals and touch-friendly controls.
- 🛡️ **Constant-Time ENV Authentication**: Single-admin login verified in constant time (`crypto.timingSafeEqual`) with edge-compatible signed session cookies (`jose`).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Edge Proxy)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Push Notifications**: [web-push](https://www.npmjs.com/package/web-push) & Service Workers
- **Drag & Drop**: [@dnd-kit/core](https://dndkit.com/) & `@dnd-kit/sortable`
- **Validation**: [Zod](https://zod.dev/)
- **Authentication**: `jose` (JWT) & `crypto.timingSafeEqual`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root of your project:

```env
# Single Admin Credentials (TimingSafe Checked)
AUTH_EMAIL="admin@taskflow.local"
AUTH_PASSWORD="admin_password_123"
AUTH_SECRET="taskflow_super_secret_jwt_key_2026_min_32_characters!"

# MongoDB Database URI (Local MongoDB or Atlas)
MONGODB_URI="mongodb://127.0.0.1:27017/taskflow"

# Web Push VAPID Keys (Generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your_public_vapid_key"
VAPID_PRIVATE_KEY="your_private_vapid_key"
VAPID_SUBJECT="mailto:admin@taskflow.local"

# Cron Endpoint Secret (Used by GitHub Action and /api/cron/todos)
CRON_SECRET="your_secure_cron_secret"
```

---

## 🔔 Setting Up Web Push & Scheduled Cron

### 1. Generate VAPID Keys
```bash
npx web-push generate-vapid-keys
```
Copy the Public and Private keys into your `.env.local` and Vercel environment variables.

### 2. Configure GitHub Action Secrets
In your GitHub repository settings under **Secrets and variables > Actions**, add:
- `APP_URL`: Your deployed application URL (e.g. `https://mytask.fossptu.dev`)
- `CRON_SECRET`: The matching secret configured in your application `.env.local`

The workflow (`.github/workflows/todo-notifications.yml`) will automatically ping `/api/cron/todos` every hour.

---

## 🚀 Getting Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/roushan-kr/mytask.git
cd mytask
```

### 2. Install dependencies
```bash
pnpm install
# or npm install / yarn install / bun install
```

### 3. Run the development server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and log in with the credentials set in `.env.local`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
