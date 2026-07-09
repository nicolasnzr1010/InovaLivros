import React, { createContext, useContext, useEffect, useState } from 'react';
import { Book, Loan } from '../types';
import { supabase } from '../supabaseClient'; 

interface DataContextType {
  books: Book[];
  loans: Loan[];
  addBook: (book: Omit<Book, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  addLoan: (loan: Omit<Loan, 'id' | 'returnedAt'>) => Promise<void>;
  returnLoan: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 9);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Carrega os dados iniciais do Supabase mapeando para o estado do React
  useEffect(() => {
    const fetchInitialData = async () => {
      // 1. Busca os livros cadastrados
      const { data: fetchedBooks, error: booksError } = await supabase
        .from('books')
        .select('*');
      
      if (!booksError && fetchedBooks) {
        setBooks(fetchedBooks as Book[]);
      }

      // 2. Busca os empréstimos cadastrados na tabela 'emprestimos'
      const { data: fetchedLoans, error: loansError } = await supabase
        .from('emprestimos') 
        .select('*');

      if (!loansError && fetchedLoans) {
        // DOCUMENTAÇÃO: Mapeia as colunas em português do banco para o padrão CamelCase do React
        const formattedLoans = fetchedLoans.map((l: any) => ({
          id: l.id,
          bookId: l.livro_id,
          borrowerName: l.nome_leitor,
          borrowerContact: l.email_leitor,
          borrowDate: l.data_emprestimo,
          returnDate: l.data_devolucao_prevista,
          returnedAt: l.data_devolucao_real || undefined
        }));
        setLoans(formattedLoans);
      }
    };

    fetchInitialData();
  }, []);

  const addBook = async (bookData: Omit<Book, 'id' | 'status' | 'createdAt'>) => {
    const newBook: Book = {
      ...bookData,
      id: generateId(),
      status: 'Disponível',
      createdAt: new Date().toISOString(),
    };

    setBooks((prev: Book[]) => [...prev, newBook]);

    const { error } = await supabase.from('books').insert([newBook]);
    if (error) {
      console.error('Erro no Supabase (addBook):', error);
      throw error;
    }
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === id ? { ...b, ...updates } : b)));

    const { error } = await supabase.from('books').update(updates).eq('id', id);
    if (error) {
      console.error('Erro no Supabase (updateBook):', error);
      throw error;
    }
  };

  const deleteBook = async (id: string) => {
    setBooks((prev: Book[]) => prev.filter((b: Book) => b.id !== id));

    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) {
      console.error('Erro no Supabase (deleteBook):', error);
      throw error;
    }
  };

  // 🛠️ MÉTODO EDUCATIVO: Função addLoan remapeada para as colunas reais do seu print do Supabase
  const addLoan = async (loanData: any) => {
    const loanId = generateId();
    
    // Captura os dados do front de forma segura
    const bId = loanData.bookId || loanData.book_id;
    const bName = loanData.borrowerName || loanData.borrower_name;
    const bContact = loanData.borrowerContact || loanData.borrowerEmail || loanData.borrower_email;
    const bDate = loanData.borrowDate || loanData.loan_date || new Date().toISOString().split('T')[0];
    const rDate = loanData.returnDate || loanData.due_date;

    // Cria o objeto local que o React usa na listagem da tela
    const newLoan: Loan = {
      id: loanId,
      bookId: bId,
      borrowerName: bName,
      borrowerContact: bContact,
      borrowDate: bDate,
      returnDate: rDate,
      returnedAt: undefined,
    };

    // DOCUMENTAÇÃO: Inserção alinhada 100% com os nomes das colunas da sua imagem
    const { error: loanError } = await supabase.from('emprestimos').insert([
      {
        id: newLoan.id,
        livro_id: newLoan.bookId,                 // 👈 Vincula com 'livro_id'
        nome_leitor: newLoan.borrowerName,         // 👈 Vincula com 'nome_leitor'
        email_leitor: newLoan.borrowerContact,     // 👈 Vincula com 'email_leitor'
        data_emprestimo: newLoan.borrowDate,       // 👈 Vincula com 'data_emprestimo'
        data_devolucao_prevista: newLoan.returnDate, // 👈 Vincula com 'data_devolucao_prevista'
        data_devolucao_real: null,                 // 👈 Vincula com 'data_devolucao_real'
        status: 'No Prazo'                         // 👈 Salva o status inicial do empréstimo
      }
    ]);

    if (loanError) {
      console.error('Erro no Supabase ao inserir empréstimo:', loanError.message);
      throw new Error(loanError.message);
    }

    // Atualiza o status do livro para 'Emprestado' na tabela de livros
    const { error: bookError } = await supabase.from('books').update({ status: 'Emprestado' }).eq('id', bId);
    if (bookError) {
      console.error('Erro no Supabase ao atualizar livro:', bookError.message);
      throw new Error(bookError.message);
    }

    // Atualiza os estados do React local apenas após o sucesso nos inserts do banco
    setLoans((prev: Loan[]) => [newLoan, ...prev]);
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === bId ? { ...b, status: 'Emprestado' } : b)));
  };

  // 🛠️ MÉTODO EDUCATIVO: Função returnLoan remapeada para a coluna data_devolucao_real
  const returnLoan = async (id: string) => {
    const loan = loans.find((l: Loan) => l.id === id);
    if (!loan) return;

    const todayDateStr = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD para a coluna date

    // Atualiza no banco de dados na coluna correspondente em português
    const { error: loanError } = await supabase
      .from('emprestimos')
      .update({ 
        data_devolucao_real: todayDateStr, // 👈 Vincula com 'data_devolucao_real'
        status: 'Devolvido'
      }) 
      .eq('id', id);

    if (loanError) {
      console.error('Erro no Supabase ao devolver:', loanError.message);
      throw new Error(loanError.message);
    }

    // Atualiza o livro para disponível de volta no banco
    const { error: bookError } = await supabase.from('books').update({ status: 'Disponível' }).eq('id', loan.bookId);
    if (bookError) {
      console.error('Erro no Supabase ao liberar livro:', bookError.message);
      throw new Error(bookError.message);
    }

    // Atualiza a interface do usuário localmente
    setLoans((prev: Loan[]) => prev.map((l: Loan) => (l.id === id ? { ...l, returnedAt: todayDateStr } : l)));
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === loan.bookId ? { ...b, status: 'Disponível' } : b)));
  };

  return (
    <DataContext.Provider
      value={{ books, loans, addBook, updateBook, deleteBook, addLoan, returnLoan }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};