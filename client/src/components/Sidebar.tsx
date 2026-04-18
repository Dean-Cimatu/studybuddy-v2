export function Sidebar() {
  return (
    <aside className="flex flex-col h-full bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">🤖</span>
        <h2 className="text-sm font-semibold text-white">AI Study Assistant</h2>
        <span className="ml-auto text-xs bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">
          Coming soon
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl">
          💬
        </div>
        <div>
          <p className="text-sm text-gray-400 font-medium">Chat with your AI tutor</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-[200px]">
            Get explanations, generate practice questions, and summarise your notes.
          </p>
        </div>
      </div>

      <div className="mt-auto">
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 px-4 py-3 flex items-center gap-3 opacity-50 cursor-not-allowed">
          <input
            disabled
            placeholder="Ask anything…"
            className="flex-1 bg-transparent text-sm text-gray-500 placeholder-gray-600 focus:outline-none cursor-not-allowed"
          />
          <button disabled className="text-gray-600 text-sm">↑</button>
        </div>
      </div>
    </aside>
  );
}
