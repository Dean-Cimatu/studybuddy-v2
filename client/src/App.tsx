function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
      <div className="text-6xl">📚</div>
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-2">StudyBuddy v2</h1>
        <p className="text-gray-400 text-lg">AI-powered student study companion</p>
      </div>
      <div className="flex gap-3 mt-4">
        <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
          React + Vite
        </span>
        <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
          TypeScript
        </span>
        <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
          Tailwind CSS
        </span>
      </div>
      <a
        href="/api/health"
        className="mt-6 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-lg text-sm font-medium"
      >
        Check API health →
      </a>
    </div>
  );
}

export default App;
