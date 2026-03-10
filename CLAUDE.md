# CLAUDE.md — RestoreAI: Insurance Restoration Photo Analysis Platform

## Project Identity
**Name:** RestoreAI
**Purpose:** AI-powered insurance contents inventory platform. Photos → AI analysis → priced inventory → Xactimate-compatible reports.
**Stack:** React 18 + Vite + Tailwind (frontend), Node.js + Express + Prisma (backend), Supabase PostgreSQL (DB), Google Cloud Storage (photos), n8n Cloud (workflow automation)

## Repository Structure
```
/
├── backend/
│   ├── prisma/schema.prisma          # Source of truth for all DB models
│   ├── src/
│   │   ├── routes/                   # auth, projects, folders, folderPhotos, photos, analysis, webhooks, inventory, reports
│   │   ├── services/                 # analysisService, authService, folderService, photoService, projectService, inventoryService, reportService
│   │   ├── middleware/               # auth.ts (JWT), errorHandler.ts, validate.ts (Zod)
│   │   └── lib/                      # config.ts, prisma.ts, storage.ts, schemas.ts, errors.ts
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/                      # Typed Axios functions: auth, projects, folders, photos, analysis, inventory
│   │   ├── components/               # UI components organized by feature
│   │   │   ├── analysis/             # AnalysisButton, AnalysisConfirmDialog, AnalysisProgress
│   │   │   ├── inventory/            # InventoryTable, ItemEditDialog, ItemRow (TO CREATE)
│   │   │   └── ui/                   # Button, Input (base primitives)
│   │   ├── hooks/                    # React Query hooks matching each api/ file
│   │   ├── pages/                    # LoginPage, RegisterPage, DashboardPage, ProjectPage, AnalysisResultsPage
│   │   ├── stores/                   # Zustand: authStore
│   │   └── lib/                      # utils.ts (cn helper), constants.ts (ROOM_TYPES)
│   └── .env                          # VITE_API_URL
├── shared/                           # Shared TS types used by both frontend and backend
├── .claude/                          # Claude Code config (this directory)
└── CLAUDE.md                         # This file
```

## Architecture Rules
- **Path alias:** `@/` → `src/` in frontend (vite.config.ts + tsconfig.json)
- **Auth:** JWT access (15m) + refresh (7d) tokens. Zustand persist for storage. Axios interceptors auto-attach and auto-refresh.
- **State:** React Query for server data, Zustand ONLY for auth
- **Errors:** AppError class hierarchy in backend → `{ error: { code, message, details? } }` JSON
- **Photos:** GCS signed URLs (1hr display, 7d for n8n). Sharp thumbnails at 400px.
- **Prisma:** camelCase fields with `@map("snake_case")` for DB columns
- **Money:** Numbers (not strings), format with `Intl.NumberFormat` on display only
- **Components:** Functional with hooks. Use `cn()` (clsx+twMerge) for conditional classes.

## n8n Integration (DO NOT MODIFY FROM CODE — changes happen in n8n UI only)
- **Webhook:** POST `https://dloch15.app.n8n.cloud/webhook/analysis-trigger` (X-API-Key header)
- **Main Workflow:** `E4Pa2cWJgl4wO8s5`
- **Price Research Sub-workflow:** `u39XiRoo9AYCFt38`
- **Trigger mode:** `url_based` — sends `folders[]` with `photos[]` containing signed download URLs
- **Callback:** n8n POSTs to `{N8N_CALLBACK_BASE_URL}/api/webhooks/n8n/analysis-complete` with HMAC sig
- **Callback payload now includes:** `items[]` array with full per-item data (catselCode, brand, model, rcv, acv, etc.)

## Data Flow
```
User uploads photos → GCS + Photo DB records
  → "Send to Analysis" creates AnalysisJob → POSTs to n8n webhook
    → n8n: GPT-4o analysis → conditional Claude verification → AI Agent price research
    → Depreciation calc → CatSel code mapping → Google Sheets
  → n8n callback with items[] → backend creates InventoryItem records
    → Frontend polls job → displays InventoryTable with edit/export
```

## Key Environment Variables
```bash
# Backend
DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
GCS_PROJECT_ID=restore-item-inventory
GCS_BUCKET_NAME=restoration-app-photos
N8N_WEBHOOK_URL=https://dloch15.app.n8n.cloud/webhook/analysis-trigger
N8N_CALLBACK_SECRET=<hmac-secret>
N8N_CALLBACK_BASE_URL=<ngrok-url-for-dev>
# Frontend
VITE_API_URL=http://localhost:3001
```

## DO NOT
- Modify n8n workflow JSON from code — all n8n changes happen in the n8n editor UI
- Change HMAC signature verification without updating n8n's Prepare Callback node
- Change GCS bucket paths without updating n8n's photo download URLs
- Use localStorage/sessionStorage in any component — use React state or Zustand
- Create class components — functional only