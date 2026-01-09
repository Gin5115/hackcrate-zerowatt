from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    role_title = Column(String, index=True)
    job_description = Column(Text)
    # Storing skills and questions as JSON for simplicity in SQLite 
    # (In Prod, you might want separate tables for Questions)
    suggested_skills = Column(JSON) 
    questions = Column(JSON) 

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String) # Simple storage for hackathon
    university = Column(String, nullable=True)
    
    # Active Application
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=True) # Current active Selection Process
    
    # Multi-Stage Pipeline Fields
    resume_text = Column(Text, nullable=True)
    current_stage = Column(Integer, default=1) # 1=Resume, 2=Psychometric, 3=ResumeTest, 4=JDTest, 5=Complete
    stage_scores = Column(JSON, default={}) # Stores scores for each stage
    
class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    answers = Column(JSON) # Store candidate answers
    score = Column(Integer, default=0)
    feedback = Column(Text)
    
    # Relationships
    candidate = relationship("Candidate")
    assessment = relationship("Assessment")

