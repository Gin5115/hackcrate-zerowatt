import google.generativeai as genai
import time
from google.api_core.exceptions import TooManyRequests
import re

# Configure Gemini
genai.configure(api_key="AIzaSyB3BVgmbMqmjGgBafGw6S6RLbArVWjvIc4")
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

def generate_resume_questions(resume_text: str):
    # Single batch request for 20 questions
    count = 20
    # distribution: 6 Easy, 8 Medium, 6 Hard
    prompt = f"""
Generate {count} Technical MCQs based on the resume below.
Distribution: 6 EASY, 8 MEDIUM, 6 HARD.

Rules:
- Questions must be strictly technical (Coding, Frameworks, DBs, Algorithms).
- Ignore soft skills or generic statements.
- 4 options (A, B, C, D).
- Correct answer must be ONLY ONE LETTER.
- No brackets or symbols in answer.
- Clearly label difficulty for each question.

Resume:
{resume_text}

Format:
Q1. [Difficulty: EASY] Question Text Here
A) Option A
B) Option B
C) Option C
D) Option D
Correct Answer: A
"""
    print(f"⏳ Generating {count} questions (Resume Batch)...")
    text = safe_generate(prompt)
    return parse_questions(text)

def generate_jd_questions(jd_text: str):
    count = 20
    # distribution: 6 Easy, 8 Medium, 6 Hard
    prompt = f"""
Generate {count} Technical SUBJECTIVE (Short Answer) questions based on this Job Description.
Distribution: 6 EASY, 8 MEDIUM, 6 HARD.

Job Description:
{jd_text}

Rules:
- Questions must be open-ended/conceptual but specific enough to answer in 2-3 sentences.
- NO options (A, B, C, D).
- STRICTLY Technical questions.
- Provide a list of 3-5 keywords that a good answer should contain.
- Clearly label difficulty.

Format:
Q1. [Difficulty: MEDIUM] Question Text Here
Keywords: key1, key2, key3

Q2. [Difficulty: EASY] ...
"""
    print(f"⏳ Generating {count} questions (JD Batch)...")
    text = safe_generate(prompt)
    return parse_questions(text)

def parse_questions(text: str):
    all_questions = []
    
    # 1. Clean Text: Remove obvious prompt echoes if they exist
    # If the text starts with "Generate 20...", cut it.
    if "Generate" in text[:50] and "questions" in text[:50]:
        # Try to find the start of the actual output
        start_match = re.search(r'(Q1\.|1\.|Here are)', text)
        if start_match:
            text = text[start_match.start():]

    # 2. Split into blocks using strict pattern
    # Looks for newline + "Q" + number + "dot/paren" OR newline + number + "dot/paren"
    # Added capture group to keep the delimiter to check numbering
    blocks = re.split(r'\n(?:Q)?(\d+)[\.:\)]', text)
    
    # re.split with capture group returns [preamble, delim1, block1, delim2, block2...]
    # We skip preamble (0) and then iterate pairs
    
    current_q_id = 1
    
    # If blocks[0] is not empty, it's preamble.
    start_idx = 1 if len(blocks) > 1 else 0
    
    # If split failed (len=1), try fallback line-by-line or simple split
    if len(blocks) < 3:
         # Fallback: Split by double newline and look for structure
         raw_blocks = text.split('\n\n')
         blocks = []
         for rb in raw_blocks:
             if "Difficulty:" in rb or "Keywords:" in rb:
                 blocks.append("0") # dummy delim
                 blocks.append(rb)
         start_idx = 0

    import time
    
    for i in range(start_idx, len(blocks), 2):
        if i+1 >= len(blocks): break
        
        # delim = blocks[i] # e.g. "1" or "0"
        content = blocks[i+1].strip()
        
        if not content: continue
        
        lines = content.split('\n')
        
        # Extract Difficulty
        difficulty = "medium"
        header = lines[0]
        
        # Difficulty pattern: [Difficulty: Easy] or (Difficulty: Easy)
        diff_match = re.search(r'[\[\(]Difficulty:\s*(\w+)[\]\)]', header, re.IGNORECASE)
        if diff_match:
            difficulty = diff_match.group(1).lower()
            # Clean header
            header = header.replace(diff_match.group(0), "").strip()
            
        question_text = header.strip()
        if not question_text:
             # Maybe text is on next line?
             if len(lines) > 1: question_text = lines[1].strip()
        
        # Extract Keywords
        keywords = []
        for line in lines:
            if "Keywords:" in line or "keywords:" in line:
                k_text = line.replace("Keywords:", "").replace("keywords:", "").strip()
                keywords = [k.strip().lower() for k in k_text.split(',')]
        
        # Fallback if no keywords found (AI fails often)
        if not keywords:
            keywords = ["technical", "concept"]

        all_questions.append({
            "id": f"gen_{int(time.time())}_{current_q_id}", 
            "text": question_text,
            "type": "subjective",
            "options": [],
            "difficulty": difficulty,
            "keywords": keywords
        })
        current_q_id += 1
        
    return all_questions

def evaluate_answers(questions: list, answers: list) -> dict:
    """
    Evaluates candidate answers against questions using Gemini.
    Returns: { "score": int, "feedback_list": [], "overall_feedback": str }
    """
    prompt = "You are a Technical Interviewer. Evaluate these answers.\n\n"
    
    for i, q in enumerate(questions):
        ans = answers[i] if i < len(answers) else "No Answer"
        keywords = ", ".join(q.get('keywords', []))
        prompt += f"""
Question {i+1}: {q.get('text')}
Difficulty: {q.get('difficulty')}
Expected Keywords/Concepts: {keywords}
Candidate Answer: {ans}
-----------------------------------
"""

    prompt += """
Tasks:
1. Score each answer from 0 to 10 based on correctness and depth.
2. Provide a 1-sentence feedback for each answer.
3. Calculate a final score out of 100 (average of individual scores * 10).

Output Format:
Return ONLY a valid JSON object:
{
    "question_scores": [8, 5, 0, ...],
    "question_feedback": ["Good detail", "Vague", "Incorrect", ...],
    "final_score": 75,
    "overall_feedback": "Candidate has strong knowledge in X but lacks Y."
}
"""
    print("⏳ AI Evaluating Answers...")
    response_text = safe_generate(prompt)
    print(f"AI Raw Eval Response: {response_text}") # Debug Log

    try:
        # Robust JSON Extraction using regex
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            clean_json = json_match.group(0)
            import json
            data = json.loads(clean_json)
            return data
        else:
            raise ValueError("No JSON found in response")
            
    except Exception as e:
        print(f"⚠️ AI Eval Parse Error: {e}")
        return {
            "final_score": 50,
            "overall_feedback": f"Evaluation completed but parsing failed: {str(e)}",
            "question_scores": [0] * len(questions),
            "question_feedback": ["Pending Review"] * len(questions) 
        }

def generate_feedback(answers: list, score: int):
    # Legacy wrapper if needed, but we use evaluate_answers now
    pass
