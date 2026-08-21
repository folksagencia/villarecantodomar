// assets/supabase-client.js
//
// Configuração do Supabase para o navegador (site público E painel admin).
//
// IMPORTANTE sobre segurança: a "chave pública" abaixo (anon/publishable
// key) foi feita para ser exposta no navegador — não é segredo. Ela sozinha
// NÃO dá acesso a nada sensível porque o banco tem RLS (Row Level Security)
// ligado: reservas, e-mails/telefones de hóspedes e estatísticas só podem
// ser lidos por quem estiver logado como administrador (veja sql/schema.sql).
// A chave secreta de verdade ("service role") NUNCA aparece em nenhum
// arquivo dentro de /assets ou /admin — ela mora só nas variáveis de
// ambiente da Vercel, usada apenas pelas funções dentro de /api.
//
// Projeto Supabase da Pousada Villa Recanto do Mar.
const SUPABASE_URL = "https://gqsuaezvjonwyguqcxpt.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_Gtq-i2PSdr4NKbqfX28h7A_Q2VnRXJf";

// `supabase` global vem do script carregado no <head> de cada página:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
const villaSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
