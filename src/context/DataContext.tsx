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

  // Carrega apenas os dados reais do Supabase ao iniciar
  useEffect(() => {
    const fetchInitialData = async () => {
      // 1. Busca os livros cadastrados
      const { data: fetchedBooks, error: booksError } = await supabase
        .from('books')
        .select('*');
      
      if (!booksError && fetchedBooks) {
        setBooks(fetchedBooks as Book[]);
      }

      // 2. Busca os empréstimos cadastrados
      const { data: fetchedLoans, error: loansError } = await supabase
        .from('loans')
        .select('*');

      if (!loansError && fetchedLoans) {
        setLoans(fetchedLoans as Loan[]);
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
    if (error) console.error('Erro no Supabase:', error);
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === id ? { ...b, ...updates } : b)));

    const { error } = await supabase.from('books').update(updates).eq('id', id);
    if (error) console.error('Erro no Supabase:', error);
  };

  const deleteBook = async (id: string) => {
    setBooks((prev: Book[]) => prev.filter((b: Book) => b.id !== id));

    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) console.error('Erro no Supabase:', error);
  };

  const addLoan = async (loanData: Omit<Loan, 'id' | 'returnedAt'>) => {
    const newLoan: Loan = {
      ...loanData,
      id: generateId(),
    };

    setLoans((prev: Loan[]) => [...prev, newLoan]);
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === loanData.bookId ? { ...b, status: 'Emprestado' } : b)));

    const { error: loanError } = await supabase.from('loans').insert([newLoan]);
    if (loanError) console.error('Erro no Supabase:', loanError);

    const { error: bookError } = await supabase.from('books').update({ status: 'Emprestado' }).eq('id', loanData.bookId);
    if (bookError) console.error('Erro no Supabase:', bookError);
  };

  const returnLoan = async (id: string) => {
    const loan = loans.find((l: Loan) => l.id === id);
    if (!loan) return;

    const returnedAt = new Date().toISOString();

    setLoans((prev: Loan[]) => prev.map((l: Loan) => (l.id === id ? { ...l, returnedAt } : l)));
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === loan.bookId ? { ...b, status: 'Disponível' } : b)));

    const { error: loanError } = await supabase.from('loans').update({ returnedAt }).eq('id', id);
    if (loanError) console.error('Erro no Supabase:', loanError);

    const { error: bookError } = await supabase.from('books').update({ status: 'Disponível' }).eq('id', loan.bookId);
    if (bookError) console.error('Erro no Supabase:', bookError);
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