# Green Scheduler

A Carbon-Aware scheduler for batch computing jobs. The system decides when and where to run heavy workloads based on the real-time carbon intensity of the power grid.

## Requirements & Tech Stack

- **Frontend**: React (Vite) + TailwindCSS -> Deploy to Vercel
- **Backend**: FastAPI -> Deploy to Render
- **Database**: Supabase (PostgreSQL)
- **Scheduler**: Celery + Redis
- **Carbon API**: Electricity Maps (Mocked for MVP)

## Getting Started Locally

### 1. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com/).
2. Go to Project Settings -> Database and copy the **Connection string (URI)** for PostgreSQL.
3. In `backend/.env`, set the `DATABASE_URL` to this connection string:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
   ```
*(Note: If no `DATABASE_URL` is provided, the backend falls back to a local SQLite database `test.db` for easy local testing).*

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder.
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *(If `requirements.txt` is missing, you can install manually: `pip install fastapi uvicorn celery redis sqlalchemy psycopg2-binary httpx python-dotenv supabase`)*
4. Keep Redis running on your system (e.g., via Docker: `docker run -d -p 6379:6379 redis`).
5. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
6. In a separate terminal (with the venv activated), start the Celery worker:
   ```bash
   celery -A celery_worker.celery_app worker --loglevel=info
   ```

### 3. Frontend Setup
1. Open a terminal and navigate to the `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Verify by opening the URL given by Vite (usually `http://localhost:5173/`).

## Integrating APIs (Future Work)

- **Electricity Maps**: The `get_current_intensity()` function in `backend/celery_worker.py` currently mocks the carbon intensity.
  - Sign up for [Electricity Maps API](https://api.electricitymaps.com/).
  - Get a `token` (API key).
  - Add it to your `.env` as `ELECTRICITY_MAPS_API_KEY=your_key_here`.
  - Update `celery_worker.py` to make a real HTTP request to the API with this token.

## Deployment Guide

### Deploying the Backend to Render
1. Push the repository to GitHub.
2. Create a new **Web Service** on Render.
3. Select your repository.
4. Set the Start Command to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Add the Environment Variables:
   - `DATABASE_URL`: Your Supabase connection string.
   - `CELERY_BROKER_URL`: URL to a managed Redis instance (can also create a Redis instance on Render).
6. Create a separate **Background Worker** on Render for Celery:
   - Start Command: `celery -A celery_worker.celery_app worker --loglevel=info`

### Deploying the Frontend to Vercel
1. Log in to Vercel and create a new Project.
2. Select your GitHub repository.
3. Vercel should auto-detect the Vite React framework.
4. Set Environment Variables:
   - `VITE_API_URL`: Set this to your deployed Render backend URL (e.g., `https://green-scheduler-api.onrender.com/api`).
5. Deploy!

## Core Logic Engine
- **Scenario A**: If the carbon intensity is low (< 150 gCO2/kWh), the job executes immediately in the local region.
- **Scenario B**: If the intensity is high (>= 150 gCO2/kWh), the scheduler "hops" to a greener region (e.g., Mock Norway at 20 gCO2/kWh), and the frontend records the "Total Carbon Saved".
