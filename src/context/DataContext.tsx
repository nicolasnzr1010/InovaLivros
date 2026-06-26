import React, { createContext, useContext, useEffect, useState } from 'react';
import { Book, Loan } from '../types';
import { supabase } from '../supabaseClient'; 

interface DataContextType {
  books: Book[];
  loans: Loan[];
  addBook: (book: Omit<Book, 'id' | 'status' | 'createdAt'>) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  addLoan: (loan: Omit<Loan, 'id' | 'returnedAt'>) => void;
  returnLoan: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 9);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Carrega os dados mapeando corretamente na entrada
  useEffect(() => {
    const fetchInitialData = async () => {
      // 1. Busca os livros cadastrados
      const { data: fetchedBooks, error: booksError } = await supabase
        .from('books')
        .select('*');
      
      if (!booksError && fetchedBooks) {
        setBooks(fetchedBooks as Book[]);
      }

      // 2. Busca os empréstimos cadastrados na tabela CORRETA 'emprestimos'
      const { data: fetchedLoans, error: loansError } = await supabase
        .from('emprestimos') // 👈 Alterado de 'loans' para 'emprestimos'
        .select('*');

      if (!loansError && fetchedLoans) {
        const formattedLoans = fetchedLoans.map((l: any) => ({
          ...l,
          returnedAt: l.returnedAt || undefined
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
    if (error) console.error('Erro no Supabase (addBook):', error);
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === id ? { ...b, ...updates } : b)));

    const { error } = await supabase.from('books').update(updates).eq('id', id);
    if (error) console.error('Erro no Supabase (updateBook):', error);
  };

  const deleteBook = async (id: string) => {
    setBooks((prev: Book[]) => prev.filter((b: Book) => b.id !== id));

    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) console.error('Erro no Supabase (deleteBook):', error);
  };

  const addLoan = async (loanData: Omit<Loan, 'id' | 'returnedAt'>) => {
    const loanId = generateId();
    
    const newLoan: Loan = {
      id: loanId,
      bookId: loanData.bookId,
      borrowerName: loanData.borrowerName,
      borrowerContact: loanData.borrowerContact,
      borrowDate: loanData.borrowDate || new Date().toISOString(),
      returnDate: loanData.returnDate,
      returnedAt: undefined,
    };

    // Atualiza estados locais imediatamente
    setLoans((prev: Loan[]) => [newLoan, ...prev]);
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === loanData.bookId ? { ...b, status: 'Emprestado' } : b)));

    // Insere na tabela 'emprestimos' 
    const { error: loanError } = await supabase.from('emprestimos').insert([ // 👈 Alterado aqui
      {
        id: newLoan.id,
        bookId: newLoan.bookId,
        borrowerName: newLoan.borrowerName,
        borrowerEmail: newLoan.borrowerContact, 
        loanDate: newLoan.borrowDate,
        dueDate: newLoan.returnDate,           
        returnedAt: null
      }
    ]);
    if (loanError) console.error('Erro no Supabase ao inserir empréstimo:', loanError.message);

    const { error: bookError } = await supabase.from('books').update({ status: 'Emprestado' }).eq('id', loanData.bookId);
    if (bookError) console.error('Erro no Supabase ao atualizar livro:', bookError.message);
  };

  const returnLoan = async (id: string) => {
    const loan = loans.find((l: Loan) => l.id === id);
    if (!loan) return;

    const returnedAt = new Date().toISOString();

    setLoans((prev: Loan[]) => prev.map((l: Loan) => (l.id === id ? { ...l, returnedAt } : l)));
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === loan.bookId ? { ...b, status: 'Disponível' } : b)));

    // Atualiza na tabela 'emprestimos'
    const { error: loanError } = await supabase.from('emprestimos').update({ returnedAt }).eq('id', id); // 👈 Alterado aqui
    if (loanError) console.error('Erro no Supabase ao devolver:', loanError.message);

    const { error: bookError } = await supabase.from('books').update({ status: 'Disponível' }).eq('id', loan.bookId);
    if (bookError) console.error('Erro no Supabase ao liberar livro:', bookError.message);
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