import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('generator'); // 'generator', 'analytics', 'manager'

    // --- Shared State ---
    const [savedTests, setSavedTests] = useState([]);

    // --- Generator State ---
    const [role, setRole] = useState("");
    const [jd, setJd] = useState("");
    const [generatedTest, setGeneratedTest] = useState(null);
    const [genLoading, setGenLoading] = useState(false);

    // --- Analytics State ---
    const [candidates, setCandidates] = useState([]);
    const [filters, setFilters] = useState({ university: '', search: '' });

    // --- DB Manager State ---
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [editingTest, setEditingTest] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        if (!token) {
            navigate('/admin');
            return;
        }
        fetchAssessments();
        if (activeTab === 'analytics') fetchAnalytics();
    }, [activeTab]);

    const fetchAssessments = () => {
        fetch("http://localhost:8000/assessments")
            .then(res => res.json())
            .then(data => setSavedTests(data))
            .catch(err => console.error(err));
    };

    const fetchAnalytics = () => {
        fetch("http://localhost:8000/candidates")
            .then(res => res.json())
            .then(data => setCandidates(data))
            .catch(err => console.error(err));
    };

    // --- GENERATOR LOGIC ---
    const handleGenerate = async () => {
        setGenLoading(true);
        try {
            const response = await fetch("http://localhost:8000/generate-assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role_title: role, jd_text: jd }),
            });
            const data = await response.json();
            setGeneratedTest(data);
            alert("Assessment Generated & Saved Successfully");
            fetchAssessments();
        } catch (error) {
            alert("Failed to generate assessment");
        }
        setGenLoading(false);
    };

    // --- ANALYTICS LOGIC ---
    const filteredCandidates = candidates.filter(c => {
        const matchUni = filters.university ? (c.university || "").toLowerCase().includes(filters.university.toLowerCase()) : true;
        const matchSearch = filters.search ? (c.name.toLowerCase().includes(filters.search.toLowerCase()) || c.email.toLowerCase().includes(filters.search.toLowerCase())) : true;
        return matchUni && matchSearch;
    });

    // --- DB MANAGER LOGIC ---
    const handleEditSelect = async (id) => {
        setSelectedTestId(id);
        try {
            const response = await fetch(`http://localhost:8000/assessments/${id}`);
            const data = await response.json();
            setEditingTest(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveChanges = async () => {
        if (!editingTest || !selectedTestId) return;
        try {
            const response = await fetch(`http://localhost:8000/assessments/${selectedTestId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingTest),
            });
            if (response.ok) {
                alert("Changes Saved");
                fetchAssessments();
            } else {
                alert("Failed to save changes.");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving.");
        }
    };

    const handleDelete = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Delete this assessment?")) return;
        try {
            await fetch(`http://localhost:8000/assessments/${id}`, { method: 'DELETE' });
            fetchAssessments();
            if (selectedTestId === id) {
                setSelectedTestId(null);
                setEditingTest(null);
            }
        } catch (err) { alert("Failed to delete"); }
    };

    const handleLogout = () => {
        localStorage.removeItem("admin_token");
        navigate('/admin');
    };


    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 p-8 font-sans transition-colors duration-200">
            {/* Header & Tabs */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Admin Dashboard</h1>
                    <button onClick={handleLogout} className="text-red-600 hover:text-red-800 font-medium border border-red-200 dark:border-red-900 px-4 py-2 rounded-lg bg-red-50 dark:bg-gray-800">
                        Logout
                    </button>
                </div>

                <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('generator')}
                        className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'generator' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Generator
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'analytics' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('manager')}
                        className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'manager' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        DB Manager
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: GENERATOR */}
            {activeTab === 'generator' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 border-r dark:border-gray-700 pr-8 flex flex-col">
                        <h2 className="text-xl font-bold mb-4 dark:text-gray-200">New Assessment</h2>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">Role Title</label>
                                <input type="text" className="w-full border dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Senior Frontend Engineer" value={role} onChange={e => setRole(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">Job Description</label>
                                <textarea className="w-full border dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded-lg mt-1 h-32 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Paste JD..." value={jd} onChange={e => setJd(e.target.value)} />
                            </div>
                            <button onClick={handleGenerate} disabled={genLoading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
                                {genLoading ? "Generating..." : "Generate & Save"}
                            </button>
                        </div>

                        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Recently Saved</h3>
                        <div className="space-y-2 pr-2">
                            {savedTests.map(t => (
                                <div key={t.id} className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-sm text-sm flex justify-between items-center text-gray-800 dark:text-gray-200">
                                    <span>{t.role_title}</span>
                                    <span className="text-xs text-gray-400">#{t.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-inner border dark:border-gray-700 min-h-[500px]">
                        {!generatedTest ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400"><p>Generated preview will appear here</p></div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{generatedTest.role}</h3><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">SAVED</span></div>
                                <div className="space-y-4">{generatedTest.questions.map((q, idx) => (
                                    <div key={idx} className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm">
                                        <p className="text-gray-800 dark:text-gray-200 text-sm font-medium">{q.text}</p>
                                    </div>
                                ))}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ANALYTICS */}
            {activeTab === 'analytics' && (
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border dark:border-gray-700 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filter by University</label>
                                <input type="text" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="e.g. Harvard" value={filters.university} onChange={e => setFilters({ ...filters, university: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search Candidate</label>
                                <input type="text" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Name or Email..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
                            </div>
                            <div className="flex items-end">
                                <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-bold w-full text-center">
                                    Total Candidates: {filteredCandidates.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border dark:border-gray-700">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">University</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredCandidates.map(c => (
                                    <tr key={c.submission_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900 dark:text-gray-100">{c.name}</div>
                                            <div className="text-xs text-gray-500">{c.email}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{c.university}</td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{c.role}</td>
                                        <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">{c.score}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${c.status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCandidates.length === 0 && (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-400">No candidates found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: DB MANAGER */}
            {activeTab === 'manager' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 p-4">
                        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Select Assessment to Edit</h3>
                        <div className="space-y-2">
                            {savedTests.map(t => (
                                <div key={t.id} onClick={() => handleEditSelect(t.id)}
                                    className={`p-3 border rounded cursor-pointer transition-colors flex justify-between items-center ${selectedTestId === t.id ? 'bg-purple-50 border-purple-500 dark:bg-purple-900 dark:border-purple-400' : 'bg-gray-50 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100'}`}>
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.role_title}</span>
                                    <button onClick={(e) => handleDelete(t.id, e)} className="text-gray-400 hover:text-red-500 px-2">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 p-6">
                        {!editingTest ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400"><p>Select an assessment to edit database records</p></div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold dark:text-white">Editing: {editingTest.role}</h2>
                                    <button onClick={handleSaveChanges} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md">Save Changes</button>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Role Title</label>
                                    <input type="text" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={editingTest.role} onChange={e => setEditingTest({ ...editingTest, role: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Questions Schema (JSON)</label>
                                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-600 space-y-4">
                                        {editingTest.questions.map((q, idx) => (
                                            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded border dark:border-gray-700 shadow-sm relative group">
                                                <span className="absolute top-2 right-2 text-xs font-mono text-gray-400">ID: {q.id}</span>
                                                <div className="grid grid-cols-2 gap-4 mb-2">
                                                    <div>
                                                        <label className="text-xs text-gray-500">Type</label>
                                                        <select className="w-full text-sm border rounded p-1 dark:bg-gray-700 dark:text-white"
                                                            value={q.type}
                                                            onChange={e => {
                                                                const newQs = [...editingTest.questions];
                                                                newQs[idx].type = e.target.value;
                                                                setEditingTest({ ...editingTest, questions: newQs });
                                                            }}>
                                                            <option value="code">Code</option>
                                                            <option value="subjective">Subjective</option>
                                                            <option value="mcq">MCQ</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">Difficulty</label>
                                                        <select className="w-full text-sm border rounded p-1 dark:bg-gray-700 dark:text-white"
                                                            value={q.difficulty}
                                                            onChange={e => {
                                                                const newQs = [...editingTest.questions];
                                                                newQs[idx].difficulty = e.target.value;
                                                                setEditingTest({ ...editingTest, questions: newQs });
                                                            }}>
                                                            <option value="easy">Easy</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="hard">Hard</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">Question Text</label>
                                                    <textarea className="w-full text-sm p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" rows={3}
                                                        value={q.text}
                                                        onChange={e => {
                                                            const newQs = [...editingTest.questions];
                                                            newQs[idx].text = e.target.value;
                                                            setEditingTest({ ...editingTest, questions: newQs });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
