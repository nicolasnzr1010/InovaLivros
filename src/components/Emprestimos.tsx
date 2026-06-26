import React, { useState } from 'react';
import { useData } from '../context/DataContext'; // Seu import normal
import { Plus, X, Search, CheckCircle } from 'lucide-react';

export const Emprestimos: React.FC = () => {
  const { books, loans, addLoan, returnLoan } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [bookId, setBookId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');
  
  const today = new Date();
  const defaultReturnDate = new Date();
  defaultReturnDate.setDate(today.getDate() + 14);
  const [returnDate, setReturnDate] = useState(defaultReturnDate.toISOString().split('T')[0]);

  const availableBooks = books.filter(b => b.status === 'Disponível');
  
  // CORREÇÃO: Mapeia e normaliza os dados direto na listagem da tela
  const filteredLoans = loans.filter((l: any) => {
    const bId = l.book_id || l.bookId;
    const bName = l.borrower_name || l.borrowerName;
    const bEmail = l.borrower_email || l.borrowerEmail;

    return (
      bName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (bEmail && bEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      books.find(b => b.id === bId)?.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }).sort((a: any, b: any) => {
    const dateA = a.loan_date || a.loanDate ? new Date(a.loan_date || a.loanDate).getTime() : 0;
    const dateB = b.loan_date || b.loanDate ? new Date(b.loan_date || b.loanDate).getTime() : 0;
    return dateB - dateA;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId || !borrowerName || !returnDate) return;

    // Envia os dados salvando nos dois formatos para o banco aceitar sem quebrar
    addLoan({
      bookId,
      book_id: bookId,
      borrowerName,
      borrower_name: borrowerName,
      borrowerEmail: borrowerContact,
      borrower_email: borrowerContact,
      loanDate: new Date().toISOString(),
      loan_date: new Date().toISOString(),
      dueDate: new Date(returnDate).toISOString(),
      due_date: new Date(returnDate).toISOString(),
    } as any);
    
    setBookId('');
    setBorrowerName('');
    setBorrowerContact('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Empréstimos</h2>
          <p className="text-white/50 mt-1">Gerencie retiradas e devoluções da comunidade.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isAdding ? 'Cancelar' : 'Novo Empréstimo'}
        </button>
      </header>

      {isAdding && (
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-xl">
          <h3 className="font-semibold text-lg mb-4 text-white">Registrar Retirada</h3>
          {availableBooks.length === 0 ? (
            <p className="text-amber-300 bg-amber-500/20 border border-amber-500/30 p-4 rounded-lg font-medium text-sm">Não há livros disponíveis para empréstimo no momento.</p>
          ) : (
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Selecione o Livro</label>
                <select 
                  required
                  value={bookId}
                  onChange={e => setBookId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none [&>option]:bg-[#0f172a]"
                >
                  <option value="" disabled>Escolha um livro disponível</option>
                  {availableBooks.map(b => (
                    <option key={b.id} value={b.id}>{b.title} - {b.author}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Nome do Solicitante</label>
                <input 
                  required
                  type="text" 
                  value={borrowerName}
                  onChange={e => setBorrowerName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none placeholder:text-white/20"
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Contato (Telefone/Email)</label>
                <input 
                  required
                  type="text" 
                  value={borrowerContact}
                  onChange={e => setBorrowerContact(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none placeholder:text-white/20"
                  placeholder="(42) 9..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Data Prevista de Devolução</label>
                <input 
                  required
                  type="date" 
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors shadow-lg">
                  Confirmar Empréstimo
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-white/10 flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou livro..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-white rounded-full focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none placeholder:text-white/30 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/50 text-[10px] uppercase tracking-widest">
                <th className="px-6 py-4 font-bold">Livro</th>
                <th className="px-6 py-4 font-bold">Solicitante</th>
                <th className="px-6 py-4 font-bold">Retirada</th>
                <th className="px-6 py-4 font-bold">Prev. Devolução</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan: any) => {
                  const currentBookId = loan.book_id || loan.bookId;
                  const book = books.find(b => b.id === currentBookId);
                  const isReturned = !!(loan.returned_at || loan.returnedAt);
                  
                  const loanDateRaw = loan.loan_date || loan.loanDate;
                  const dueDateRaw = loan.due_date || loan.dueDate;

                  const loanDateObj = loanDateRaw ? new Date(loanDateRaw) : new Date();
                  const dueDateObj = dueDateRaw ? new Date(dueDateRaw) : new Date();
                  const isOverdue = !isReturned && dueDateObj < today;
                  
                  return (
                    <tr key={loan.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-medium text-white text-sm">{book?.title || 'Livro Removido'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-white text-sm">{loan.borrower_name || loan.borrowerName}</p>
                        <p className="text-[11px] text-white/40">{loan.borrower_email || loan.borrowerEmail || ''}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-white/60">
                        {loanDateObj.toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-xs text-white/60">
                        {dueDateObj.toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        {isReturned ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/60">
                            Devolvido
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                            Atrasado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            No Prazo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isReturned && (
                          <button 
                            onClick={() => {
                              if(confirm(`Confirmar devolução do livro "${book?.title}" por ${loan.borrower_name || loan.borrowerName}?`)) {
                                returnLoan(loan.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-transparent text-blue-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Devolver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};