import React, { useState } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  FilePlus, 
  FolderOpen, 
  Settings, 
  Clock, 
  FileType,
  FileSpreadsheet,
  Presentation,
  X
} from 'lucide-react';

interface HomeDashboardProps {
  onOpenFile: () => void;
  onOpenSettings: () => void;
  onCreateFile: (type: 'docx' | 'pdf') => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onOpenFile, onOpenSettings, onCreateFile }) => {
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);

  const handleCreate = (type: 'docx' | 'pdf') => {
    onCreateFile(type);
    setIsNewDocModalOpen(false);
  };

  return (
    <div className="flex-1 bg-slate-900 h-full flex flex-col overflow-hidden text-slate-100 p-8 md:p-12 relative">
      
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Welcome to Omnis</h1>
        <p className="text-slate-400 text-lg">Your universal workspace for documents.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        
        {/* Left Column: Quick Actions */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="space-y-4">
            <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold">Start</h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onOpenFile}
                className="group flex flex-col items-center justify-center p-8 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-2xl transition-all duration-200"
              >
                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FolderOpen size={32} className="text-indigo-400" />
                </div>
                <span className="text-lg font-medium">Open File</span>
                <span className="text-xs text-slate-500 mt-1">Browse your device</span>
              </button>

              <button 
                onClick={() => setIsNewDocModalOpen(true)}
                className="group flex flex-col items-center justify-center p-8 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl transition-all duration-200"
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FilePlus size={32} className="text-emerald-400" />
                </div>
                <span className="text-lg font-medium">New Document</span>
                <span className="text-xs text-slate-500 mt-1">Create from scratch</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
             <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold">Supported Formats</h2>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FileCard icon={FileText} label="Word (.docx)" active />
                <FileCard icon={FileType} label="PDF (.pdf)" active />
                <FileCard icon={ImageIcon} label="Images" active />
                <FileCard icon={FileText} label="Text (.txt)" badge="Coming Soon" />
                <FileCard icon={FileSpreadsheet} label="Excel (.xlsx)" badge="Coming Soon" />
                <FileCard icon={Presentation} label="PowerPoint" badge="Coming Soon" />
                <FileCard icon={FileText} label="OpenDoc (.odt)" badge="Coming Soon" />
             </div>
          </div>

        </div>

        {/* Right Column: Recent / Info */}
        <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 flex flex-col">
           <div className="flex items-center justify-between mb-6">
             <h2 className="font-semibold flex items-center gap-2">
               <Clock size={18} className="text-slate-400" /> Recent Files
             </h2>
             <button onClick={onOpenSettings} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
               <Settings size={18} />
             </button>
           </div>
           
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                <Clock size={24} />
              </div>
              <p className="text-sm">No recent files</p>
           </div>
        </div>

      </div>

      {/* New Document Modal */}
      {isNewDocModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                 <h2 className="text-xl font-semibold flex items-center gap-2">
                   <FilePlus className="text-emerald-400" /> Create New
                 </h2>
                 <button onClick={() => setIsNewDocModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                   <X size={20} />
                 </button>
              </div>
              
              <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto">
                 {/* Actionable */}
                 <NewDocOption 
                    icon={FileText} 
                    label="Omnis Word" 
                    desc="Rich Text Document (.docx)" 
                    color="blue" 
                    onClick={() => handleCreate('docx')} 
                 />
                 
                 {/* Coming Soon / Disabled */}
                 <NewDocOption 
                    icon={FileType} 
                    label="Omnis PDF" 
                    desc="Portable Document Format (.pdf)" 
                    color="rose" 
                    disabled 
                 />
                 <NewDocOption icon={FileSpreadsheet} label="Omnis SpreadSheets" desc="Data & Charts" color="green" disabled />
                 <NewDocOption icon={Presentation} label="Omnis Presentations" desc="Slides & Visuals" color="orange" disabled />
                 <NewDocOption icon={FileText} label="Omnis Notes" desc="Plain Text (.txt)" color="slate" disabled />
              </div>
              
              <div className="p-4 bg-slate-900/50 border-t border-slate-700 text-center text-xs text-slate-500">
                 Select a file type to create a blank document.
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const FileCard = ({ icon: Icon, label, active, badge }: { icon: any, label: string, active?: boolean, badge?: string }) => (
  <div className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${active ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-500 opacity-70'}`}>
    <div className="flex justify-between items-start">
      <Icon size={24} className={active ? 'text-indigo-400' : 'text-slate-600'} />
      {badge && <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{badge}</span>}
    </div>
    <span className="text-xs font-medium">{label}</span>
  </div>
);

const NewDocOption = ({ icon: Icon, label, desc, color, disabled, onClick }: { icon: any, label: string, desc: string, color: string, disabled?: boolean, onClick?: () => void }) => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 group-hover:bg-blue-400/10 group-hover:border-blue-400/50',
    rose: 'text-rose-400 group-hover:bg-rose-400/10 group-hover:border-rose-400/50',
    green: 'text-emerald-400 group-hover:bg-emerald-400/10 group-hover:border-emerald-400/50',
    orange: 'text-orange-400 group-hover:bg-orange-400/10 group-hover:border-orange-400/50',
    slate: 'text-slate-400 group-hover:bg-slate-400/10 group-hover:border-slate-400/50',
  };

  // Safe access to color map
  const colorClass = colorMap[color] || colorMap['slate'];
  const iconColor = disabled ? 'text-slate-600' : colorClass.split(' ')[0];

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`group relative text-left p-6 rounded-2xl border bg-slate-800/50 transition-all duration-300
        ${disabled 
          ? 'border-slate-800 opacity-50 cursor-not-allowed' 
          : `border-slate-700 hover:scale-[1.02] cursor-pointer ${colorClass}`
        }
      `}
    >
      <div className={`w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4 ${iconColor}`}>
        <Icon size={24} />
      </div>
      <h3 className="font-semibold text-slate-200">{label}</h3>
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
      
      {disabled && (
        <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-slate-500 px-2 py-1 rounded-full border border-slate-700">
          Soon
        </span>
      )}
    </button>
  );
};