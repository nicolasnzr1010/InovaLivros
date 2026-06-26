import React from 'react';
import { useData } from '../context/DataContext';
import { BookOpen, Users, Clock, AlertTriangle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { books, loans } = useData();

  const totalBooks = books.length;
  const availableBooks = books.filter((b) => b.status === 'Disponível').length;
  const activeLoans = loans.filter((l) => !l.returnedAt);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Corrigido: l.returnDate mapeado para l.dueDate vindo do Supabase
  const overdueLoans = activeLoans.filter((l: any) => {
    const returnDate = l.dueDate ? new Date(l.dueDate) : new Date();
    return returnDate < today;
  });

  const stats = [
    { label: 'Total de Livros', value: totalBooks, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Livros Disponíveis', value: availableBooks, icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Empréstimos Ativos', value: activeLoans.length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Atrasados', value: overdueLoans.length, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-white">Visão Geral</h2>
        <p className="text-white/50 mt-1">Acompanhe o status do acervo da Secretaria.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-sm p-6 flex items-center gap-4 group hover:bg-white/10 transition-all">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/5 ${stat.bg}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4 text-white">Empréstimos Recentes</h3>
          {activeLoans.length === 0 ? (
            <p className="text-white/40 text-sm">Nenhum empréstimo ativo no momento.</p>
          ) : (
            <div className="space-y-4">
              {activeLoans.slice(0, 5).map(loan => {
                const book = books.find(b => b.id === loan.bookId);
                
                // Corrigido: Extraindo o objeto de data a partir da propriedade correta do banco (dueDate)
                const dueDateObj = (loan as any).dueDate ? new Date((loan as any).dueDate) : new Date();
                const isOverdue = dueDateObj < today;
                
                return (
                  <div key={loan.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 group hover:bg-white/10 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-white text-sm">{book?.title || 'Livro Desconhecido'}</span>
                      <span className="text-white/50 text-[11px] mt-1">Para: {loan.borrowerName}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[10px] text-white/40 uppercase tracking-tighter">Devolução</span>
                      <span className={`text-sm font-medium ${isOverdue ? 'text-red-400' : 'text-white'}`}>
                        {dueDateObj.toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4 text-white">Livros Adicionados Recentemente</h3>
          {books.length === 0 ? (
            <p className="text-white/40 text-sm">O acervo está vazio.</p>
          ) : (
            <div className="space-y-4">
              {books.slice().reverse().slice(0, 5).map(book => (
                <div key={book.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 group hover:bg-white/10 transition-colors">
                  <img src={book.photoUrl} alt={book.title} className="w-10 h-14 object-cover rounded shadow-sm opacity-90 group-hover:opacity-100" />
                  <div className="flex flex-col flex-1">
                    <span className="font-medium text-white text-sm line-clamp-1">{book.title}</span>
                    <span className="text-white/50 text-[11px] mt-1">{book.author}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${book.status === 'Disponível' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                    {book.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};