import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('generator'); // 'generator', 'analytics', 'manager'

    // --- Shared State ---
    const [savedTests, setSavedTests] = useState([]);
    const [candidates, setCandidates] = useState([]);

    // --- Generator State ---
    const [role, setRole] = useState("");
    const [jd, setJd] = useState("");
    const [generatedTest, setGeneratedTest] = useState(null);
    const [genLoading, setGenLoading] = useState(false);

    // --- Analytics State ---
    const [filters, setFilters] = useState({ university: '', search: '' });
    const [selectedCandidate, setSelectedCandidate] = useState(null); // For detailed view

    // --- DB Manager State ---
    const [managerMode, setManagerMode] = useState('assessments'); // 'assessments' or 'candidates'
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [editingTest, setEditingTest] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        if (!token) {
            navigate('/admin');
            return;
        }
        fetchAssessments();
        if (activeTab === 'analytics' || activeTab === 'manager') fetchCandidates();
    }, [activeTab]);

    const fetchAssessments = () => {
        fetch("http://localhost:8000/assessments")
            .then(res => res.json())
            .then(data => setSavedTests(data))
            .catch(err => console.error(err));
    };

    const fetchCandidates = () => {
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
    // Assessment Management
    const handleEditSelect = async (id) => {
        setSelectedTestId(id);
        try {
            const response = await fetch(`http://localhost:8000/assessments/${id}`);
            const data = await response.json();
            setEditingTest(data);
        } catch (err) { console.error(err); }
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
            } else alert("Failed to save changes.");
        } catch (err) { console.error(err); alert("Error saving."); }
    };

    const handleDeleteAssessment = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Delete this assessment?")) return;
        try {
            await fetch(`http://localhost:8000/assessments/${id}`, { method: 'DELETE' });
            fetchAssessments();
            if (selectedTestId === id) { setSelectedTestId(null); setEditingTest(null); }
        } catch (err) { alert("Failed to delete"); }
    };

    // Candidate Management
    const handleDeleteCandidate = async (id) => {
        if (!window.confirm("PERMANENTLY DELETE this candidate? This cannot be undone.")) return;
        try {
            await fetch(`http://localhost:8000/candidate/${id}`, { method: 'DELETE' });
            fetchCandidates();
            if (selectedCandidate && selectedCandidate.id === id) setSelectedCandidate(null);
            alert("Candidate Deleted.");
        } catch (err) { console.error(err); alert("Failed to delete candidate."); }
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
                    {['generator', 'analytics', 'manager'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 px-4 font-medium capitalize transition-colors ${activeTab === tab ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            {tab === 'manager' ? 'DB Manager' : tab}
                        </button>
                    ))}
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
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stage</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ATS Score</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Final Score</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredCandidates.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900 dark:text-gray-100">{c.name}</div>
                                            <div className="text-xs text-gray-500">{c.email}</div>
                                            <div className="text-xs text-gray-400">{c.university}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{c.role}</td>
                                        <td className="p-4 text-sm font-mono">{c.current_stage}</td>
                                        <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">{c.ats_score}</td>
                                        <td className="p-4 font-mono font-bold text-purple-600 dark:text-purple-400">{c.final_score}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${c.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                    c.status === 'Disqualified' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => setSelectedCandidate(c)}
                                                className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 rounded transition-colors"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCandidates.length === 0 && (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-400">No candidates found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Candidate Details Modal */}
                    {selectedCandidate && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
                                <button onClick={() => setSelectedCandidate(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedCandidate.name}</h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">{selectedCandidate.email} • {selectedCandidate.university}</p>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                            <h3 className="text-sm font-bold text-gray-500 uppercase">Role</h3>
                                            <p className="text-lg font-bold dark:text-white">{selectedCandidate.role}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                            <h3 className="text-sm font-bold text-gray-500 uppercase">Status</h3>
                                            <p className="text-lg font-bold dark:text-white">{selectedCandidate.status}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-lg dark:text-white mb-3">Performance Data</h3>
                                        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto text-gray-800 dark:text-gray-300">
                                            {JSON.stringify(selectedCandidate.stage_scores, null, 2)}
                                        </pre>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button onClick={() => handleDeleteCandidate(selectedCandidate.id)} className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700">Delete Candidate</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: DB MANAGER */}
            {activeTab === 'manager' && (
                <div className="max-w-7xl mx-auto">
                    <div className="flex space-x-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-max">
                        <button
                            onClick={() => setManagerMode('assessments')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${managerMode === 'assessments' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}
                        >
                            Assessments
                        </button>
                        <button
                            onClick={() => setManagerMode('candidates')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${managerMode === 'candidates' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}
                        >
                            Candidates
                        </button>
                    </div>

                    {managerMode === 'assessments' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 p-4">
                                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Select Assessment</h3>
                                <div className="space-y-2">
                                    {savedTests.map(t => (
                                        <div key={t.id} onClick={() => handleEditSelect(t.id)}
                                            className={`p-3 border rounded cursor-pointer transition-colors flex justify-between items-center ${selectedTestId === t.id ? 'bg-purple-50 border-purple-500 dark:bg-purple-900 dark:border-purple-400' : 'bg-gray-50 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100'}`}>
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.role_title}</span>
                                            <button onClick={(e) => handleDeleteAssessment(t.id, e)} className="text-gray-400 hover:text-red-500 px-2">Delete</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 p-6">
                                {!editingTest ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400"><p>Select assessment to edit</p></div>
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
                                                        <div className="mb-2">
                                                            <label className="text-xs text-gray-500">Question Text</label>
                                                            <textarea className="w-full text-sm p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" rows={2}
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

                    {managerMode === 'candidates' && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 dark:bg-gray-900 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {candidates.map(c => (
                                        <tr key={c.id}>
                                            <td className="p-4 font-mono text-xs">{c.id}</td>
                                            <td className="p-4 text-gray-900 dark:text-white font-medium">{c.name}</td>
                                            <td className="p-4 text-gray-500">{c.email}</td>
                                            <td className="p-4 text-gray-500">{c.role}</td>
                                            <td className="p-4">
                                                <button onClick={() => handleDeleteCandidate(c.id)} className="text-red-600 hover:text-red-800 font-bold text-xs border border-red-200 px-3 py-1 rounded">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {candidates.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">No candidates found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
