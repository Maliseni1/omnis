import React from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  FilePlus, 
  FolderOpen, 
  Settings, 
  Clock, 
  FileType,
  FileSpreadsheet,
  Presentation // Fixed: Changed from FilePresentation
} from 'lucide-react';

interface HomeDashboardProps {
  onOpenFile: () => void;
  onOpenSettings: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onOpenFile, onOpenSettings }) => {
  return (
    <div className="flex-1 bg-slate-900 h-full flex flex-col overflow-hidden text-slate-100 p-8 md:p-12 animate-in fade-in duration-500">
      
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
                className="group flex flex-col items-center justify-center p-8 bg-slate-800/50 border border-slate-700 rounded-2xl opacity-60 cursor-not-allowed"
                title="Creation features coming soon"
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
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