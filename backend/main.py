from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import JobDescriptionRequest, AssessmentResponse, Question # Import our new models
import random

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

# --- MODULE 1: GENAI ASSESSMENT GENERATOR ---
@app.post("/generate-assessment", response_model=AssessmentResponse)
def generate_assessment(request: JobDescriptionRequest):
    """
    Analyzes the JD and generates relevant questions.
    (Currently Mocked - replace 'MOCK_AI_LOGIC' with OpenAI call later)
    """
    
    # Simple keyword extraction logic (Mock AI)
    text = request.jd_text.lower()
    detected_skills = []
    questions = []
    
    if "python" in text:
        detected_skills.append("Python")
        questions.append(Question(
            id=1, text="Write a function to reverse a string in Python without using [::-1].", 
            type="code", difficulty="easy", keywords=["python", "string"]
        ))
    
    if "communication" in text or "team" in text:
        detected_skills.append("Communication")
        questions.append(Question(
            id=2, text="Describe a time you had a conflict with a team member. How did you resolve it?", 
            type="subjective", difficulty="medium", keywords=["hr", "behavioral"]
        ))

    # Fallback if JD is empty or vague
    if not questions:
        questions.append(Question(
            id=99, text="Explain the core principles of this role.", 
            type="subjective", difficulty="easy", keywords=["general"]
        ))

    return AssessmentResponse(
        role=request.role_title,
        suggested_skills=detected_skills,
        questions=questions
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
