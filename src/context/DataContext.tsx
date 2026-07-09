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
    // Deixamos o Supabase gerar o id automático para novos livros se configurado como uuid
    const { data, error } = await supabase
      .from('books')
      .insert([
        {
          ...bookData,
          status: 'Disponível',
          created_at: new Date().toISOString(),
        }
      ])
      .select();

    if (error) {
      console.error('Erro no Supabase (addBook):', error);
      throw error;
    }

    if (data && data[0]) {
      setBooks((prev: Book[]) => [...prev, data[0] as Book]);
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

  // 🛠️ MÉTODO EDUCATIVO: addLoan modificado para retornar o ID gerado pelo próprio Supabase
  const addLoan = async (loanData: any) => {
    const bId = loanData.bookId || loanData.book_id;
    const bName = loanData.borrowerName || loanData.borrower_name;
    const bContact = loanData.borrowerContact || loanData.borrowerEmail || loanData.borrower_email;
    const bDate = loanData.borrowDate || loanData.loan_date || new Date().toISOString().split('T')[0];
    const rDate = loanData.returnDate || loanData.due_date;

    // DOCUMENTAÇÃO: Removemos o campo 'id' manual daqui. O Supabase (PostgreSQL) cria o UUID sozinho.
    const { data: insertedData, error: loanError } = await supabase
      .from('emprestimos')
      .insert([
        {
          livro_id: bId,
          nome_leitor: bName,
          email_leitor: bContact,
          data_emprestimo: bDate,
          data_devolucao_prevista: rDate,
          data_devolucao_real: null,
          status: 'No Prazo'
        }
      ])
      .select(); // O .select() nos devolve o objeto criado com o ID correto gerado pelo banco

    if (loanError) {
      console.error('Erro no Supabase ao inserir empréstimo:', loanError.message);
      throw new Error(loanError.message);
    }

    // Captura o ID real em formato UUID gerado pelo Supabase
    const realSupabaseId = insertedData && insertedData[0] ? insertedData[0].id : Math.random().toString();

    const newLoan: Loan = {
      id: realSupabaseId,
      bookId: bId,
      borrowerName: bName,
      borrowerContact: bContact,
      borrowDate: bDate,
      returnDate: rDate,
      returnedAt: undefined,
    };

    // Atualiza o status do livro na tabela 'books'
    const { error: bookError } = await supabase.from('books').update({ status: 'Emprestado' }).eq('id', bId);
    if (bookError) {
      console.error('Erro no Supabase ao atualizar livro:', bookError.message);
      throw new Error(bookError.message);
    }

    // Atualiza o estado local do React sincronizado com o ID correto do banco
    setLoans((prev: Loan[]) => [newLoan, ...prev]);
    setBooks((prev: Book[]) => prev.map((b: Book) => (b.id === bId ? { ...b, status: 'Emprestado' } : b)));
  };

  const returnLoan = async (id: string) => {
    const loan = loans.find((l: Loan) => l.id === id);
    if (!loan) return;

    const todayDateStr = new Date().toISOString().split('T')[0];

    const { error: loanError } = await supabase
      .from('emprestimos')
      .update({ 
        data_devolucao_real: todayDateStr,
        status: 'Devolvido'
      }) 
      .eq('id', id);

    if (loanError) {
      console.error('Erro no Supabase ao devolver:', loanError.message);
      throw new Error(loanError.message);
    }

    const { error: bookError } = await supabase.from('books').update({ status: 'Disponível' }).eq('id', loan.bookId);
    if (bookError) {
      console.error('Erro no Supabase ao liberar livro:', bookError.message);
      throw new Error(bookError.message);
    }

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