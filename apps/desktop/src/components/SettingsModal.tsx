import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Monitor, Cpu, Type, RefreshCw, CheckCircle, AlertCircle, Download } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateAvailable?: boolean;
  currentTheme: 'dark' | 'light' | 'system';
  effectiveTheme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light' | 'system') => void;
  defaultAiMode: 'local' | 'cloud';
  onDefaultAiModeChange: (mode: 'local' | 'cloud') => void;
  spellCheckEnabled: boolean;
  onSpellCheckEnabledChange: (enabled: boolean) => void;
  autoSaveEnabled: boolean;
  onAutoSaveEnabledChange: (enabled: boolean) => void;
}

// Define the shape of the update check result from the main process
interface UpdateCheckResult {
  update: boolean;
  current: string;
  latest?: string;
  url?: string;
  error?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  updateAvailable,
  currentTheme,
  effectiveTheme,
  onThemeChange,
  defaultAiMode,
  onDefaultAiModeChange,
  spellCheckEnabled,
  onSpellCheckEnabledChange,
  autoSaveEnabled,
  onAutoSaveEnabledChange
}) => {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'available' | 'uptodate' | 'error'>('idle');
  const [versionInfo, setVersionInfo] = useState<{ current: string, latest?: string, url?: string }>({ current: '0.1.1' });

  useEffect(() => {
    if (isOpen && updateAvailable) {
        setStatus('available');
    }
  }, [isOpen, updateAvailable]);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setStatus('idle');
    try {
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

  // Dynamic styles based on effectiveTheme
  const isDark = effectiveTheme === 'dark';
  const modalBg = isDark ? "bg-slate-900" : "bg-white";
  const modalBorder = isDark ? "border-slate-700" : "border-slate-200";
  const textMain = isDark ? "text-white" : "text-slate-900";
  const textSub = isDark ? "text-slate-400" : "text-slate-500";
  const sectionHeader = isDark ? "text-slate-500" : "text-slate-400";
  const optionBgActive = isDark ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 ring-1 ring-indigo-500" : "bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-200";
  const optionBgInactive = isDark ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900";

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`${modalBg} ${modalBorder} border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden transition-colors duration-300`}>
        
        {/* Header */}
        <div className={`p-6 border-b ${modalBorder} flex justify-between items-center`}>
          <h2 className={`text-xl font-semibold ${textMain}`}>Settings</h2>
          <button onClick={onClose} className={`p-2 rounded-lg ${textSub} hover:bg-opacity-10 hover:bg-slate-500 hover:text-opacity-80 transition-colors`}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section: Appearance */}
          <section className="space-y-4">
            <h3 className={`text-sm uppercase tracking-wider ${sectionHeader} font-bold flex items-center gap-2`}>
              <Monitor size={16} /> Appearance
            </h3>
            <div className="grid grid-cols-3 gap-4">
               <ThemeOption 
                  label="System" 
                  icon={Monitor} 
                  active={currentTheme === 'system'} 
                  onClick={() => onThemeChange('system')}
                  activeClass={optionBgActive}
                  inactiveClass={optionBgInactive}
               />
               <ThemeOption 
                  label="Dark" 
                  icon={Moon} 
                  active={currentTheme === 'dark'} 
                  onClick={() => onThemeChange('dark')}
                  activeClass={optionBgActive}
                  inactiveClass={optionBgInactive}
               />
               <ThemeOption 
                  label="Light" 
                  icon={Sun} 
                  active={currentTheme === 'light'} 
                  onClick={() => onThemeChange('light')}
                  activeClass={optionBgActive}
                  inactiveClass={optionBgInactive}
               />
            </div>
          </section>

          {/* Section: Updates */}
          <section className="space-y-4">
            <h3 className={`text-sm uppercase tracking-wider ${sectionHeader} font-bold flex items-center gap-2`}>
              <RefreshCw size={16} /> Updates & Version
            </h3>
            <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-xl p-5`}>
               <div className="flex justify-between items-center mb-4">
                 <div>
                   <p className={`${isDark ? 'text-slate-200' : 'text-slate-700'} font-medium`}>Current Version: <span className="font-mono text-indigo-500">{versionInfo.current}</span></p>
                   <p className={`${textSub} text-xs`}>Omnis is checking for updates automatically.</p>
                 </div>
                 <button 
                    onClick={handleCheckUpdate}
                    disabled={checking}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 disabled:text-slate-200 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                 >
                    {checking ? <RefreshCw size={14} className="animate-spin" /> : 'Check Now'}
                 </button>
               </div>
               
               {/* Status Messages */}
               {status === 'uptodate' && (
                 <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    <CheckCircle size={16} /> You are on the latest version.
                 </div>
               )}
               {status === 'available' && (
                 <div className="flex flex-col gap-3 text-indigo-700 text-sm bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2 font-semibold">
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
                 <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                    <AlertCircle size={16} /> Failed to check for updates.
                 </div>
               )}
            </div>
          </section>

          {/* Section: AI Preferences */}
          <section className="space-y-4">
            <h3 className={`text-sm uppercase tracking-wider ${sectionHeader} font-bold flex items-center gap-2`}>
              <Cpu size={16} /> Intelligence
            </h3>
            <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-xl p-4 space-y-4 border`}>
               <div className="flex justify-between items-center">
                 <div>
                   <p className={`${isDark ? 'text-slate-200' : 'text-slate-700'} font-medium text-sm`}>Default Model</p>
                   <p className={`${textSub} text-xs`}>Choose between speed (Local) and capability (Cloud).</p>
                 </div>
                 <div className={`flex ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-lg p-1 border`}>
                    <button
                      onClick={() => onDefaultAiModeChange('local')}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        defaultAiMode === 'local'
                          ? isDark
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-800 shadow-sm'
                          : `${textSub} hover:text-indigo-500`
                      }`}
                    >
                      Local
                    </button>
                    <button
                      onClick={() => onDefaultAiModeChange('cloud')}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        defaultAiMode === 'cloud'
                          ? isDark
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-800 shadow-sm'
                          : `${textSub} hover:text-indigo-500`
                      }`}
                    >
                      Cloud
                    </button>
                 </div>
               </div>
            </div>
          </section>

          {/* Section: Editor */}
          <section className="space-y-4">
            <h3 className={`text-sm uppercase tracking-wider ${sectionHeader} font-bold flex items-center gap-2`}>
              <Type size={16} /> Editor
            </h3>
            <div className="space-y-2">
               <label className={`flex items-center justify-between p-3 rounded-lg hover:bg-opacity-50 transition-colors cursor-pointer group ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                  <span className={`text-sm ${isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>Enable Spell Check</span>
                  <input
                    type="checkbox"
                    checked={spellCheckEnabled}
                    onChange={(e) => onSpellCheckEnabledChange(e.target.checked)}
                    className="accent-indigo-500"
                  />
               </label>
               <label className={`flex items-center justify-between p-3 rounded-lg hover:bg-opacity-50 transition-colors cursor-pointer group ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                  <span className={`text-sm ${isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>Auto-Save Documents</span>
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => onAutoSaveEnabledChange(e.target.checked)}
                    className="accent-indigo-500"
                  />
               </label>
            </div>
          </section>

        </div>
        
        {/* Footer */}
        <div className={`p-4 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} border-t text-center text-xs ${textSub}`}>
           Omnis v{versionInfo.current} • Chiza Labs
        </div>

      </div>
    </div>
  );
};

const ThemeOption = ({ label, icon: Icon, active, disabled, onClick, activeClass, inactiveClass }: { label: string, icon: LucideIcon, active?: boolean, disabled?: boolean, onClick?: () => void, activeClass: string, inactiveClass: string }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`
      flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all
      ${active ? activeClass : inactiveClass}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <Icon size={24} />
    <span className="text-xs font-medium">{label}</span>
  </button>
);