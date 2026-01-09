import { useState, useEffect } from 'react'

function App() {
  const [status, setStatus] = useState("Connecting...");
  const [view, setView] = useState("home"); // 'home', 'admin', 'candidate'

  // Admin State
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [generatedTest, setGeneratedTest] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/")
      .then((res) => res.json())
      .then((data) => setStatus(data.message))
      .catch(() => setStatus("Backend Disconnected 🔴"));
  }, []);

  const handleGenerate = async () => {
    const response = await fetch("http://localhost:8000/generate-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_title: role, jd_text: jd }),
    });
    const data = await response.json();
    setGeneratedTest(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-blue-900 cursor-pointer" onClick={() => setView('home')}>Softrate AI</h1>
        <div className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">{status}</div>
      </div>

      {/* VIEW: HOME */}
      {view === 'home' && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border-t-4 border-blue-500" onClick={() => setView('admin')}>
            <h2 className="text-2xl font-bold mb-2">👮 Admin Portal</h2>
            <p className="text-gray-500">Create new assessments from JDs.</p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border-t-4 border-purple-500" onClick={() => setView('candidate')}>
            <h2 className="text-2xl font-bold mb-2">👩‍💻 Candidate Portal</h2>
            <p className="text-gray-500">Take assessment (IDE & Camera).</p>
          </div>
        </div>
      )}

      {/* VIEW: ADMIN */}
      {view === 'admin' && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg">
          <button onClick={() => setView('home')} className="text-gray-400 hover:text-gray-600 mb-4">← Back</button>
          <h2 className="text-2xl font-bold mb-6">Create New Assessment</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Role Title</label>
              <input type="text" className="w-full border p-2 rounded mt-1" placeholder="e.g. Python Developer" value={role} onChange={e => setRole(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Paste Job Description (JD)</label>
              <textarea className="w-full border p-2 rounded mt-1 h-32" placeholder="Paste JD here..." value={jd} onChange={e => setJd(e.target.value)} />
            </div>
            <button onClick={handleGenerate} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
              Generate AI Assessment ⚡
            </button>
          </div>

          {/* Results Preview */}
          {generatedTest && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-lg mb-2">✅ Generated for: {generatedTest.role}</h3>
              <div className="flex gap-2 mb-4">
                {generatedTest.suggested_skills.map(skill => (
                  <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{skill}</span>
                ))}
              </div>
              <div className="space-y-3">
                {generatedTest.questions.map((q) => (
                  <div key={q.id} className="p-3 bg-white border rounded shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase">{q.type}</span>
                    <p className="text-gray-800">{q.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
