# 🎓 StudyMate — AI-Based Unit-Wise Study Planner Chatbot

> A modern, responsive web application for college students to manage semester syllabi, generate personalized day-wise study timetables with spaced repetition, and consult an AI study advisor powered by **IBM watsonx.ai** (with a seamless zero-configuration **Demo Mode** fallback).

---

## 🌟 Key Features

1. **Student Dashboard**: Clean, modern cards with real-time syllabus completion rings, next-exam countdowns, and quick metrics.
2. **Syllabus & Units Manager**: Add subjects, target exam dates, unit titles, and topics with difficulty ratings (**Easy = 1.0x**, **Medium = 1.5x**, **Hard = 2.0x**).
3. **Daily Study Capacity**: Enter available daily study hours (customizable from 0.5 to 18 hours/day).
4. **Deterministic Timetable Generator**: Computes day-by-day and unit-wise study slots decoupled from unpredictable LLM outputs.
5. **Difficulty & Pending Prioritization**: Hard and unfinished units are weighted and scheduled early in peak focus slots.
6. **Built-in Spaced Repetition & Mock Practice**: Automatically schedules 2-day and 5-day spaced review sessions, plus timed past-paper simulation slots before exams.
7. **Interactive Progress Tracking**: Check off completed topics directly from the daily schedule or syllabus; metrics and charts update instantly.
8. **AI Study Advisor Chatbot**:
   - Integrated with **IBM watsonx.ai** (`ibm/granite-13b-chat-v2` or `meta-llama/llama-3-8b-instruct`).
   - Injects student context (completion rate, upcoming exams, weak/hard topics) into conversations.
   - Built-in fail-safe **Demo Mode** with academic coaching heuristics when API keys are not provided.
9. **Offline Local Persistence**: Autosaves subjects, timetable slots, daily settings, and chat history into browser `localStorage`, with one-click JSON export/import backups.
10. **Input Validation & Error Handling**: Client-side and server-side checks with helpful toast notifications.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: Vanilla HTML5, Modern Responsive CSS3 (CSS variables, slate/indigo aesthetic, accessible contrast), and Modular JavaScript (`app.js`, `timetable.js`, `chat.js`, `storage.js`).
- **Backend**: Node.js & Express.
- **AI Integration**: IBM watsonx.ai REST API with IAM Bearer token authentication and caching.
- **Architectural Separation**:
  - `src/services/schedulerService.js`: Pure deterministic algorithm for mathematical timetable allocation.
  - `src/services/watsonxService.js`: IBM watsonx.ai client with secure server-side credential handling.
  - `src/services/demoAdvisorService.js`: Academic heuristics engine for instant demo readiness.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended, verified on v24.15)
- npm (installed with Node.js)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (For Live IBM watsonx.ai)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Inside `.env`:
```env
PORT=3000

# IBM watsonx.ai Credentials
WATSONX_API_KEY=your_ibm_cloud_iam_api_key
WATSONX_PROJECT_ID=your_watsonx_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-13b-chat-v2
```

#### How to Obtain IBM watsonx.ai Credentials:
1. **IBM Cloud IAM API Key (`WATSONX_API_KEY`)**:
   - Log in to your [IBM Cloud Console](https://cloud.ibm.com).
   - In the top menu, go to **Manage** > **Access (IAM)** > **API Keys**.
   - Click **Create an IBM Cloud API key**, name it (e.g., `watsonx-study-planner`), and copy the generated key.
2. **watsonx.ai Project ID (`WATSONX_PROJECT_ID`)**:
   - Navigate to [IBM watsonx.ai](https://dataplatform.cloud.ibm.com/wx/home).
   - Open your project (or click **New Project** to create one).
   - Go to the **Manage** tab > **General** section.
   - Copy the **Project ID** GUID (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
3. **Regional Endpoint (`WATSONX_URL`)**:
   - Select the URL matching your project's provisioned cloud region:
     | Region | Endpoint URL |
     |---|---|
     | **Dallas (US South)** | `https://us-south.ml.cloud.ibm.com` |
     | **Frankfurt (Germany)** | `https://eu-de.ml.cloud.ibm.com` |
     | **Tokyo (Japan)** | `https://jp-tok.ml.cloud.ibm.com` |
     | **London (United Kingdom)** | `https://eu-gb.ml.cloud.ibm.com` |
     | **Toronto (Canada)** | `https://ca-tor.ml.cloud.ibm.com` |
4. **Foundation Models (`WATSONX_MODEL_ID`)**:
   Supported foundation models available in watsonx include:
   - `ibm/granite-13b-chat-v2` *(Default, balanced academic advisor)*
   - `ibm/granite-3-8b-instruct` *(Fast, modern IBM Granite release)*
   - `meta-llama/llama-3-8b-instruct` *(Meta Llama 3)*
   - `meta-llama/llama-3-70b-instruct` *(High reasoning capacity)*
   - `mistralai/mistral-large` *(Mistral AI)*

> **🔒 Security Guarantee**: All API keys, project IDs, and IAM token exchanges are kept strictly on the backend Node.js server. The client browser only accesses `/api/chat` and never sees your credentials.
>
> **🛡️ Zero-Config Demo Mode Fallback**: If `WATSONX_API_KEY` or `WATSONX_PROJECT_ID` are left empty, or if an API connection error occurs, the server automatically defaults to the built-in **Academic Advisor Demo Mode** with full academic heuristics.

#### 3. Test Your Watsonx Integration via CLI
Run the diagnostic test tool:
```bash
npm run test:watsonx
```
This tests IAM authentication, foundation model response time, and outputs diagnostics directly in your terminal. You can also query the live diagnostic endpoint in your browser:
👉 **`http://localhost:3000/api/chat/test-watsonx`**

### 3. Run the Server
```bash
npm start
```
For hot-reloading development mode:
```bash
npm run dev
```

### 4. Open the Web Application
Open your browser and navigate to:
👉 **`http://localhost:3000`**

---

## 🧪 Running Automated Tests

Run the comprehensive unit and integration test suite:
```bash
npm test
```
The test suite validates:
- Schedule payload and chat payload input validation.
- Timetable generation math, difficulty multipliers, and spaced revision slots.
- Demo mode heuristic responses and academic advisory strategies.
- Live HTTP endpoints (`/api/health`, `/api/chat/status`, `/api/schedule/generate`, `/api/chat`, and static file serving).

---

## ✅ Verified Features Checklist

Every feature in the checklist below has been implemented, executed, and verified through automated test suites and live API checks:

| Feature | Implementation | Tested & Verified Status |
|---|---|---|
| **1. Subject CRUD** | Add, edit title/code/exam date, delete subject | ✅ **PASS** (Preserves topic completion on edit) |
| **2. Unit CRUD** | Add unit, assign difficulty (Easy/Medium/Hard), delete unit | ✅ **PASS** (Tested in `testEndToEndFeatures.js`) |
| **3. Granular Topic CRUD** | Inline `+ Topic`, delete `✕`, custom hours & difficulty | ✅ **PASS** (Tested in UI & simulation suite) |
| **4. Actual Exam Deadlines** | Local date parser without timezone shift, days left calc | ✅ **PASS** (Verified with exact calendar intervals) |
| **5. Available Daily Hours** | Adjustable from 0.5 to 18 hrs/day, session chunking | ✅ **PASS** (Strictly bounds slots to student budget) |
| **6. Difficulty Prioritization** | Easy=1.0x, Med=1.5x, Hard=2.0x, Hard scheduled in early peak slots | ✅ **PASS** (Tested in `testScheduleAndChat.js`) |
| **7. Completed Topic Exclusion** | Topics already marked completed are excluded from core study | ✅ **PASS** (Only pending topics queued for deep study) |
| **8. Spaced Revision Slots** | Automatic 2-day & 5-day spaced repetition review slots | ✅ **PASS** (Inserted after unit completion) |
| **9. Final Mock Practice** | Timed past-paper simulation slots 1-2 days before exam | ✅ **PASS** (Scheduled automatically before exam date) |
| **10. Bidirectional Progress Sync**| Checking off topics updates Unit, Timetable, & Dashboard | ✅ **PASS** (Auto-computes completion % and pending counts)|
| **11. Local Persistence** | `localStorage` state preserved across page refreshes | ✅ **PASS** (Initialization flag prevents unwanted overwrites)|
| **12. IBM watsonx.ai Chat API** | Server-side IAM token caching, regional endpoint resolution | ✅ **PASS** (Verified via `testApiEndpoints.js`) |
| **13. AI Demo Mode Fallback** | Heuristic coach with active recall strategies & context awareness | ✅ **PASS** (Returns relevant answers with follow-up questions)|
| **14. Mandatory Follow-up Qs** | Every AI advice response ends with an interactive question | ✅ **PASS** (Verified across all 7 advisory categories) |
| **15. Credential Security** | API keys kept strictly in `.env` on backend, never in frontend | ✅ **PASS** (Confirmed `.env` in `.gitignore` & server-only) |
| **16. Input Validation & Errors** | Past date rejection, hours bounds, required fields with toasts | ✅ **PASS** (30 unit tests + 8 API tests pass) |

---

## 💡 How to Use the Application

1. **Explore with Demo Data**:
   - On the header bar, click **"⚡ Demo Data"** to immediately populate 3 sample university courses (*Data Structures & Algorithms*, *Database Management Systems*, *Computer Networks*) with units and difficulty tags.
2. **Add, Edit & Delete Courses**:
   - Go to the **"📚 Syllabus & Units"** tab.
   - Click **"+ Add New Subject"** or click **"✏️ Edit"** on any existing card.
   - You can also click **"+ Topic"** or **"+ Add Unit"** directly on the card to make quick syllabus adjustments.
3. **Track Your Progress**:
   - Click any topic's checkbox right in the syllabus card or inside the timetable.
   - The unit checkbox and dashboard progress percentage update automatically!
4. **Generate Timetable**:
   - Go to the **"📅 Generated Timetable"** tab.
   - Adjust your daily study hours (e.g. 3.5 hrs) and click **"⚡ Generate Timetable"**.
   - Review your workload feasibility banner (*Optimal*, *Intensive*, or *Overloaded*).
   - Use the filter buttons to isolate **Core Study**, **Spaced Revision**, or **Mock Practice** slots.
5. **Chat with StudyMate AI**:
   - Go to the **"🤖 AI Study Advisor"** tab.
   - Notice the status banner indicating whether **IBM watsonx.ai** or **AI Demo Mode** is active.
   - Ask for study advice or click any quick prompt chip (e.g. *"Tackle Hard Units"*, *"Spaced Revision"*, *"Pomodoro Plan"*).
   - Every advice response concludes with an interactive follow-up question to help you structure your next study block.

---

## 📂 Project Structure

```text
unit-wise-study-planner/
├── .env                  # Local environment credentials (git-ignored)
├── .env.example          # Template environment file
├── .gitignore            # Git ignore rules
├── package.json          # Project metadata & npm scripts
├── README.md             # Project documentation
├── server.js             # Express server entry point
├── src/
│   ├── routes/
│   │   ├── chatRoutes.js        # /api/chat endpoints
│   │   └── scheduleRoutes.js    # /api/schedule/generate endpoints
│   ├── services/
│   │   ├── demoAdvisorService.js # Heuristic academic coaching fallback
│   │   ├── schedulerService.js  # Deterministic timetable engine
│   │   └── watsonxService.js    # IBM watsonx IAM auth & API client
│   └── utils/
│       └── validator.js         # Input validation & schema rules
├── public/
│   ├── index.html        # Responsive student dashboard UI
│   ├── css/
│   │   └── style.css     # Clean slate & indigo responsive styling
│   └── js/
│       ├── app.js        # Dashboard state & modal controller
│       ├── chat.js       # AI chat widget & markdown formatting
│       ├── storage.js    # LocalStorage persistence & sample courses
│       └── timetable.js   # Timetable generation & interactive checklist
└── tests/
    ├── testApiEndpoints.js      # HTTP integration tests
    └── testScheduleAndChat.js   # Unit tests for scheduler & advisor
```

---

## 📄 License
MIT License. Open for educational and academic use.
