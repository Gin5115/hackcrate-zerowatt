from pydantic import BaseModel
from typing import List, Optional

# What we expect to receive from the Frontend
class JobDescriptionRequest(BaseModel):
    role_title: str
    jd_text: str

# What a single Question looks like
class Question(BaseModel):
    id: int
    text: str
    type: str  # "code", "mcq", "subjective"
    difficulty: str # "easy", "medium", "hard"
    keywords: List[str]

# What we send back to the Frontend
class AssessmentResponse(BaseModel):
    role: str
    suggested_skills: List[str]
    questions: List[Question]
