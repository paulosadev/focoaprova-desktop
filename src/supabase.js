import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && chave);

// mesmo projeto Supabase do app. PKCE porque o login com Google volta
// por um ?code= no servidor local do Electron.
export const supabase = configurado
  ? createClient(url, chave, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const REDIRECT_GOOGLE = 'http://127.0.0.1:47811/callback';

export async function entrarComEmail(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error) throw new Error(traduzirErro(error.message));
}

export async function entrarComGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: REDIRECT_GOOGLE,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw new Error(traduzirErro(error.message));

  const retorno = await window.desktop.loginGoogle(data.url);
  if (retorno.erro) throw new Error(retorno.erro);

  const troca = await supabase.auth.exchangeCodeForSession(retorno.code);
  if (troca.error) throw new Error(traduzirErro(troca.error.message));
}

export function traduzirErro(msg = '') {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('Failed to fetch')) return 'Sem conexão com a internet.';
  return msg || 'Algo deu errado. Tente de novo.';
}
