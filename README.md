# DuFast EduAi — AI Assessment Generator

A **standalone** project for **DuFast EduAi**. It contains only the **AI Assessments** feature — nothing else. Upload a course document, and the AI builds a quiz, exam, exercise or homework with an answer key and explanations, ready to preview, save to your library, or download as a student paper (PDF), marking guide (PDF), or CSV.

> This is its own project with its own blue brand color (`#078ECE`), the **DuFast EduAi** logo (in `frontend/public/dufast-eduai.png`) and a public landing page (no forced login redirect).

---

## What's inside

| Piece | File |
|---|---|
| AI engine (text extraction, prompts, Gemini → OpenAI → offline fallback) | `backend/utils/ai.js` |
| PDF builder (paper + answer key + marking guide) | `backend/utils/pdf.js` |
| API routes (upload / generate / save / list / pdf / delete) | `backend/routes/assessmentRoutes.js` |
| Auth (JWT login, staff access) | `backend/routes/authRoutes.js`, `backend/middleware/auth.js` |
| Data models | `backend/models/CourseDocument.js`, `backend/models/Assessment.js`, `backend/models/User.js` |
| React page (the full AI tool UI) | `frontend/src/pages/staff/AIExam.jsx` |

---

## How it works

```
 Upload a course document (PDF / DOCX / TXT)
        │
        ▼
 Text is extracted (backend/utils/ai.js)
        │
        ▼
 Pick: type, number of questions, subject, class, title
        │
        ▼
 AI prompt is built from the document text
        │
        ▼
 Provider pipeline:  Gemini → OpenAI-compatible → Offline fallback
        │
        ▼
 Structured JSON: title + questions
        │
        ▼
 Preview → Save to library → Download PDF / Marking guide / CSV
```

Question types:
- **Quiz & Exam** → mostly 4-option multiple choice + a few short answers (Rwandan Section A style).
- **Exercise & Homework** → mostly short-answer / structured questions with a model `answer`.
- **Diagram questions** → for Geography, Biology, Physics, Chemistry (prints an empty draw box).
- **Graph questions** → for data-heavy subjects (prints labelled graph axes).

Every question ships with an **answer** and an **explanation**. The PDF includes a separate **ANSWER KEY** page (teacher copy) plus a **MARKING GUIDE** option.

The class picker covers **every level of the school**:

| Level | Classes |
|---|---|
| Nursery | Nursery |
| Primary | P1 – P6 |
| Ordinary Level | S1 – S4 |
| Advanced Level | S5, S5 MEG, S5 HEG, S5 TVT, S6, S6 MEG, S6 HEG, S6 TVT |

---

## Setup

### 1. Requirements
- Node.js 18+
- MongoDB (local or Atlas / MongoDB Cloud)

### 2. Configure the backend
Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Purpose | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/ai-assessment-tool` |
| `JWT_SECRET` | Token signing secret | a long random string |
| `GEMINI_API_KEY` | Enable Google Gemini generation | `AIza...` |
| `GEMINI_MODEL` | Gemini model name (optional) | `gemini-flash-latest` |
| `OPENAI_API_KEY` / `AI_API_KEY` | Enable OpenAI-compatible generation | `sk-...` |
| `AI_BASE_URL` | OpenAI-compatible base URL (optional) | `https://api.openai.com/v1` |
| `AI_MODEL` | Model name (optional) | `gpt-4o-mini` |

If **no AI key is set**, generation automatically falls back to the **offline generator**, which builds useful questions from the document text (great for testing).

### 3. Run
```bash
cd backend
npm install
npm run dev        # http://localhost:5000  (auto-seeds demo accounts + classes)

# in a second terminal
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Open **http://localhost:5173** and you'll land on a public **welcome page**. Click **Sign in** (or **Start generating assessments**) to reach the tool, then sign in with:

| Role | Username | Password |
|---|---|---|
| Teacher | `teacher` | `teacher123` |
| Leader | `leader` | `leader123` |

Teachers see their own assessments in the library; leaders/admins see all.

### Production build (single server)
```bash
npm run build     # installs deps + builds frontend/dist
npm start         # serves the React app + /api from backend/server.js
```

---

## API reference

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Sign in (JWT) |
| POST | `/api/assessments/upload` | Staff | Upload PDF/DOCX/TXT, extract text |
| POST | `/api/assessments/generate` | Staff | Generate questions from a document |
| POST | `/api/assessments` | Staff | Save an assessment to the library |
| GET | `/api/assessments` | Staff | List assessments (own, or all for leader/admin) |
| GET | `/api/assessments/:id` | Staff | View one assessment (access-checked) |
| POST | `/api/assessments/pdf` | Staff | Build a PDF (paper or marking guide) |
| DELETE | `/api/assessments/:id` | Staff | Delete an assessment (access-checked) |

---

## Notes & limitations

- Files are limited to **30 MB** and must be **text-based** (scanned images will not extract).
- Question counts are clamped to **3–30**.
- AI output is best-effort: always **review and edit** before giving a paper to students.
- When a `GEMINI_API_KEY` is set but the request fails, the system automatically tries the next provider and finally the offline fallback — generation almost never fails outright.
