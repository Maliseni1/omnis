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

// Define structure for history items
export interface RecentFile {
  id: string;
  name: string;
  type: string;
  path: string;
  lastOpened: Date;
}

interface HomeDashboardProps {
  onOpenFile: () => void;
  onOpenSettings: () => void;
  onCreateFile: (type: 'docx' | 'pdf') => void;
  theme: 'dark' | 'light';
  recentFiles?: RecentFile[];
  onOpenRecent?: (path: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ 
  onOpenFile, 
  onOpenSettings, 
  onCreateFile, 
  theme,
  recentFiles = [],
  onOpenRecent
}) => {
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);

  const handleCreate = (type: 'docx' | 'pdf') => {
    onCreateFile(type);
    setIsNewDocModalOpen(false);
  };

  // Theme-derived styles
  const bgMain = theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50';
  const textMain = theme === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const textSub = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const cardBg = theme === 'dark' ? 'bg-slate-800/30' : 'bg-white';
  const cardBorder = theme === 'dark' ? 'border-slate-800' : 'border-slate-200';
  const buttonBg = theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-white hover:bg-slate-50';
  const buttonBorder = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className={`flex-1 ${bgMain} h-full flex flex-col overflow-hidden ${textMain} p-8 md:p-12 relative transition-colors duration-300`}>
      
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Welcome to Omnis</h1>
        <p className={`${textSub} text-lg`}>Your universal workspace for documents.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-0">
        
        {/* Left Column: Quick Actions */}
        <div className="lg:col-span-2 flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="space-y-4 shrink-0">
            <h2 className={`text-sm uppercase tracking-wider ${textSub} font-semibold`}>Start</h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onOpenFile}
                className={`group flex flex-col items-center justify-center p-8 ${buttonBg} border ${buttonBorder} hover:border-indigo-500/50 rounded-2xl transition-all duration-200`}
              >
                <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50'} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <FolderOpen size={32} className="text-indigo-400" />
                </div>
                <span className="text-lg font-medium">Open File</span>
                <span className={`text-xs ${textSub} mt-1`}>Browse your device</span>
              </button>

              <button 
                onClick={() => setIsNewDocModalOpen(true)}
                className={`group flex flex-col items-center justify-center p-8 ${buttonBg} border ${buttonBorder} hover:border-emerald-500/50 rounded-2xl transition-all duration-200`}
              >
                <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <FilePlus size={32} className="text-emerald-400" />
                </div>
                <span className="text-lg font-medium">New Document</span>
                <span className={`text-xs ${textSub} mt-1`}>Create from scratch</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 shrink-0">
             <h2 className={`text-sm uppercase tracking-wider ${textSub} font-semibold`}>Supported Formats</h2>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FileCard icon={FileText} label="Word (.docx)" active theme={theme} />
                <FileCard icon={FileType} label="PDF (.pdf)" active theme={theme} />
                <FileCard icon={ImageIcon} label="Images" active theme={theme} />
                <FileCard icon={FileText} label="Text (.txt)" badge="Coming Soon" theme={theme} />
                <FileCard icon={FileSpreadsheet} label="Excel (.xlsx)" badge="Coming Soon" theme={theme} />
                <FileCard icon={Presentation} label="PowerPoint" badge="Coming Soon" theme={theme} />
                <FileCard icon={FileText} label="OpenDoc (.odt)" badge="Coming Soon" theme={theme} />
             </div>
          </div>

        </div>

        {/* Right Column: Recent / Info */}
        <div className={`${cardBg} border ${cardBorder} rounded-2xl p-6 flex flex-col overflow-hidden min-h-[300px]`}>
           <div className="flex items-center justify-between mb-6 shrink-0">
             <h2 className="font-semibold flex items-center gap-2">
               <Clock size={18} className={textSub} /> Recent Files
             </h2>
             <button onClick={onOpenSettings} className={`p-2 hover:bg-slate-700/10 rounded-lg ${textSub} hover:text-indigo-500 transition-colors`}>
               <Settings size={18} />
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
              {recentFiles.length === 0 ? (
                <div className={`h-full flex flex-col items-center justify-center ${textSub} space-y-4 opacity-50`}>
                    <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} rounded-full flex items-center justify-center`}>
                      <Clock size={24} />
                    </div>
                    <p className="text-sm">No recent files</p>
                </div>
              ) : (
                <div className="space-y-2">
                   {recentFiles.map(file => (
                     <button 
                       key={file.path} 
                       onClick={() => onOpenRecent && onOpenRecent(file.path)}
                       className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all group ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'}`}
                     >
                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-100 group-hover:bg-white'} transition-colors`}>
                         {/* Icon based on file type logic */}
                         <FileIcon type={file.type} />
                       </div>
                       <div className="min-w-0 flex-1">
                         <p className={`text-sm font-medium truncate ${textMain}`}>{file.name}</p>
                         <p className={`text-[10px] truncate ${textSub}`}>{file.path}</p>
                       </div>
                     </button>
                   ))}
                </div>
              )}
           </div>
        </div>

      </div>

      {/* New Document Modal */}
      {isNewDocModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className={`w-full max-w-4xl ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
              <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white'} flex justify-between items-center`}>
                 <h2 className={`text-xl font-semibold flex items-center gap-2 ${textMain}`}>
                   <FilePlus className="text-emerald-400" /> Create New
                 </h2>
                 <button onClick={() => setIsNewDocModalOpen(false)} className={`p-2 ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-full transition-colors`}>
                   <X size={20} className={textSub} />
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
                    theme={theme}
                 />
                 
                 {/* Disabled */}
                 <NewDocOption 
                    icon={FileType} 
                    label="Omnis PDF" 
                    desc="Portable Document Format (.pdf)" 
                    color="rose" 
                    disabled
                    theme={theme} 
                 />
                 <NewDocOption icon={FileSpreadsheet} label="Omnis SpreadSheets" desc="Data & Charts" color="green" disabled theme={theme} />
                 <NewDocOption icon={Presentation} label="Omnis Presentations" desc="Slides & Visuals" color="orange" disabled theme={theme} />
                 <NewDocOption icon={FileText} label="Omnis Notes" desc="Plain Text (.txt)" color="slate" disabled theme={theme} />
              </div>
              
              <div className={`p-4 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'} border-t text-center text-xs ${textSub}`}>
                 Select a file type to create a blank document.
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Helper for file icons in recent list
const FileIcon = ({ type }: { type: string }) => {
  if (type === 'image') return <ImageIcon size={18} className="text-violet-400" />;
  if (type === 'pdf') return <FileType size={18} className="text-rose-400" />;
  return <FileText size={18} className="text-emerald-400" />;
};

const FileCard = ({ icon: Icon, label, active, badge, theme }: { icon: any, label: string, active?: boolean, badge?: string, theme: 'dark' | 'light' }) => {
  const baseClass = theme === 'dark' 
    ? (active ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-500 opacity-70')
    : (active ? 'bg-white border-indigo-200 text-slate-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400');
    
  return (
    <div className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${baseClass}`}>
      <div className="flex justify-between items-start">
        <Icon size={24} className={active ? 'text-indigo-400' : 'text-slate-500'} />
        {badge && <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{badge}</span>}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

const NewDocOption = ({ icon: Icon, label, desc, color, disabled, onClick, theme }: { icon: any, label: string, desc: string, color: string, disabled?: boolean, onClick?: () => void, theme: 'dark' | 'light' }) => {
  const isDark = theme === 'dark';
  
  const colorMap: Record<string, string> = {
    blue: isDark ? 'text-blue-400 group-hover:bg-blue-400/10 group-hover:border-blue-400/50' : 'text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-200',
    rose: isDark ? 'text-rose-400 group-hover:bg-rose-400/10 group-hover:border-rose-400/50' : 'text-rose-600 group-hover:bg-rose-50 group-hover:border-rose-200',
    green: isDark ? 'text-emerald-400 group-hover:bg-emerald-400/10 group-hover:border-emerald-400/50' : 'text-emerald-600 group-hover:bg-emerald-50 group-hover:border-emerald-200',
    orange: isDark ? 'text-orange-400 group-hover:bg-orange-400/10 group-hover:border-orange-400/50' : 'text-orange-600 group-hover:bg-orange-50 group-hover:border-orange-200',
    slate: isDark ? 'text-slate-400 group-hover:bg-slate-400/10 group-hover:border-slate-400/50' : 'text-slate-500 group-hover:bg-slate-100 group-hover:border-slate-300',
  };

  const bgClass = isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200';
  const textClass = isDark ? 'text-slate-200' : 'text-slate-800';
  const descClass = isDark ? 'text-slate-500' : 'text-slate-400';

  // Safe access to color map
  const colorClass = colorMap[color] || colorMap['slate'];
  const iconColor = disabled ? (isDark ? 'text-slate-600' : 'text-slate-300') : colorClass.split(' ')[0];

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 ${bgClass}
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : `hover:scale-[1.02] cursor-pointer ${colorClass}`
        }
      `}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-slate-900' : 'bg-slate-100'} ${iconColor}`}>
        <Icon size={24} />
      </div>
      <h3 className={`font-semibold ${textClass}`}>{label}</h3>
      <p className={`text-xs ${descClass} mt-1`}>{desc}</p>
      
      {disabled && (
        <span className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${isDark ? 'bg-slate-900 text-slate-500 border-slate-700' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
          Soon
        </span>
      )}
    </button>
  );
};