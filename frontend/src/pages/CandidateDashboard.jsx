import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResumeUpload from '../components/ResumeUpload';

function CandidateDashboard() {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const email = localStorage.getItem("candidate_email");
    const name = localStorage.getItem("candidate_name");

    useEffect(() => {
        if (!email) {
            navigate('/candidate');
            return;
        }

        // DISABLE BACK BUTTON
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
            alert("Navigation is disabled during the assessment. Please use the LOGOUT button.");
        };
        window.addEventListener('popstate', handlePopState);

        fetchStatus();

        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const fetchStatus = () => {
        const assessmentId = localStorage.getItem("assessment_id");
        if (!assessmentId) {
            navigate('/candidate/dashboard');
            return;
        }

        fetch(`http://localhost:8000/candidate/status/${email}/${assessmentId}`)
            .then(res => res.json())
            .then(data => {
                setStatus(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
                alert("Session expired or invalid. Redirecting to login...");
                localStorage.clear();
                window.location.href = "/candidate";
            });
    };

    const handleStartTest = (type) => {
        // type: 'psychometric', 'resume', 'jd'
        localStorage.setItem("test_type", type);
        navigate('/test');
    };

    const handleRestart = async () => {
        if (!window.confirm("Are you sure you want to RESTART? This will reset your progress to the resume stage.")) return;

        await fetch("http://localhost:8000/candidate/restart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, stage: 1, score: 0, feedback: "" })
        });
        fetchStatus();
    };

    if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading Profile...</div>;

    const currentStage = status.current_stage || 1; // Default to 1 (Resume)

    // Stage Renderers
    const renderStageCard = (level, title, description, isActive, isLocked, isCompleted, type) => (
        <div className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${isActive ? 'bg-white dark:bg-gray-800 border-purple-500 shadow-xl scale-105 z-10' :
            isCompleted ? 'bg-green-50 dark:bg-gray-900 border-green-500 opacity-80' :
                'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-50 grayscale'
            }`}>
            <div className="flex justify-between items-start mb-4">
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${isActive ? 'bg-purple-100 text-purple-700' :
                    isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                    Level {level}
                </span>
                {isCompleted && <span className="text-green-500 text-xl font-bold">Done</span>}
                {isLocked && <span className="text-gray-400 text-xl font-bold">Locked</span>}
            </div>

            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{description}</p>

            {isActive && level === 1 && (
                <div className="text-purple-600 font-bold text-sm">Action Required Below</div>
            )}

            {isActive && level > 1 && (
                <div className="space-y-3">
                    <button
                        onClick={() => handleStartTest(type)}
                        className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-lg animate-pulse"
                    >
                        Start Test
                    </button>

                </div>
            )}

            {isCompleted && status.stage_scores && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-bold text-gray-500 uppercase">Feedback</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {status.stage_scores[`stage_${level}`]?.feedback || status.stage_scores['resume']?.feedback || "Completed"}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans transition-colors duration-200 p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Your Application Pipeline</h1>
                        <p className="text-gray-600 dark:text-gray-400">Complete all stages for this role.</p>
                        <button
                            onClick={() => navigate('/candidate/dashboard')}
                            className="mt-2 text-sm text-purple-600 hover:text-purple-800 font-bold underline"
                        >
                            ← Switch Role / Back to Jobs
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            navigate('/candidate');
                        }}
                        className="text-red-500 font-medium hover:text-red-700 border border-red-200 dark:border-red-900 px-4 py-2 rounded-lg"
                    >
                        Logout
                    </button>
                </header>

                {/* Progress Pipeline */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    {renderStageCard(1, "Resume Screening", "AI Analysis of your fit.", currentStage === 1, currentStage < 1, currentStage > 1, 'resume_upload')}
                    {renderStageCard(2, "Psychometric", "Personality & Aptitude Check.", currentStage === 2, currentStage < 2, currentStage > 2, 'psychometric')}
                    {renderStageCard(3, "Resume Technical", "Questions involved in your Resume.", currentStage === 3, currentStage < 3, currentStage > 3, 'resume_test')}
                    {renderStageCard(4, "Final Assessment", "Core Skills based on JD.", currentStage === 4, currentStage < 4, currentStage > 4, 'jd_test')}
                </div>

                <div className="animate-fade-in-up">
                    {currentStage === 1 && (
                        <ResumeUpload onComplete={fetchStatus} assessmentId={localStorage.getItem("assessment_id")} />
                    )}

                    {/* REJECTED / DISQUALIFIED VIEW */}
                    {(status.status === "Rejected" || status.status === "Disqualified" || currentStage === -1) && (
                        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                            <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Application Ended</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                                Unfortunately, you did not meet the requirements for this role.
                            </p>

                            {/* Score Summary for Rejection */}
                            {status.stage_scores?.final && (
                                <div className="mb-8">
                                    <div className="inline-block bg-white dark:bg-gray-800 p-6 rounded-lg shadow-inner mb-4">
                                        <div className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
                                            {status.stage_scores.final.score} <span className="text-base text-gray-500">/ 100</span>
                                        </div>
                                        <p className="text-sm text-gray-500">Final Weighted Score</p>
                                    </div>

                                    {/* Breakdown Table for Rejection */}
                                    {status.stage_scores?.final?.breakdown && (
                                        <div className="max-w-2xl mx-auto overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                                                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-700 dark:text-gray-300">
                                                    <tr>
                                                        <th className="px-6 py-3">Assessment Module</th>
                                                        <th className="px-6 py-3 text-right">Your Score</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    <tr>
                                                        <td className="px-6 py-3">Resume Parsing (ATS)</td>
                                                        <td className="px-6 py-3 text-right font-bold">{status.stage_scores.final.breakdown.resume_parsing.score}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-3">Psychometric</td>
                                                        <td className="px-6 py-3 text-right font-bold">{status.stage_scores.final.breakdown.psychometric.score}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-3">Technical Interview</td>
                                                        <td className="px-6 py-3 text-right font-bold">{status.stage_scores.final.breakdown.resume_tech.score}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-3">JD Assessment</td>
                                                        <td className="px-6 py-3 text-right font-bold">{status.stage_scores.final.breakdown.jd_test.score}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="mt-4 text-gray-500 italic">
                                {status.stage_scores?.disqualification_reason || "Evaluation Criteria not met."}
                            </p>
                        </div>
                    )}

                    {/* QUALIFIED VIEW */}
                    {(status.status === "Qualified") && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-green-100 dark:border-green-900">
                            <div className="bg-green-600 p-6 text-center">
                                <h2 className="text-3xl font-bold text-white mb-2">🎉 Qualified for Interview!</h2>
                                <p className="text-green-100">You have passed the preliminary assessment rounds.</p>
                            </div>

                            <div className="p-8">
                                <div className="flex flex-col md:flex-row gap-8 items-center justify-center mb-8">
                                    {/* Final Score Circle */}
                                    <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-green-500 bg-green-50 dark:bg-gray-900">
                                        <div className="text-center">
                                            <div className="text-5xl font-bold text-green-600 dark:text-green-400">
                                                {status.stage_scores?.final?.score || 0}
                                            </div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Score</div>
                                        </div>
                                    </div>

                                    {/* Feedback Text */}
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">AI Evaluation Feedback</h3>
                                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {status.stage_scores?.final?.feedback || "Excellent performance across all domains. The recruitment team will contact you shortly for the Face-to-Face round."}
                                        </p>
                                    </div>
                                </div>

                                {/* Detailed Breakdown Table */}
                                {status.stage_scores?.final?.breakdown && (
                                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-700 dark:text-gray-300">
                                                <tr>
                                                    <th className="px-6 py-3">Assessment Module</th>
                                                    <th className="px-6 py-3">Weight</th>
                                                    <th className="px-6 py-3 text-right">Your Score</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                <tr className="bg-white dark:bg-gray-800">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Resume Parsing (ATS)</td>
                                                    <td className="px-6 py-4">20%</td>
                                                    <td className="px-6 py-4 text-right font-bold">{status.stage_scores.final.breakdown.resume_parsing.score}</td>
                                                </tr>
                                                <tr className="bg-white dark:bg-gray-800">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Psychometric Test</td>
                                                    <td className="px-6 py-4">20%</td>
                                                    <td className="px-6 py-4 text-right font-bold">{status.stage_scores.final.breakdown.psychometric.score}</td>
                                                </tr>
                                                <tr className="bg-white dark:bg-gray-800">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Technical (Resume Based)</td>
                                                    <td className="px-6 py-4">30%</td>
                                                    <td className="px-6 py-4 text-right font-bold">{status.stage_scores.final.breakdown.resume_tech.score}</td>
                                                </tr>
                                                <tr className="bg-white dark:bg-gray-800">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Job Simulation (JD Test)</td>
                                                    <td className="px-6 py-4">30%</td>
                                                    <td className="px-6 py-4 text-right font-bold">{status.stage_scores.final.breakdown.jd_test.score}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CandidateDashboard;
