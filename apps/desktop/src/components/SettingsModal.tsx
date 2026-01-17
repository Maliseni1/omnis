import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Monitor, Cpu, Type, RefreshCw, CheckCircle, AlertCircle, Download } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateAvailable?: boolean; // Prop to indicate if app knows update exists
}

// Define the shape of the response from the main process
interface UpdateCheckResult {
  update: boolean;
  current: string;
  latest?: string;
  url?: string;
  error?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, updateAvailable }) => {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'available' | 'uptodate' | 'error'>('idle');
  const [versionInfo, setVersionInfo] = useState<{ current: string, latest?: string, url?: string }>({ current: '0.1.0' });

  useEffect(() => {
    if (isOpen && updateAvailable) {
        setStatus('available');
    }
  }, [isOpen, updateAvailable]);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setStatus('idle');
    try {
      // Call backend via IPC and cast the result
      const result = (await window.ipcRenderer.invoke('app:checkUpdate')) as UpdateCheckResult;
      
      setVersionInfo({ current: result.current, latest: result.latest, url: result.url });
      
      if (result.update) {
        setStatus('available');
      } else {
        setStatus('uptodate');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section: Updates */}
          <section className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
              <RefreshCw size={16} /> Updates & Version
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
               <div className="flex justify-between items-center mb-4">
                 <div>
                   <p className="text-slate-200 font-medium">Current Version: <span className="font-mono text-indigo-400">{versionInfo.current}</span></p>
                   <p className="text-slate-500 text-xs">Omnis is checking for updates automatically.</p>
                 </div>
                 <button 
                    onClick={handleCheckUpdate}
                    disabled={checking}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                 >
                    {checking ? <RefreshCw size={14} className="animate-spin" /> : 'Check Now'}
                 </button>
               </div>

               {/* Status Messages */}
               {status === 'uptodate' && (
                 <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                    <CheckCircle size={16} /> You are on the latest version.
                 </div>
               )}

               {status === 'available' && (
                 <div className="flex flex-col gap-3 text-indigo-300 text-sm bg-indigo-500/10 p-4 rounded-lg border border-indigo-500/20">
                    <div className="flex items-center gap-2 font-semibold text-indigo-200">
                       <Download size={16} /> New Update Available ({versionInfo.latest})
                    </div>
                    <p>A new version of Omnis is ready to download.</p>
                    {versionInfo.url && (
                        <button onClick={() => window.open(versionInfo.url, '_blank')} className="self-start text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-500">
                            Download from GitHub
                        </button>
                    )}
                 </div>
               )}

               {status === 'error' && (
                 <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <AlertCircle size={16} /> Failed to check for updates. Check internet connection.
                 </div>
               )}
            </div>
          </section>

          {/* Section: Appearance */}
          <section className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
              <Monitor size={16} /> Appearance
            </h3>
            <div className="grid grid-cols-3 gap-4">
               <ThemeOption label="System" icon={Monitor} active />
               <ThemeOption label="Dark" icon={Moon} />
               <ThemeOption label="Light" icon={Sun} disabled />
            </div>
          </section>

          {/* Section: AI Preferences */}
          <section className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
              <Cpu size={16} /> Intelligence
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-4 border border-slate-700">
               <div className="flex justify-between items-center">
                 <div>
                   <p className="text-slate-200 font-medium text-sm">Default Model</p>
                   <p className="text-slate-500 text-xs">Choose between speed (Local) and capability (Cloud).</p>
                 </div>
                 <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    <button className="px-3 py-1 bg-slate-700 rounded text-xs text-white shadow-sm">Local</button>
                    <button className="px-3 py-1 text-xs text-slate-400 hover:text-white">Cloud</button>
                 </div>
               </div>
            </div>
          </section>

          {/* Section: Editor */}
          <section className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
              <Type size={16} /> Editor
            </h3>
            <div className="space-y-2">
               <label className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <span className="text-sm text-slate-300 group-hover:text-white">Enable Spell Check</span>
                  <input type="checkbox" defaultChecked className="accent-indigo-500" />
               </label>
               <label className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <span className="text-sm text-slate-300 group-hover:text-white">Auto-Save Documents</span>
                  <input type="checkbox" defaultChecked className="accent-indigo-500" />
               </label>
            </div>
          </section>

        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-500">
           Omnis v{versionInfo.current} • Chiza Labs
        </div>

      </div>
    </div>
  );
};

const ThemeOption = ({ label, icon: Icon, active, disabled }: { label: string, icon: any, active?: boolean, disabled?: boolean }) => (
  <button 
    disabled={disabled}
    className={`
      flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all
      ${active 
        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 ring-1 ring-indigo-500' 
        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <Icon size={24} />
    <span className="text-xs font-medium">{label}</span>
  </button>
);