import { useState, useEffect } from 'react'

function App() {
  const [status, setStatus] = useState("Connecting...");

  // 1. Test Backend Connection on Load
  useEffect(() => {
    fetch("http://localhost:8000/")
      .then((res) => res.json())
      .then((data) => setStatus(data.message))
      .catch(() => setStatus("Backend Disconnected 🔴"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">

      {/* Header Section based on Problem Statement */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-blue-900 mb-2">Softrate AI Hiring</h1>
        <p className="text-gray-600">Hackcrate 2026 Track 2 Solution</p>

        {/* Connection Status Indicator */}
        <div className={`mt-4 px-4 py-2 rounded-full inline-block text-sm font-semibold ${status.includes("Running") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
          System Status: {status}
        </div>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">

        {/* Module 1: Admin Setup */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-gray-100">
          <h2 className="text-2xl font-bold mb-2">1. Admin Setup</h2>
          <p className="text-gray-500 mb-4">Upload JD and generate AI assessments.</p>
          <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Create Assessment
          </button>
        </div>

        {/* Module 2: Candidate Test */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-gray-100">
          <h2 className="text-2xl font-bold mb-2">2. Candidate View</h2>
          <p className="text-gray-500 mb-4">Take the proctored, skill-based exam.</p>
          <button className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900">
            Enter Test Environment
          </button>
        </div>

      </div>
    </div>
  )
}

export default App
