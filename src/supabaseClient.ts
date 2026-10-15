/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de iniciar ou compilar o aplicativo.');
}

const projectUrl = new URL(supabaseUrl);
if (!['https:', 'http:'].includes(projectUrl.protocol) || projectUrl.pathname !== '/' || projectUrl.search || projectUrl.hash) {
  throw new Error('VITE_SUPABASE_URL deve conter somente a URL do projeto Supabase, sem /storage, /rest ou outros caminhos.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
