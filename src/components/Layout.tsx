import React from 'react';
import { BookOpen, Users, LayoutDashboard, Settings, Library, BookDown } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'acervo', label: 'Acervo', icon: Library },
    { id: 'emprestimos', label: 'Empréstimos', icon: BookDown },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-hidden relative flex flex-col md:flex-row">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white/5 backdrop-blur-md border-r border-white/10 flex flex-col shadow-lg z-10 relative">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-400 rounded-lg flex items-center justify-center shadow-lg">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">InovaLivros</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">Sec. Ciência e Tec.</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-white/40'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 hidden md:block text-[10px] text-white/40 text-center uppercase tracking-widest">
          Guarapuava InovaLivros &copy; {new Date().getFullYear()}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto z-10 relative">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
