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

- 🤖 **Model Context Protocol (MCP) Server**:
  - Exposes an official, serverless-ready `/api/mcp` endpoint powered by `@modelcontextprotocol/sdk`.
  - Enables AI agents in Claude Desktop, Cursor, and Raycast to query tasks, create subtask checklists, and move Kanban columns over HTTPS.
- ⌨️ **Command Palette (`Ctrl+K` / `Cmd+K`) & Keyboard Shortcuts**:
  - Global command menu to search across tasks, jump instantly to any thread, trigger CSV/JSON exports, or open archived items without touching the mouse.
  - Quick-capture shortcut (<kbd>N</kbd> / <kbd>C</kbd>) from anywhere in the app.
- ✅ **Markdown Subtasks & Visual Checklist Progress**:
  - Write standard GitHub-flavored Markdown checkboxes (`- [ ]`, `- [x]`) in task descriptions.
  - Real-time animated progress bar (`✓ 2/4 Subtasks (50%)`) directly on Kanban cards and interactive checkbox toggles in the Task Modal.
- 📱 **Progressive Web App (PWA) & 1-Click Install**:
  - Full PWA support with native `manifest.webmanifest`, standalone mode, and dynamic icon assets.
  - 1-click **Install App** button for Android/Desktop Chrome and interactive iOS Safari step-by-step guide.
- 💾 **Zero-Latency Data Backup & Migration Hub (JSON & CSV)**:
  - **Thread CSV Export**: Spreadsheet-ready `.csv` with Titles, Descriptions, Status Names, Priorities, Due Dates, and Reminder Frequencies using pure TypeScript RFC-4180 parsing/serialization.
  - **Thread & Full Workspace JSON Backup**: Lossless export of threads, tasks, custom tags, and full movement histories.
  - **Smart Task Import**: Drag-and-drop `.csv` or `.json` file dropzone with live preview table and automated status tag mapping.
  - Zero-latency client-side downloads via in-memory `Blob` and `URL.createObjectURL`, eliminating serverless disk wear and bandwidth overhead.
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
  - Adaptive modals, overflow-controlled card labels, and touch-friendly controls.
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

## 🐳 1-Command Self-Hosting (Docker & Docker Compose)

Deploy TaskFlow on any VPS, HomeLab, Raspberry Pi, Unraid, or Synology server:

```bash
# 1. Clone the repository
git clone https://github.com/roushan-kr/mytask.git
cd mytask

# 2. Run with Docker Compose
docker compose up -d
```

TaskFlow and MongoDB will automatically spin up with persistent volumes (`mongo-data`), health checks, and container auto-restart at [http://localhost:3000](http://localhost:3000).

---

## 🤖 Connect Your AI via Model Context Protocol (MCP)

TaskFlow exposes an official, serverless-ready **Model Context Protocol (MCP)** endpoint at `/api/mcp`. You can manage your tasks, create checklist subtasks, and move Kanban columns directly from **Claude Desktop, Cursor, Antigravity, Raycast, or custom AI agents**.

### 🔌 Connecting Claude Desktop / Cursor

Add the following to your `claude_desktop_config.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "taskflow": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer your_mcp_api_key_or_auth_secret"
      }
    }
  }
}
```

### 🛠️ Available AI Tools

| Tool | Description |
| :--- | :--- |
| `list_threads` | List all workspaces and custom Kanban status columns. |
| `get_tasks` | Search & filter tasks by keyword, priority, column, or due date. |
| `create_task` | Create a task with title, priority, due date, and markdown checklists (`- [ ]`). |
| `move_task_status` | Shift task to a new status (e.g. `move_task_status(taskId, "done")`). |
| `update_task` | Edit title, notes, priority, or reminder intervals. |
| `archive_task` | Move a task to the archive without losing history. |
| `get_workspace_stats` | Instant summary of pending, completed, urgent, and overdue tasks. |

---

## ⌨️ Keyboard Shortcuts & Power-User Navigation

| Shortcut | Action |
| :--- | :--- |
| <kbd>⌘ K</kbd> or <kbd>Ctrl K</kbd> | Open Command Palette (Jump to threads, actions, tasks) |
| <kbd>N</kbd> or <kbd>C</kbd> | Quick Create New Task (when not typing in an input) |
| <kbd>?</kbd> | Open Command Palette Shortcuts Help |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Navigate Palette Results |
| <kbd>↵ Enter</kbd> | Execute Selected Command |
| <kbd>ESC</kbd> | Close Modal / Palette |

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
