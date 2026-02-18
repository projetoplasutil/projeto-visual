import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    console.error('ERRO: A VITE_SUPABASE_URL no seu arquivo .env está incorreta ou ausente!');
    console.log('Ela deve começar com https:// e terminar com .supabase.co');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
