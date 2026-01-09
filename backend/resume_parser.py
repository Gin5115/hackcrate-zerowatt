import google.generativeai as genai
import time
from google.api_core.exceptions import TooManyRequests
import re

# Configure Gemini
genai.configure(api_key="AIzaSyCqDKyipUvjtp4UX8ooTh6BdkBfiuUFdNw")
model = genai.GenerativeModel("gemini-2.5-flash")

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

def safe_generate(prompt, retries=3):
    for i in range(retries):
        try:
            print("➡️ Calling Gemini...")
            response = model.generate_content(prompt)
            print("✅ Gemini responded")
            return response.text
        except TooManyRequests:
            print(f"⏳ Rate limit hit, retrying in 10s... ({i+1}/{retries})")
            time.sleep(10)
        except Exception as e:
            print(f"⚠️ Generation Error: {e}")
            return ""
    return ""

def parse_json_safely(text):
    """
    Robustly extracts and parses JSON from text, handling common LLM formatting issues.
    """
    try:
        import json
        # 1. Try to find JSON block
        json_match = re.search(r'(\[.*\]|\{.*\})', text, re.DOTALL)
        if not json_match:
            return None
        
        json_str = json_match.group(0)
        
        # 2. Heuristic Cleaning for Common LLM JSON Errors
        # Remove markdown code blocks if inside the match (unlikely if regex correct, but possible)
        json_str = json_str.replace("```json", "").replace("```", "")
        
        # Escape newlines that are not part of JSON structure
        # (This is tricky, but often LLMs put \n in strings without escaping)
        # However, Python's json usually struggles with control chars.
        # Let's try Strict=False first.
        return json.loads(json_str, strict=False)
        
    except Exception as e:
        print(f"⚠️ JSON Parse Error: {e}")
        # Last resort: Try simple eval? No, unsafe.
        return None

def generate_resume_questions(resume_text: str):
    # Single batch request for 10 questions
    count = 10
    # distribution: 3 Easy, 4 Medium, 3 Hard
    prompt = f"""
    Generate {count} Technical SUBJECTIVE (Short Answer) questions based on the resume below.
    Distribution: 3 EASY, 4 MEDIUM, 3 HARD.
    
    Rules:
    - Questions must be open-ended but specific to the candidate's experience.
    - NO options (A, B, C, D).
    - STRICTLY Technical questions (e.g., "Explain how you used X in project Y").
    
    Resume:
    {resume_text[:3000]}... (truncated)
    
    Output JSON ONLY:
    [
        {{
            "id": "rq1",
            "text": "Question text...",
            "type": "subjective",
            "model_answer": "Short expected answer explanation...",
            "difficulty": "easy",
            "keywords": ["python", "flask"]
        }},
        ...
    ]
    """
    print(f"⏳ Generating {count} SUBJECTIVE questions (Resume Batch)...")
    text = safe_generate(prompt)
    
    questions = parse_json_safely(text)
    
    if questions:
        # --- SHOW ANSWERS IN TERMINAL ---
        print("\n" + "="*40)
        print(f"🤖 GENERATED RESUME QUESTIONS & ANSWERS")
        print("="*40)
        for i, q in enumerate(questions):
            print(f"Q{i+1}: {q.get('text')}")
            print(f"✅ MODEL ANSWER: {q.get('model_answer', 'N/A')}")
            print("-"*20)
        print("="*40 + "\n")
        return questions
        
    print(f"⚠️ Resume Gen Failed to Parse. Raw Text: {text[:200]}...")
    return []

def generate_jd_questions(jd_text: str):
    count = 10
    # distribution: 3 Easy, 4 Medium, 3 Hard
    prompt = f"""
    Generate {count} Technical SUBJECTIVE (Short Answer) questions based on this Job Description.
    Distribution: 3 EASY, 4 MEDIUM, 3 HARD.
    
    Job Description:
    {jd_text[:3000]}... (truncated)
    
    Rules:
    - Questions must be open-ended/conceptual but specific.
    - NO options (A, B, C, D).
    - STRICTLY Technical questions.
    - Provide a list of 3-5 keywords that a good answer should contain.
    
    Output JSON ONLY:
    [
        {{
            "id": "jd1",
            "text": "Question text...",
            "type": "subjective",
            "model_answer": "Expected key points...",
            "difficulty": "medium",
            "keywords": ["key1", "key2"]
        }},
        ...
    ]
    """
    print(f"⏳ Generating {count} questions (JD Batch)...")
    text = safe_generate(prompt)
    
    questions = parse_json_safely(text)
    
    if questions:
         # --- SHOW ANSWERS IN TERMINAL ---
        print("\n" + "="*40)
        print(f"🤖 GENERATED JD QUESTIONS & ANSWERS")
        print("="*40)
        for i, q in enumerate(questions):
            print(f"Q{i+1}: {q.get('text')}")
            print(f"✅ MODEL ANSWER: {q.get('model_answer', 'N/A')}")
            print("-"*20)
        print("="*40 + "\n")
        return questions

    print(f"⚠️ JD Gen Failed to Parse.")
    return []

def score_resume_with_gemini(resume_text: str, jd_text: str) -> dict:
    """
    Scores resume against JD using Gemini.
    Returns: { "score": int, "feedback": str, "status": "Shortlisted"|"Rejected" }
    """
    # Fail-safe prompt
    prompt = f"""
    You are an Expert ATS (Applicant Tracking System). 
    Compare the Resume below against the Job Description (JD).
    
    Job Description:
    {jd_text[:2000]}... (truncated)
    
    Resume:
    {resume_text[:2000]}... (truncated)
    
    Task:
    1. Rate the resume from 0 to 100 based on relevance to the JD, skills match, and experience.
    2. Provide a short reasoning (max 2 sentences).
    3. Determine status: "Shortlisted" if score >= 10 else "Rejected".
    
    Output JSON ONLY:
    {{
        "score": 85,
        "feedback": "Strong match for Python and backend skills...",
        "status": "Shortlisted"
    }}
    """
    
    print("⏳ Scoring Resume vs JD with Gemini...")
    response_text = safe_generate(prompt)
    
    try:
        import json
        # Extract JSON
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            return data
    except Exception as e:
        print(f"⚠️ Resume Scoring Parse Error: {e}")
    
    # Fallback
    return {"score": 65, "feedback": "AI Scoring Failed, fallback applied.", "status": "Rejected"}

def generate_psychometric_questions():
    """
    Generates 10 Psychometric/Aptitude MCQs.
    Returns list of questions with correct answers hidden/stored? 
    For simplicity, we returns questions with answer keys separate or we grade later.
    Actually, let's just return the full object and filter answers in main.py if needed.
    """
    count = 10
    prompt = f"""
    Generate {count} Psychometric & Aptitude MCQs for a software engineer candidate.
    Topics: Logic, Pattern Recognition, Workplace Ethics, Personality.
    
    Format JSON ONLY:
    [
        {{
            "id": 1,
            "text": "Question text...",
            "options": ["A) Opt 1", "B) Opt 2", "C) Opt 3", "D) Opt 4"],
            "correct_answer": "A"
        }},
        ...
    ]
    """
    print(f"⏳ Generating {count} Psychometric questions...")
    text = safe_generate(prompt)
    
    questions = parse_json_safely(text)
    
    if questions:
         # Add type for frontend rendering
        for q in questions:
            q['type'] = 'mcq'
        
        # --- SHOW ANSWERS IN TERMINAL ---
        print("\n" + "="*40)
        print(f"🤖 GENERATED PSYCHOMETRIC QUESTIONS & ANSWERS")
        print("="*40)
        for i, q in enumerate(questions):
            print(f"Q{i+1}: {q.get('text')}")
            print(f"✅ CORRECT ANSWER: {q.get('correct_answer', 'N/A')}")
            print("-"*20)
        print("="*40 + "\n")
        return questions
    
    print("⚠️ Psychometric Gen Failed to Parse.")
    return []

def evaluate_answers(questions: list, answers: list) -> dict:
    """
    Evaluates candidate answers against questions using Gemini.
    Returns: { "score": int, "feedback_list": [], "overall_feedback": str }
    """
    # ... (Existing implementation or updated logic if needed)
    # For now, keeping the previous placeholder or if it was overwritten, I'll ensure it's correct.
    # Since I am replacing the end of file, I need to make sure I include the previous evaluate_answers or rewrite it.
    pass 
    
    # RE-IMPLEMENTING evaluate_answers properly since I am overwriting the block
    prompt = "You are a Technical Interviewer. Evaluate these answers.\n\n"
    
    for i, q in enumerate(questions):
        # Handle potential dict access issues if q is not dict (though it should be)
        q_text = q.get('text', '') if isinstance(q, dict) else str(q)
        q_diff = q.get('difficulty', 'medium') if isinstance(q, dict) else 'medium'
        Keywords = q.get('keywords', []) if isinstance(q, dict) else []
        keyword_str = ", ".join(Keywords)
        
        ans = answers[i] if i < len(answers) else "No Answer"
        
        prompt += f"""
    Question {i+1}: {q_text}
    Difficulty: {q_diff}
    Expected Keywords: {keyword_str}
    Candidate Answer: {ans}
    -----------------------------------
    """

    prompt += """
    Tasks:
    1. Score each answer from 0 to 10.
    2. Final score out of 100.
    3. Return JSON:
    {
        "question_scores": [8, ...],
        "final_score": 75,
        "overall_feedback": "..."
    }
    """
    print("⏳ AI Evaluating Answers...")
    response_text = safe_generate(prompt)

    try:
        import json
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
    except Exception as e:
        print(f"⚠️ AI Eval Parse Error: {e}")
        return {"final_score": 0, "overall_feedback": "Error parsing evaluation."}

