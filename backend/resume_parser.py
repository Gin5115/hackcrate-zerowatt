def analyze_resume(text: str) -> dict:
    """
    Mock logic to 'parse' a resume.
    In a real app, this would use PDF parsing + NLP.
    """
    score = 0
    feedback = []
    
    text = text.lower()
    
    # Check for basic sections
    checkpoints = ["experience", "education", "skills", "projects"]
    found = [word for word in checkpoints if word in text]
    
    if len(found) >= 3:
        score += 60
        feedback.append("Good structure: Found most standard sections.")
    else:
        score += 30
        feedback.append("Weak structure: Missing key sections like Projects or Experience.")
        
    # Check for keywords (generic tech keywords for demo)
    keywords = ["python", "javascript", "react", "sql", "aws", "docker", "communication", "leadership"]
    found_kw = [k for k in keywords if k in text]
    
    if len(found_kw) >= 3:
        score += 30
        feedback.append(f"Strong Skills: Detected {', '.join(found_kw[:3])}...")
    elif len(found_kw) > 0:
        score += 15
        feedback.append(f"Basic Skills: Detected {', '.join(found_kw)}.")
    else:
        feedback.append("Low Skill Match: No major technical keywords found.")

    # Final Adjustment
    final_score = min(score + 10, 100) # Give a graceful boost
    
    status = "Shortlisted" if final_score >= 50 else "Rejected"

    return {
        "score": final_score,
        "feedback": " ".join(feedback),
        "status": status
    }
