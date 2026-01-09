from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
import json

# Import DB stuff
from database import SessionLocal, engine, Base
import models
import schemas # Our Pydantic schemas
import resume_parser # Mock Resume Logic

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Softrate AI Hiring API")

# Allow the Frontend to talk to this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Basic Health Check ---
@app.get("/")
def read_root():
    return {"status": "active", "message": "Softrate Engine is Running with DB"}

# --- MODULE 0: AUTHENTICATION ---
@app.post("/auth/signup")
def candidate_signup(request: schemas.CandidateSignupRequest, db: Session = Depends(get_db)):
    # Check duplicate
    existing = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create Candidate
    candidate = models.Candidate(
        name=request.name,
        email=request.email,
        password=request.password, # In real app, hash this!
        university=request.university
    )
    db.add(candidate)
    db.commit()
    return {"status": "success", "message": "Account created"}

@app.post("/auth/login")
def candidate_login(request: schemas.CandidateLoginRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate or candidate.password != request.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "status": "success",
        "name": candidate.name,
        "email": candidate.email,
        "university": candidate.university,
        "assessment_id": candidate.assessment_id # Return active job
    }

@app.post("/candidate/select-job")
def select_job(request: schemas.SelectJobRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # STRICT RULE: If applying for SAME job AND (Rejected OR Completed), BLOCK IT.
    if candidate.assessment_id == request.assessment_id:
        if candidate.current_stage == -1:
             raise HTTPException(status_code=400, detail="Application Rejected. You cannot re-apply for this role.")
        if candidate.current_stage == 5:
             raise HTTPException(status_code=400, detail="Application Completed. You cannot re-apply.")

    # Update Job & Reset Stage (Only if switching jobs or starting fresh validly)
    candidate.assessment_id = request.assessment_id
    candidate.current_stage = 1 # Start from Resume Round
    candidate.stage_scores = {} # Reset Previous Scores
    candidate.resume_text = None # Reset Resume
    
    db.commit()
    return {"status": "success", "message": "Application Started"}

@app.post("/candidate/disqualify")
def disqualify_candidate(request: schemas.DisqualifyRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.current_stage = -1 # Rejected
    
    # Log the reason in feedback (optional, appending to resume for now or general log)
    scores = candidate.stage_scores or {}
    scores["disqualification_reason"] = request.reason
    candidate.stage_scores = scores
    
    db.commit()
    return {"status": "disqualified", "message": "Candidate disqualified."}

# --- MODULE 1: GENAI ASSESSMENT GENERATOR ---
@app.post("/generate-assessment", response_model=schemas.AssessmentResponse)
def generate_assessment(request: schemas.JobDescriptionRequest, db: Session = Depends(get_db)):
    """
    Analyzes the JD, generates questions, and SAVES to DB.
    """
    
    # 1. Logic to generate questions (Mock for now)
    text = request.jd_text.lower()
    detected_skills = []
    questions = []
    
    if "python" in text:
        detected_skills.append("Python")
        questions.append({
            "id": 1, 
            "text": "Write a function to reverse a string in Python without using [::-1].", 
            "type": "code", 
            "difficulty": "easy", 
            "keywords": ["python", "string"]
        })
    
    if "communication" in text or "team" in text:
        detected_skills.append("Communication")
        questions.append({
            "id": 2, 
            "text": "Describe a time you had a conflict with a team member. How did you resolve it?", 
            "type": "subjective", 
            "difficulty": "medium", 
            "keywords": ["hr", "behavioral"]
        })

    # Fallback
    if not questions:
        questions.append({
            "id": 99, 
            "text": "Explain the core principles of this role.", 
            "type": "subjective", 
            "difficulty": "easy", 
            "keywords": ["general"]
        })

    # 2. SAVE to Database
    db_assessment = models.Assessment(
        role_title=request.role_title,
        job_description=request.jd_text,
        suggested_skills=detected_skills,
        questions=questions
    )
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)

    return schemas.AssessmentResponse(
        role=db_assessment.role_title,
        suggested_skills=db_assessment.suggested_skills,
        questions=[schemas.QuestionSchema(**q) for q in db_assessment.questions]
    )

@app.get("/assessments")
def list_assessments(db: Session = Depends(get_db)):
    assessments = db.query(models.Assessment).all()
    return [{"id": a.id, "role_title": a.role_title, "jd_text": a.job_description} for a in assessments]

@app.get("/assessments/{id}", response_model=schemas.AssessmentResponse)
def get_assessment(id: int, db: Session = Depends(get_db)):
    assessment = db.query(models.Assessment).filter(models.Assessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return schemas.AssessmentResponse(
        role=assessment.role_title,
        suggested_skills=assessment.suggested_skills,
        questions=[schemas.QuestionSchema(**q) for q in assessment.questions]
    )

@app.delete("/assessments/{id}")
def delete_assessment(id: int, db: Session = Depends(get_db)):
    assessment = db.query(models.Assessment).filter(models.Assessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    db.delete(assessment)
    db.commit()
    return {"message": "Assessment deleted successfully"}

@app.put("/assessments/{id}")
def update_assessment(id: int, request: schemas.AssessmentResponse, db: Session = Depends(get_db)):
    assessment = db.query(models.Assessment).filter(models.Assessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    assessment.role_title = request.role
    assessment.suggested_skills = request.suggested_skills
    assessment.questions = [q.dict() for q in request.questions]
    
    db.commit()
    return {"message": "Assessment updated successfully"}


@app.post("/submit")
def submit_assessment(request: schemas.SubmissionRequest, db: Session = Depends(get_db)):
    # 1. Create or Get Candidate
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.candidate_email).first()
    if not candidate:
        candidate = models.Candidate(
            name=request.candidate_name, 
            email=request.candidate_email,
            university=request.university
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
    
    # 2. Calculate Mock Score (Simple Logic)
    score = 75 # Mock score for demo
    feedback = "Good logical structure. Needs better error handling."

    # 3. Save Submission
    submission = models.Submission(
        candidate_id=candidate.id,
        assessment_id=request.assessment_id,
        answers=request.answers,
        score=score,
        feedback=feedback
    )
    db.add(submission)
    
    # Complete the pipeline (Stage 4 Complete)
    candidate.current_stage = 5 
    db.commit()
    
    return {"message": "Submission Received", "status": "success"}

# --- MODULE 2: ANALYTICS ---
@app.get("/candidates")
def list_candidates(db: Session = Depends(get_db)):
    results = db.query(models.Submission).options(joinedload(models.Submission.candidate), joinedload(models.Submission.assessment)).all()
    data = []
    for sub in results:
        data.append({
            "id": sub.candidate.id,
            "name": sub.candidate.name,
            "email": sub.candidate.email,
            "university": sub.candidate.university or "N/A",
            "role": sub.assessment.role_title if sub.assessment else "Unknown",
            "score": sub.score,
            "status": "Pass" if sub.score >= 70 else "Fail",
            "submission_id": sub.id
        })
    return data


# --- MODULE 4: RESUME PARSING & CANDIDATE STATUS ---
from pypdf import PdfReader
import io

@app.post("/upload-resume")
async def upload_resume(
    email: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Read PDF file
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    try:
        content = await file.read()
        pdf_reader = PdfReader(io.BytesIO(content))
        resume_text = ""
        for page in pdf_reader.pages:
            t = page.extract_text()
            if t: resume_text += t + "\n"
    except Exception as e:
        print(f"PDF Parse Error: {e}")
        resume_text = "Error parsing PDF"

    # 2. Analyze (Mock Engine)
    result = resume_parser.analyze_resume(resume_text)
    
    # 3. Update DB
    candidate = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    candidate.resume_text = resume_text
    
    # Update Scores
    stage_scores = candidate.stage_scores or {}
    stage_scores['resume'] = result
    candidate.stage_scores = stage_scores

    if result["status"] == "Shortlisted":
        candidate.current_stage = 2
    else:
        candidate.current_stage = -1 # Rejected
        
    db.commit()
    return {"message": "Resume Processed", "result": result}

@app.get("/candidate/status/{email}")
def get_candidate_status(email: str, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if not candidate:
        # If not found, return stage 0 (New)
        return {"current_stage": 0, "stage_scores": {}}
    return {
        "current_stage": candidate.current_stage, 
        "stage_scores": candidate.stage_scores, 
        "name": candidate.name,
        "assessment_id": candidate.assessment_id
    }

# Stage 2: Psychometric
@app.get("/test/psychometric")
def get_psychometric_questions():
    return [
        {"id": "p1", "text": "I prefer working in a team rather than alone.", "type": "mcq", "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]},
        {"id": "p2", "text": "I often take initiative in undefined situations.", "type": "mcq", "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]},
        {"id": "p3", "text": "I handle stress well under tight deadlines.", "type": "mcq", "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]},
        {"id": "p4", "text": "I am open to constructive criticism.", "type": "mcq", "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]},
        {"id": "p5", "text": "I prioritize perfection over speed.", "type": "mcq", "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}
    ]

# Stage 3: Resume-Based Technical
@app.post("/test/resume-based")
def get_resume_questions(email: str, db: Session = Depends(get_db)): # Post to allow body if needed
    pass 

@app.get("/test/resume-questions/{email}")
def get_resume_questions_get(email: str, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if not candidate or not candidate.resume_text:
        raise HTTPException(status_code=400, detail="Resume not found")
    
    text = candidate.resume_text.lower()
    questions = []
    
    # Dynamic Generation based on keywords in resume
    if "python" in text:
        questions.append({"id": "r1", "text": "I see you used 'Python'. Explain the difference between list and tuple.", "type": "subjective", "difficulty": "easy"})
    if "react" in text:
        questions.append({"id": "r2", "text": "You mentioned 'React'. What is the Virtual DOM?", "type": "subjective", "difficulty": "medium"})
    if "sql" in text:
        questions.append({"id": "r3", "text": "Write a SQL query to find the second highest salary.", "type": "code", "difficulty": "medium"})
    if "docker" in text:
         questions.append({"id": "r4", "text": "Explain the difference between an image and a container.", "type": "subjective", "difficulty": "medium"})
        
    if not questions:
        questions.append({"id": "r99", "text": "Describe the most challenging project listed on your resume.", "type": "subjective", "difficulty": "medium"})
    
    return questions

@app.post("/candidate/disqualify")
def disqualify_candidate(request: schemas.DisqualifyRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.current_stage = -1 
    
    scores = candidate.stage_scores or {}
    if not isinstance(scores, dict): scores = {}
    
    scores["disqualification_reason"] = request.reason
    candidate.stage_scores = scores
    
    db.commit()
    return {"status": "disqualified"}

@app.post("/stage/complete")
def complete_stage(update: schemas.StageUpdate, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == update.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Update score for this stage
    scores = candidate.stage_scores or {}
    if not isinstance(scores, dict): scores = {}
    
    stage_key = f"stage_{update.stage}"
    scores[stage_key] = {"score": update.score, "feedback": update.feedback}
    candidate.stage_scores = scores 
    
    # Advance Stage logic
    # Stage 2 (Psychometric) -> 3 (Resume Test)
    # Stage 3 (Resume Test) -> 4 (JD Test)
    if update.stage == candidate.current_stage:
        candidate.current_stage += 1
        
    db.commit()
    return {"status": "success", "next_stage": candidate.current_stage}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
