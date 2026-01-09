from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Softrate AI Hiring API")

# Allow the Frontend to talk to this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Basic Health Check ---
@app.get("/")
def read_root():
    return {"status": "active", "message": "Softrate Engine is Running"}

# --- Placeholder for Module 1: Admin Setup ---
class JobDescription(BaseModel):
    role_title: str
    content: str

@app.post("/generate-assessment")
def generate_assessment(jd: JobDescription):
    # This is where we will eventually plug in the LLM (GPT)
    return {
        "message": f"Received JD for {jd.role_title}. AI generation module pending.",
        "skills_detected": ["Python (Mock)", "Data Analysis (Mock)"]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
