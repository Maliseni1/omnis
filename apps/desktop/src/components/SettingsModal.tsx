import React from 'react';
import { X, Moon, Sun, Monitor, Cpu, Type } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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
           Omnis v0.1.0 • Chiza Labs
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