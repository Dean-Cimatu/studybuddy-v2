import { Link } from 'react-router-dom';
import { ModuleList } from '../components/ModuleList';

export function ModulesListPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3 flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-semibold text-slate-800 dark:text-slate-100">Modules</h1>
        <p className="text-xs text-slate-400 hidden sm:block">
          · Add your university to connect with classmates on the same course
        </p>
      </header>

      <div className="flex-1 px-4 md:px-6 py-6 max-w-3xl mx-auto w-full">
        <ModuleList />
      </div>
    </div>
  );
}
