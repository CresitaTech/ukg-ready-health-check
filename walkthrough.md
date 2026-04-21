# Opallios CSM Intake - Implementation Walkthrough

The Opallios CSM Intake application is fully implemented! Here is a breakdown of what was accomplished, the tech stack configurations, and how to verify the platform.

## Architecture Highlights
- **Vite + React (TypeScript):** Modern, fast frontend client utilizing `react-router-dom` for view transitions. 
- **Vanilla CSS Design System:** Instead of generic libraries like Tailwind, a bespoke corporate-ready design system (`index.css`) was created utilizing deep blues, robust layout constraints, glassmorphism paneling, and curated visual tokens ensuring a highly professional aesthetic.
- **FastAPI Backend Pipeline:** Structured inside `/backend` with an SQLite (`sqlalchemy`) data store capturing `users` and `submissions`.
- **JWT Authentication:** Implemented utilizing HTTP Bearer strategies, storing tokens in local storage, powering a context API across the React layer to securely route pages using a `<ProtectedRoute>` wrapper.
- **Auto-Save Mechanism:** The Intake form uses a debounced (2-second delay) save strategy bound directly to the `watch()` method of React Hook Form, parsing and persisting JSON states seamlessly without disruptive loading spinners.

## User Flow
1. **Registration:** You start at the `/register` route. You can create a new user profile which hashes passwords directly in SQLite utilizing `bcrypt`.
2. **Dashboard:** A minimalist dashboard listing your drafts. You can resume drafts by clicking `Resume` or view finalized submissions.
3. **Multi-Step Form:** Generating a new draft transitions you to a customized stepper UI traversing 9 distinct sections. Forms are progressively saved, meaning restarting the application seamlessly recovers the latest section and data!

> [!NOTE]
> The backend server runs via Uvicorn. To prevent CORS headaches during development, the frontend configuration `vite.config.ts` successfully proxies API requests to the Python server.

## Validation Steps
To view your newly minted application:

1. Open a new terminal to start the frontend:
```bash
cd frontend
npm run dev
```

2. Your backend is already running on port `8000`. If you need to restart it later:
```bash
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

3. Navigate to **http://localhost:5173** and verify the sleek UI and dynamic hover animations of the components! Use a test email to create an account and begin drafting a Health Check submission!
