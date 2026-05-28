import { createClient } from '@supabase/supabase-js';

// Cliente unico de Supabase usado por toda la app en el navegador.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
