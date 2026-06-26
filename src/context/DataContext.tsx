import React, { createContext, useContext, useEffect, useState } from 'react';
import { Book, Loan, BookCondition } from '../types';

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

const BOOKS_KEY = '@inovalivros/books';
const LOANS_KEY = '@inovalivros/loans';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    const storedBooks = localStorage.getItem(BOOKS_KEY);
    const storedLoans = localStorage.getItem(LOANS_KEY);

    if (storedBooks) {
      setBooks(JSON.parse(storedBooks));
    } else {
      // Mock data
      const initialBooks: Book[] = [
        {
          id: generateId(),
          title: 'A Lógica da Pesquisa Científica',
          author: 'Karl Popper',
          photoUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
          condition: 'Bom',
          status: 'Disponível',
          createdAt: new Date().toISOString(),
        },
        {
          id: generateId(),
          title: 'Sapiens: Uma Breve História da Humanidade',
          author: 'Yuval Noah Harari',
          photoUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=400',
          condition: 'Novo',
          status: 'Disponível',
          createdAt: new Date().toISOString(),
        }
      ];
      setBooks(initialBooks);
      localStorage.setItem(BOOKS_KEY, JSON.stringify(initialBooks));
    }

    if (storedLoans) {
      setLoans(JSON.parse(storedLoans));
    }
  }, []);

  const saveBooks = (newBooks: Book[]) => {
    setBooks(newBooks);
    localStorage.setItem(BOOKS_KEY, JSON.stringify(newBooks));
  };

  const saveLoans = (newLoans: Loan[]) => {
    setLoans(newLoans);
    localStorage.setItem(LOANS_KEY, JSON.stringify(newLoans));
  };

  const addBook = (bookData: Omit<Book, 'id' | 'status' | 'createdAt'>) => {
    const newBook: Book = {
      ...bookData,
      id: generateId(),
      status: 'Disponível',
      createdAt: new Date().toISOString(),
    };
    saveBooks([...books, newBook]);
  };

  const updateBook = (id: string, updates: Partial<Book>) => {
    const updatedBooks = books.map((b) => (b.id === id ? { ...b, ...updates } : b));
    saveBooks(updatedBooks);
  };

  const deleteBook = (id: string) => {
    saveBooks(books.filter((b) => b.id !== id));
    // Optionally handle active loans for this book
  };

  const addLoan = (loanData: Omit<Loan, 'id' | 'returnedAt'>) => {
    const newLoan: Loan = {
      ...loanData,
      id: generateId(),
    };
    saveLoans([...loans, newLoan]);
    updateBook(loanData.bookId, { status: 'Emprestado' });
  };

  const returnLoan = (id: string) => {
    const loan = loans.find((l) => l.id === id);
    if (!loan) return;

    const updatedLoans = loans.map((l) =>
      l.id === id ? { ...l, returnedAt: new Date().toISOString() } : l
    );
    saveLoans(updatedLoans);
    updateBook(loan.bookId, { status: 'Disponível' });
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
