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

// FUNÇÕES AUXILIARES DE MAPEAMENTO (Tradutor Snake_case <-> CamelCase)
const mapDbToLoan = (db: any): Loan => ({
  id: db.id,
  bookId: db.book_id,
  borrowerName: db.borrower_name,
  borrowerContact: db.borrower_email, // Mapeia borrower_email do banco para borrowerContact do TS
  borrowDate: db.loan_date,
  returnDate: db.due_date, // Mapeia due_date do banco para returnDate do TS
  returnedAt: db.returned_at || undefined // Garante que nulos do banco virem undefined no TS
});

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

      // 2. Busca e normaliza os empréstimos cadastrados
      const { data: fetchedLoans, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .order('loan_date', { ascending: false });

      if (!loansError && fetchedLoans) {
        // Conversão crucial aplicada aqui!
        const normalizedLoans = fetchedLoans.map(mapDbToLoan);
        setLoans(normalizedLoans);
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
    
    // Objeto no padrão CamelCase para o Estado do React (atendendo ao tipo do TS)
    const newLoan: Loan = {
      ...loanData,
      id: loanId,
      returnedAt: undefined, // Corrigido para satisfazer string | undefined
    };

    // Objeto traduzido para o padrão Snake_case exigido pelo Postgres/Supabase
    const dbPayload = {
      id: loanId,
      book_id: loanData.bookId,
      borrower_name: loanData.borrowerName,
      borrower_email: loanData.borrowerContact,
      loan_date: loanData.borrowDate || new Date().toISOString(),
      due_date: loanData.returnDate,
      returned_at: null // Mantido null para registrar ausência de valor no banco
    };

    // Atualiza estados locais de forma imediata e limpa
    setLoans((prev: Loan[]) => [newLoan, ...prev]);
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === loanData.bookId ? { ...b, status: 'Emprestado' } : b)));

    // Envia o payload correto em snake_case para o banco
    const { error: loanError } = await supabase.from('loans').insert([dbPayload]);
    if (loanError) console.error('Erro no Supabase (addLoan - loans):', loanError);

    const { error: bookError } = await supabase.from('books').update({ status: 'Emprestado' }).eq('id', loanData.bookId);
    if (bookError) console.error('Erro no Supabase (addLoan - books):', bookError);
  };

  const returnLoan = async (id: string) => {
    const loan = loans.find((l: Loan) => l.id === id);
    if (!loan) return;

    const returnedAt = new Date().toISOString();

    // Atualiza estados locais
    setLoans((prev: Loan[]) => prev.map((l: Loan) => (l.id === id ? { ...l, returnedAt } : l)));
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === loan.bookId ? { ...b, status: 'Disponível' } : b)));

    // Envia o update usando a chave correta da coluna do Postgres (returned_at)
    const { error: loanError } = await supabase.from('loans').update({ returned_at: returnedAt }).eq('id', id);
    if (loanError) console.error('Erro no Supabase (returnLoan - loans):', loanError);

    const { error: bookError } = await supabase.from('books').update({ status: 'Disponível' }).eq('id', loan.bookId);
    if (bookError) console.error('Erro no Supabase (returnLoan - books):', bookError);
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