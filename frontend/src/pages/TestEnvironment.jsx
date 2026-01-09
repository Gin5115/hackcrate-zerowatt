import React, { useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { useNavigate } from 'react-router-dom';

function TestEnvironment() {
    const navigate = useNavigate();
    const [activeQuestion, setActiveQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Proctoring State
    const [tabSwitches, setTabSwitches] = useState(0);

    // Context
    const testType = localStorage.getItem("test_type") || "jd_test"; // psychometric, resume_test, jd_test
    const candidateEmail = localStorage.getItem("candidate_email");

    useEffect(() => {
        // 1. Fetch Questions based on Type
        let url = "";
        if (testType === 'psychometric') url = "http://localhost:8000/test/psychometric";
        else if (testType === 'resume_test') url = `http://localhost:8000/test/resume-questions/${candidateEmail}`;
        else {
            const id = localStorage.getItem("assessment_id");
            if (id) url = `http://localhost:8000/assessments/${id}`;
        }

        if (url) {
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    const qs = data.questions || data; // Handle different response structures
                    setQuestions(qs);
                    setLoading(false);
                })
                .catch(err => { console.error(err); setLoading(false); });
        }

        // 2. Proctoring Event Listeners
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitches(prev => {
                    const newVal = prev + 1;
                    if (newVal >= 3) {
                        // 3rd Strike: Disqualify
                        handleDisqualification();
                        return newVal;
                    } else {
                        alert(`⚠️ WARNING: Tab switching is monitored. Strike ${newVal}/3.`);
                    }
                    return newVal;
                });
            }
        };

        // DISABLE BACK BUTTON
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
            alert("You cannot go back during a test!");
        };
        window.addEventListener('popstate', handlePopState);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        enterFullscreen();

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen().catch(err => console.log(err));
    };

    const handleDisqualification = async () => {
        alert("maximum strikes reach pls contact the admin/hr");
        // Note: We could add a backend endpoint to explicitly set status=-1 (Disqualified) here.
        // For now, we reuse the completion endpoint but with a Failing Score (-1) or similar specific flag if we had one.
        // Let's just fail this stage with 0 score.
        await fetch("http://localhost:8000/candidate/disqualify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: candidateEmail,
                reason: "reached max strikes contact support or admin or hr"
            }),
        });

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log(err));
        }
        navigate('/candidate/application');
    };

    const handleSubmit = async () => {
        // Different endpoint for final stage submission vs intermediate stages
        if (testType === 'jd_test') {
            const finalAnswers = questions.map((q, idx) => answers[idx] || "No answer");
            await fetch("http://localhost:8000/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidate_name: localStorage.getItem("candidate_name"),
                    candidate_email: candidateEmail,
                    university: localStorage.getItem("candidate_university"),
                    assessment_id: parseInt(localStorage.getItem("assessment_id")) || 0,
                    answers: finalAnswers
                }),
            });
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
            navigate('/success');
        } else {
            // Intermediate Stage Completion
            let currentStageId = 2;
            if (testType === 'resume_test') currentStageId = 3;

            // Calculate a mock score for this stage
            const score = Math.floor(Math.random() * 30) + 70; // Mock score 70-100

            await fetch("http://localhost:8000/stage/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: candidateEmail,
                    stage: currentStageId,
                    score: score,
                    feedback: "Stage Completed Successfully."
                }),
            });
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
            navigate('/candidate/application'); // Return to Pipeline
        }
    }


    if (loading) return <div className="h-screen bg-[#1e1e1e] text-white flex items-center justify-center">Loading Test Environment...</div>;

    const q = questions[activeQuestion];
    if (!q) return <div>Error loading question</div>;

    return (
        <div className="h-screen flex flex-col bg-[#1e1e1e] font-sans text-gray-300">
            {/* Header */}
            <div className="bg-[#252526] border-b border-[#333] px-6 py-3 flex justify-between items-center shadow-sm h-14">
                <div className="flex items-center gap-3">
                    <h1 className="font-bold text-gray-100 tracking-wide">
                        {testType === 'psychometric' ? "Psychometric Evaluation" :
                            testType === 'resume_test' ? "Resume Validation" : "Final Assessment"}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {/* Proctoring Status */}
                    <div className={`text-xs font-bold px-3 py-1 rounded flex items-center gap-2 ${tabSwitches > 0 ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                        <span>Proctoring Active</span> {tabSwitches > 0 && `(Strikes: ${tabSwitches}/3)`}
                    </div>
                    <div className="text-red-400 font-mono text-sm font-bold bg-[#3c1e1e] px-3 py-1 rounded">
                        30:00
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel */}
                <div className="w-1/3 bg-[#252526] border-r border-[#333] flex flex-col p-6">
                    <h2 className="text-sm font-mono text-[#569cd6] font-bold mb-2">QUESTION {activeQuestion + 1}</h2>
                    <p className="text-lg text-gray-100 mb-6">{q.text}</p>

                    {/* Navigation */}
                    <div className="mt-auto flex gap-2">
                        {questions.map((_, idx) => (
                            <button key={idx} onClick={() => setActiveQuestion(idx)}
                                className={`w-8 h-8 rounded text-sm font-bold ${activeQuestion === idx ? 'bg-[#007acc] text-white' : 'bg-[#3c3c3c] hover:bg-[#4a4a4a]'}`}>
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="flex-1 bg-[#1e1e1e] flex flex-col relative">
                    {q.type === 'mcq' ? (
                        <div className="p-10 space-y-4">
                            {q.options.map(opt => (
                                <label key={opt} className="flex items-center gap-3 p-4 bg-[#252526] rounded-lg border border-[#333] cursor-pointer hover:bg-[#2d2d2d] transition-colors">
                                    <input type="radio" name={`q-${q.id}`} className="w-5 h-5 accent-blue-500"
                                        checked={answers[activeQuestion] === opt}
                                        onChange={() => setAnswers({ ...answers, [activeQuestion]: opt })}
                                    />
                                    <span className="text-gray-200 text-lg">{opt}</span>
                                </label>
                            ))}
                        </div>
                    ) : q.type === 'code' ? (
                        <Editor height="100%" defaultLanguage="python" theme="vs-dark"
                            value={answers[activeQuestion] || "# Code here"}
                            onChange={(val) => setAnswers({ ...answers, [activeQuestion]: val })}
                            options={{ fontSize: 14, minimap: { enabled: false } }} />
                    ) : (
                        <textarea className="w-full h-full bg-[#1e1e1e] text-gray-300 p-6 outline-none resize-none font-mono text-base"
                            placeholder="Type your answer..."
                            value={answers[activeQuestion] || ""}
                            onChange={(e) => setAnswers({ ...answers, [activeQuestion]: e.target.value })}
                        />
                    )}

                    <div className="absolute bottom-4 right-6">
                        <button onClick={handleSubmit} className="px-6 py-3 bg-[#007acc] text-white rounded font-bold hover:bg-[#0063a5] shadow-lg">
                            {testType === 'jd_test' ? 'Submit Final Assessment' : 'Complete Stage'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

}

export default TestEnvironment;
