import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, X, Upload, Image as ImageIcon } from 'lucide-react';
import { BookCondition } from '../types';
import { supabase } from '../supabaseClient'; // Conexão necessária para o Storage

export const Acervo: React.FC = () => {
  const { books, addBook, deleteBook } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [condition, setCondition] = useState<BookCondition>('Bom');
  
  // Upload State
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para fazer o upload do arquivo para o Supabase Storage
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      
      // Gera um nome único para o arquivo evitando duplicados
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Envia o arquivo para o bucket 'capas'
      const { error: uploadError } = await supabase.storage
        .from('capas')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pega a URL pública gerada pelo Supabase
      const { data } = supabase.storage.from('capas').getPublicUrl(filePath);
      setPhotoUrl(data.publicUrl);

    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Falha ao enviar a imagem. Verifique as configurações do Storage.');
    } finally {
      setUploading(false);
    }
  };

  // Gerenciadores do Arrastar e Soltar (Drag and Drop)
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) return;

    addBook({
      title,
      author,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
      condition,
    });
    
    setTitle('');
    setAuthor('');
    setPhotoUrl('');
    setCondition('Bom');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Acervo de Livros</h2>
          <p className="text-white/50 mt-1">Gerencie os livros disponíveis para a comunidade.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isAdding ? 'Cancelar' : 'Adicionar Livro'}
        </button>
      </header>

      {isAdding && (
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-xl">
          <h3 className="font-semibold text-lg mb-4 text-white">Novo Livro</h3>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Título do Livro</label>
              <input 
                required
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none placeholder:text-white/20"
                placeholder="Ex: O Código Da Vinci"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Autor</label>
              <input 
                required
                type="text" 
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none placeholder:text-white/20"
                placeholder="Ex: Dan Brown"
              />
            </div>

            {/* Zona Avançada de Upload Drag and Drop */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Capa do Livro (Arraste ou Selecione)</label>
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                {uploading ? (
                  <p className="text-sm text-blue-400 animate-pulse">Enviando imagem para o servidor...</p>
                ) : photoUrl ? (
                  <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-lg text-emerald-400">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-xs font-medium truncate max-w-xs">Imagem carregada com sucesso!</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-white/40" />
                    <p className="text-sm text-white/60 text-center">
                      Arraste e solte a imagem aqui, ou <span className="text-blue-400 font-medium">procure no computador</span>
                    </p>
                    <p className="text-[10px] text-white/30">Suporta PNG, JPG ou WEBP</p>
                  </>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Estado de Conservação</label>
              <select 
                value={condition}
                onChange={e => setCondition(e.target.value as BookCondition)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none [&>option]:bg-[#0f172a]"
              >
                <option value="Novo">Novo</option>
                <option value="Bom">Bom</option>
                <option value="Regular">Regular</option>
                <option value="Ruim">Ruim</option>
              </select>
            </div>
            <div className="md:col-span-2 pt-2">
              <button 
                type="submit" 
                disabled={uploading}
                className={`w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors shadow-lg ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Salvar Livro
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-white/10 flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por título ou autor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-white rounded-full focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none placeholder:text-white/30 text-sm"
            />
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.length === 0 ? (
            <div className="col-span-full py-12 text-center text-white/40">
              Nenhum livro encontrado.
            </div>
          ) : (
            filteredBooks.map((book) => (
              <div key={book.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col gap-3 group hover:bg-white/10 transition-all">
                <div className="aspect-[3/4] relative overflow-hidden rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                  <img 
                    src={book.photoUrl} 
                    alt={book.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${book.status === 'Disponível' ? 'bg-emerald-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
                      {book.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="font-medium text-sm text-white line-clamp-1">{book.title}</h3>
                  <p className="text-xs text-white/40 mb-2">{book.author}</p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">
                      {book.condition}
                    </span>
                    <button 
                      onClick={() => {
                        if(confirm('Tem certeza que deseja remover este livro?')) deleteBook(book.id);
                      }}
                      className="text-[10px] bg-white/10 px-2 py-1 rounded text-red-400 hover:bg-red-500/20 transition-colors uppercase font-bold tracking-wider"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};