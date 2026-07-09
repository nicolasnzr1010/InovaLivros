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

  // Carrega os dados mapeando corretamente na entrada
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: fetchedBooks, error: booksError } = await supabase
        .from('books')
        .select('*');
      
      if (!booksError && fetchedBooks) {
        setBooks(fetchedBooks as Book[]);
      }

      const { data: fetchedLoans, error: loansError } = await supabase
        .from('emprestimos') 
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

  // 🛠️ MÉTODO EDUCATIVO: Função addLoan corrigida com mapeamento seguro de propriedades
  const addLoan = async (loanData: any) => {
    const loanId = generateId();
    
    // Captura os valores de forma segura aceitando tanto camelCase quanto formatos híbridos
    const bId = loanData.bookId || loanData.book_id;
    const bName = loanData.borrowerName || loanData.borrower_name;
    const bContact = loanData.borrowerContact || loanData.borrowerEmail || loanData.borrower_email;
    const bDate = loanData.borrowDate || loanData.loan_date || new Date().toISOString();
    const rDate = loanData.returnDate || loanData.due_date;

    const newLoan: Loan = {
      id: loanId,
      bookId: bId,
      borrowerName: bName,
      borrowerContact: bContact,
      borrowDate: bDate,
      returnDate: rDate,
      returnedAt: undefined,
    };

    // 1. Salva primeiro no banco de dados para garantir consistência
    const { error: loanError } = await supabase.from('emprestimos').insert([
      {
        id: newLoan.id,
        bookId: newLoan.bookId,
        borrowerName: newLoan.borrowerName,
        borrowerEmail: newLoan.borrowerContact, // Mapeia o contato para a coluna borrowerEmail da tabela
        loanDate: newLoan.borrowDate,
        dueDate: newLoan.returnDate,           
        returnedAt: null
      }
    ]);

    // Se houver erro na inserção da locação, interrompe aqui e joga para o catch do formulário!
    if (loanError) {
      console.error('Erro no Supabase ao inserir empréstimo:', loanError.message);
      throw new Error(loanError.message);
    }

    const { error: bookError } = await supabase.from('books').update({ status: 'Emprestado' }).eq('id', bId);
    if (bookError) {
      console.error('Erro no Supabase ao atualizar livro:', bookError.message);
      throw new Error(bookError.message);
    }

    // 2. DOCUMENTAÇÃO: Se gravou com sucesso no banco, atualiza os estados locais da aplicação
    setLoans((prev: Loan[]) => [newLoan, ...prev]);
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === bId ? { ...b, status: 'Emprestado' } : b)));
  };

  const returnLoan = async (id: string) => {
    const loan = loans.find((l: Loan) => l.id === id);
    if (!loan) return;

    const returnedAt = new Date().toISOString();

    // Atualiza na tabela 'emprestimos'
    const { error: loanError } = await supabase.from('emprestimos').update({ returnedAt }).eq('id', id);
    if (loanError) {
      console.error('Erro no Supabase ao devolver:', loanError.message);
      throw new Error(loanError.message);
    }

    const { error: bookError } = await supabase.from('books').update({ status: 'Disponível' }).eq('id', loan.bookId);
    if (bookError) {
      console.error('Erro no Supabase ao liberar livro:', bookError.message);
      throw new Error(bookError.message);
    }

    // Atualiza estados locais apenas se o banco confirmou a alteração
    setLoans((prev: Loan[]) => prev.map((l: Loan) => (l.id === id ? { ...l, returnedAt } : l)));
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