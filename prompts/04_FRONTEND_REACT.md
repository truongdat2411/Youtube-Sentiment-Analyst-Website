# PROMPT — Frontend React (Vite + TS) UI

Build UI:
- Input YouTube URL
- Select max comments (50/100/200/500)
- Button Analyze
- Loading + error
- List/table comments:
  - label badge (NEG/NEU/POS)
  - confidence/probs
  - text
- Filter: All / NEG / NEU / POS
- Export CSV

Files:
frontend/src/api.ts
frontend/src/App.tsx
frontend/src/components/CommentTable.tsx
frontend/src/components/Filters.tsx
frontend/src/components/ExportCSV.tsx

API:
POST http://localhost:8000/api/analyze
