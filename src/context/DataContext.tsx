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
        // Normaliza os dados vindos do banco (snake_case) para o tipo do React (camelCase)
        const formattedLoans = fetchedLoans.map((l: any) => ({
          id: l.id,
          bookId: l.book_id || l.bookId,
          borrowerName: l.borrower_name || l.borrowerName,
          borrowerContact: l.borrower_email || l.borrowerContact || l.borrowerEmail,
          borrowDate: l.loan_date || l.borrowDate || l.loanDate,
          returnDate: l.due_date || l.returnDate || l.dueDate,
          returnedAt: l.returned_at !== null && l.returned_at !== undefined ? l.returned_at : (l.returnedAt || undefined)
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

  // 🛠️ MÉTODO EDUCATIVO: Função addLoan corrigida com mapeamento em snake_case para o Supabase
  const addLoan = async (loanData: any) => {
    const loanId = generateId();
    
    // Captura os dados enviados pelo formulário com segurança de propriedades híbridas
    const bId = loanData.bookId || loanData.book_id;
    const bName = loanData.borrowerName || loanData.borrower_name;
    const bContact = loanData.borrowerContact || loanData.borrowerEmail || loanData.borrower_email;
    const bDate = loanData.borrowDate || loanData.loan_date || new Date().toISOString();
    const rDate = loanData.returnDate || loanData.due_date;

    // Objeto usado internamente no front-end em formato camelCase
    const newLoan: Loan = {
      id: loanId,
      bookId: bId,
      borrowerName: bName,
      borrowerContact: bContact,
      borrowDate: bDate,
      returnDate: rDate,
      returnedAt: undefined,
    };

    // DOCUMENTAÇÃO: Mapeia as propriedades locais para os nomes exatos das colunas do seu banco
    const { error: loanError } = await supabase.from('emprestimos').insert([
      {
        id: newLoan.id,
        book_id: newLoan.bookId,         // Correção: de bookId para book_id
        borrower_name: newLoan.borrowerName, // Correção: de borrowerName para borrower_name
        borrower_email: newLoan.borrowerContact, 
        loan_date: newLoan.borrowDate,   // Correção: de loanDate para loan_date
        due_date: newLoan.returnDate,     // Correção: de dueDate para due_date
        returned_at: null                // Correção: de returnedAt para returned_at
      }
    ]);

    // Se houver algum erro de coluna no Supabase, joga o erro para o formulário não fechar
    if (loanError) {
      console.error('Erro no Supabase ao inserir empréstimo:', loanError.message);
      throw new Error(loanError.message);
    }

    // Atualiza o status do livro no Supabase para 'Emprestado'
    const { error: bookError } = await supabase.from('books').update({ status: 'Emprestado' }).eq('id', bId);
    if (bookError) {
      console.error('Erro no Supabase ao atualizar livro:', bookError.message);
      throw new Error(bookError.message);
    }

    // Somente se as duas queries acima derem certo, atualizamos a tela local do React
    setLoans((prev: Loan[]) => [newLoan, ...prev]);
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === bId ? { ...b, status: 'Emprestado' } : b)));
  };

  // 🛠️ MÉTODO EDUCATIVO: Função returnLoan corrigida com returned_at em snake_case
  const returnLoan = async (id: string) => {
    const loan = loans.find((l: Loan) => l.id === id);
    if (!loan) return;

    const returnedAtStr = new Date().toISOString();

    // Atualiza no banco de dados Supabase usando a coluna em snake_case
    const { error: loanError } = await supabase
      .from('emprestimos')
      .update({ returned_at: returnedAtStr }) // Correção: de returnedAt para returned_at
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

    // Atualiza o estado local do React
    setLoans((prev: Loan[]) => prev.map((l: Loan) => (l.id === id ? { ...l, returnedAt: returnedAtStr } : l)));
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