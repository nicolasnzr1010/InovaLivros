export type BookCondition = 'Novo' | 'Bom' | 'Regular' | 'Ruim';
export type BookStatus = 'Disponível' | 'Emprestado';

export interface Book {
  id: string;
  title: string;
  author: string;
  photoUrl: string;
  condition: BookCondition;
  status: BookStatus;
  createdAt: string;
}

export interface Loan {
  id: string;
  bookId: string;
  borrowerName: string;
  borrowerContact: string;
  borrowDate: string;
  returnDate: string;
  returnedAt?: string;
}
