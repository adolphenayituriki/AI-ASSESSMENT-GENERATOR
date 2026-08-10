# DuFast EduAi — AI Assessment Generator

> A standalone product for **DuFast EduAi** that turns a course document into a
> finished assessment in under a minute. No extra modules, no clutter — just
> the AI Assessments feature, done well.

---

## 1. What this product does

Every teacher has been there: you have a chapter of notes, you have a class
that needs a test, and you have about zero spare hours. **DuFast EduAi AI
Assessment Generator** solves that problem.

Upload a course document (PDF, DOCX or TXT). Tell the tool what kind of
assessment you want — quiz, exam, exercise or homework — pick the subject,
class, difficulty and the number of questions, and the AI does the rest. In
seconds you get a complete paper with an answer key and explanations, ready to:

- **Preview** and edit on screen,
- **Save** to your personal library,
- **Download** as a student paper (PDF), a marking guide (PDF), or a CSV.

The product is fully self-contained. It uses its own blue brand colour
(`#078ECE`), ships with the **DuFast EduAi** logo (`frontend/public/dufast-eduai.png`),
and opens on a public landing page — no forced login.

---

## 2. How it feels to use it

1. **Open the app** at the public welcome page.
2. **Sign in** with your staff account (or try the demo accounts below).
3. **Upload a document** — the text is extracted instantly so you can see what
   the AI is working with.
4. **Tell the AI what you want** — assessment type, subject, class, difficulty,
   title, and how many questions.
5. **Let it work** — the AI reads the notes and writes real exam-style questions
   that test the actual subject content, not the layout of the book.
6. **Review and refine** — edit questions, marks and explanations until it feels
   right, then save or download.

> Tip: The class picker is grouped by level — Nursery, Primary (P1–P6),
> Secondary (S1–S6, including the MEG, HEG and TVT combinations) and University
> (Year 1–4). Pick a level to see its classes, or type any class name you like.

---

## 3. System design at a glance

The system follows a clean **client–server–database** architecture with an
optional **AI provider pipeline** on the side. The frontend never talks to a
model or a database directly — everything goes through the API.

```
┌───────────────────────────┐        ┌────────────────────────────────────┐
│        FRONTEND           │        │              BACKEND               │
│   React + Vite + Tailwind │        │      Node.js + Express + Mongoose  │
│                           │  HTTPS │                                    │
│   Landing / Login /       │ ─────▶ │  Auth & staff routes               │
│   AI Assessment Studio    │ ◀───── │  Assessment routes (REST API)      │
└───────────────────────────┘        │  Text extraction (pdf-parse /      │
        │                            │      mammoth)                      │
        │                            │  PDF builder (PDFKit)              │
        ▼                            └──────────────┬─────────────────────┘
 ┌───────────────┐                                   │
 │  AI PROVIDERS │   Gemini ──▶ OpenAI-compatible    │
 │   (optional)  │   ──▶ Offline fallback            ▼
 └───────────────┘                           ┌──────────────────┐
                                             │   MONGODB DATA   │
                                             │ Users, Documents,│
                                             │ Assessments,     │
                                             │ Classes          │
                                             └──────────────────┘
```

### The layers

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | React (Vite), Tailwind CSS | The whole AI tool UI — upload, generation controls, preview/editor, library, downloads |
| **Backend API** | Node.js, Express, Mongoose | Auth, file upload, AI orchestration, persistence, PDF generation |
| **AI pipeline** | Gemini → OpenAI-compatible → offline | Turns document text into structured questions |
| **Database** | MongoDB | Users, course documents, assessments, school classes |

---

## 4. Core workflows

### 4.1 Generating an assessment (the main journey)

```
 Upload a course document (PDF / DOCX / TXT, max 30 MB)
        │
        ▼
 Text is extracted on the backend (backend/utils/ai.js)
        │
        ▼
 You choose: type, question count, subject, class, title,
 difficulty, and optionally which topics/chapters to focus on
        │
        ▼
 The AI prompt is built from the document text
        │
        ▼
 Provider pipeline:  Gemini → OpenAI-compatible → Offline fallback
        │
        ▼
 Structured JSON is returned: title + questions
 (each with marks, an answer, and an explanation)
        │
        ▼
 Preview → edit → Save to library → Download PDF / Marking guide / CSV
```

### 4.2 Saving and retrieving

- A teacher sees **their own** assessments in the library.
- A **leader or admin** sees every assessment in the school.
- Every assessment is access-checked on the server before it can be viewed,
  downloaded or deleted — you can never open another teacher's paper.

---

## 5. Data model

Four MongoDB collections, kept deliberately simple.

| Model | File | Purpose | Key fields |
|---|---|---|---|
| `User` | `backend/models/User.js` | Staff accounts (teacher / leader / admin) | `name`, `email`, `username`, `role`, `assignedClass`, `courses`, `active` |
| `CourseDocument` | `backend/models/CourseDocument.js` | An uploaded document and its extracted text | `teacher`, `originalName`, `text`, `wordCount` |
| `Assessment` | `backend/models/Assessment.js` | A generated paper, with its questions | `teacher`, `title`, `type`, `subject`, `className`, `source`, `difficulty`, `marks`, `questions[]` |
| `SchoolClass` | `backend/models/SchoolClass.js` | Every class in the school for the class picker | `name`, `level`, `combination` |

**Relationships** are simple and ownership-based:

- `CourseDocument.teacher → User` — each document belongs to one teacher.
- `Assessment.teacher → User` — each assessment belongs to one teacher.
- `Assessment.document → CourseDocument` — optional link back to the source notes.

A question inside an assessment carries its own marks, options, correct answer
index, model answer and explanation — so a saved paper can be printed or marked
with no further lookup.

---

## 6. The AI provider pipeline

The system never depends on a single AI vendor. On each generation it walks a
chain of providers and stops at the first that succeeds:

```
Configured?   Gemini          OpenAI-compatible        Offline generator
────────────  ─────────────   ─────────────────────   ─────────────────
              If GEMINI_API_KEY   If OPENAI_API_KEY or    Always available.
              is set, try this    AI_API_KEY is set,      Builds questions
              first.              try this next.          from keywords and
                                                          sentences in the text.
                                                          Great for testing
                                                          with no API keys.
```

If a provider fails, the system logs a warning and moves to the next one — so
generation almost never fails outright.

The offline generator is smart, too. It strips page markers, copyright notices,
forewords and acknowledgements, then builds "complete the sentence" and
"explain in your own words" questions from the most meaningful sentences.

### What the AI is asked to produce

The prompt positions the model as *an experienced national examiner in Rwanda*,
and every generated item follows this shape:

- **Quiz & Exam** → mostly 4-option multiple choice with a few short answers
  (Rwandan Section A style).
- **Exercise & Homework** → mostly short-answer and structured questions with a
  model `answer`.
- **Visual questions** → wherever a drawing or a graph genuinely helps, the AI
  picks the best format: a "draw and label" question (prints an empty draw box)
  or a "draw the graph" question (prints labelled axes).

Every question ships with an **answer** and an **explanation**, and the PDF
includes a separate **ANSWER KEY** page (the teacher's copy) plus an optional
**MARKING GUIDE**.

The prompt also forbids lazy questions about the document itself — authors,
forewords, page numbers, copyrights, "which section covers X". The questions
must test genuine subject knowledge, written in the same language as the notes
(English, Kinyarwanda or French).

The AI also chooses the **best visual format** for each question where a visual
genuinely helps: a "draw and label" diagram (structure, cross-section, map,
flow chart, circuit, cycle — prints an empty draw box) or a plotted graph with
labelled axes (line, bar, histogram — prints the axes). For visual subjects
(Geography, Biology, Physics, Chemistry, Mathematics, Economics and others) a
visual question is required in every paper.

### Topic focus, subtopics and per-topic limits

After upload, the teacher can ask the system to list the chapters or units in
the document (`POST /api/assessments/topics`). The tool scans the **whole
document** for real headings (`UNIT`, `CHAPTER`, `LESSON`, `TOPIC`, `MODULE`,
`PART`) and merges them with an AI summary so every topic is found — not just
the first few pages.

Each topic is shown with its **subtopics hidden** until the teacher expands it.
The teacher can then:

- select a whole topic, or narrow it to specific **subtopics**,
- set a **max number of questions** for a topic (blank = the whole topic),
- select several topics, or simply keep "Whole document".

The generator distributes the requested total across the selections: each
limited topic gets up to its own quota, and any remainder is spread over the
rest of the document. Per-topic limits are respected by both the AI providers
and the offline fallback.

---

## 7. Tech stack

| Area | Choice |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Node.js 20, Express, Mongoose |
| Database | MongoDB (local or Atlas) |
| File parsing | `pdf-parse`, `mammoth` (DOCX) |
| PDF output | PDFKit |
| Auth | JWT (bcrypt-hashed passwords) |
| AI | Google Gemini REST API + OpenAI-compatible chat API + offline generator |

---

## 8. Getting started

### 8.1 Requirements

- **Node.js 18+** (20 recommended)
- **MongoDB** — local install or a MongoDB Atlas / Cloud cluster

### 8.2 Configure the backend

Copy `backend/.env.example` to `backend/.env` and fill in the values you need.
Only `MONGODB_URI` and `JWT_SECRET` are required; AI keys are optional.

| Variable | Purpose | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/ai-assessment-tool` |
| `JWT_SECRET` | Token signing secret | a long random string |
| `GEMINI_API_KEY` | Enables Google Gemini generation | `AIza...` |
| `GEMINI_MODEL` | Gemini model name (optional) | `gemini-flash-latest` |
| `OPENAI_API_KEY` / `AI_API_KEY` | Enables OpenAI-compatible generation | `sk-...` |
| `AI_BASE_URL` | OpenAI-compatible base URL (optional) | `https://api.openai.com/v1` |
| `AI_MODEL` | Model name (optional) | `gpt-4o-mini` |

> **No AI key? No problem.** If no key is set, generation automatically uses
> the **offline generator**, which still produces useful questions from the
> document text — perfect for testing or when the network is unavailable.

### 8.3 Run the project

Open two terminals:

```bash
# Terminal 1 — backend (auto-seeds demo accounts and classes)
cd backend
npm install
npm run dev            # http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Open **http://localhost:5173**, land on the public welcome page, and click
**Sign in** (or **Start generating assessments**). Try a demo account:

| Role | Username | Password |
|---|---|---|
| Teacher | `teacher` | `teacher123` |
| Leader | `leader` | `leader123` |

### 8.4 Production build (single server)

```bash
npm run build          # installs dependencies + builds frontend/dist
npm start              # serves the React app and the /api from backend/server.js
```

---

## 9. API reference

All `/api/assessments` and `/api/staff` endpoints require a staff role
(teacher, leader or admin) and a valid JWT.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Sign in (returns a JWT) |
| GET | `/api/auth/me` | Staff | Current user details |
| POST | `/api/auth/change-password` | Staff | Change your own password |
| GET | `/api/staff/classes` | Staff | Classes visible to the signed-in user (leaders/admins see all) |
| POST | `/api/assessments/upload` | Staff | Upload PDF/DOCX/TXT and extract its text |
| POST | `/api/assessments/topics` | Staff | List topics/chapters detected in a document |
| POST | `/api/assessments/generate` | Staff | Generate questions from a document |
| POST | `/api/assessments` | Staff | Save an assessment to the library |
| GET | `/api/assessments` | Staff | List assessments (own, or all for leader/admin) |
| GET | `/api/assessments/:id` | Staff | View one assessment (access-checked) |
| POST | `/api/assessments/pdf` | Staff | Build a PDF (paper or marking guide) |
| DELETE | `/api/assessments/:id` | Staff | Delete an assessment (access-checked) |

---

## 10. Design notes & honest limitations

- **Files** are limited to **30 MB** and must be **text-based** — scanned
  images will not extract into usable text.
- **Question counts** are clamped to **3–30** per assessment.
- **AI output is best-effort.** It is designed to be a huge time-saver, not a
  replacement for professional judgment. Always **review and edit** before
  giving a paper to students.
- **Resilience is built in.** If Gemini is configured but fails, the system
  silently tries the next provider and finally the offline fallback — so a
  lesson is never left without a paper.
- **Passwords are hashed** with bcrypt and only a safe public shape of the user
  is ever sent to the frontend (`backend/middleware/auth.js`).

---

*DuFast EduAi — Smart assessments in seconds.*
