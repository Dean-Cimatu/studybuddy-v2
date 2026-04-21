import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pwa-install-dismissed')) return;

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!visible || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    localStorage.setItem('pwa-install-dismissed', '1');
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg px-4 py-3 flex items-center gap-3 md:max-w-sm md:left-auto md:right-4 md:bottom-4 md:rounded-xl md:border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">Add StudyBuddy to your home screen</p>
        <p className="text-xs text-slate-500">Study on the go — no browser needed</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={handleDismiss} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">
          Dismiss
        </button>
        <button onClick={() => void handleInstall()} className="btn-primary text-xs px-3 py-1.5">
          Install
        </button>
      </div>
    </div>
  );
}
