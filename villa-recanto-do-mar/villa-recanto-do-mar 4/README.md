# Villa Recanto do Mar — site de reservas diretas

Site de reservas para a Pousada Villa Recanto do Mar. HTML/CSS/JS puro
(sem framework, sem build, zero dependências de npm) + [Supabase](https://supabase.com)
(banco de dados, login e armazenamento de fotos) + [Vercel](https://vercel.com)
(hospedagem e funções de servidor). Tudo no plano gratuito.

Não depende de nenhum gateway de pagamento: o Pix do sinal (30%) é gerado
localmente, offline, usando a própria chave Pix da pousada (veja `lib/pix.js`).
O saldo (70%) é combinado para ser pago presencialmente no check-in.

Para o passo a passo de colocar isso no ar (criar conta no Supabase, rodar o
SQL, configurar a Vercel), veja o guia em PDF/Word entregue junto com este
projeto. Este README é a referência técnica.

## Estrutura do projeto

```
index.html              Lista de quartos (home)
quarto.html              Detalhe do quarto + formulário de reserva
reserva.html             Página do Pix (QR Code + copia-e-cola)
admin/                    Painel administrativo (login necessário)
  login.html
  index.html              Dashboard (pendências, estatísticas)
  quartos.html             Cadastro de quartos e fotos
  precos.html              Calendário de preços por data / bloqueios
  reservas.html            Lista de reservas + confirmação manual do Pix
assets/                   CSS, JS do navegador (compartilhado)
lib/                      Código compartilhado entre navegador e servidor
  pix.js                    Gerador do "Pix Copia e Cola" (BR Code), offline
  pricing.js                 Cálculo de preço de uma estadia
  supabase-admin.js          Cliente REST mínimo p/ uso nas funções /api
api/                      Funções serverless da Vercel (Node.js)
  create-reservation.js      Cria a reserva e gera o Pix
  get-reservation.js          Devolve os dados de uma reserva (p/ reserva.html)
  mark-paid.js                 Hóspede avisa "já paguei"
  log-event.js                  Estatísticas (visualizações, funil)
sql/schema.sql            Schema completo do banco (rodar no Supabase 1x)
.env.example              Lista das variáveis de ambiente necessárias
```

## Como isso funciona, em resumo

1. **Site público** (`index.html`, `quarto.html`) fala direto com o Supabase
   pelo navegador, usando a chave pública (anon/publishable) — só consegue
   LER quartos e preços, porque é só isso que as políticas de RLS liberam
   para visitantes (veja `sql/schema.sql`).
2. Ao reservar, o navegador chama `POST /api/create-reservation` (uma função
   da Vercel). Essa função RECALCULA o preço a partir do banco (nunca confia
   no navegador), confere se as datas ainda estão livres, gera o Pix e grava
   a reserva usando a chave secreta do Supabase — chave que nunca é exposta
   ao navegador.
3. `reserva.html` mostra o QR Code (gerado no navegador com a biblioteca
   `qrcodejs`, a partir do texto/payload devolvido pela função) e o
   "copia e cola". O hóspede paga pelo app do banco dele.
4. O hóspede pode clicar em "Já paguei" (chama `POST /api/mark-paid`) — isso
   só registra um aviso, não confirma a reserva sozinho.
5. Quem administra a pousada entra em `/admin`, vê o aviso no painel, confere
   o Pix recebido (extrato do banco / comprovante no WhatsApp) e clica em
   "Confirmar Pix" — só aí a reserva muda para confirmada.

## Segurança, em resumo

- RLS (Row Level Security) ligado em toda tabela do banco. Leitura pública
  só é permitida para quartos/preços (o que já aparece no site). Reservas,
  e-mail/telefone de hóspedes e estatísticas só são visíveis para quem está
  autenticado como administrador.
- A chave secreta do Supabase (`SUPABASE_SERVICE_ROLE_KEY`) só existe como
  variável de ambiente da Vercel, usada pelas funções em `/api`. Ela nunca
  aparece em nenhum arquivo dentro de `/assets` ou `/admin`.
- O redirecionamento para a tela de login nas páginas `/admin/*` é só uma
  conveniência de navegação — a proteção de verdade dos dados é a RLS do
  banco, então mesmo alguém "pulando" esse redirecionamento não consegue
  ler ou alterar nada sensível sem estar de fato autenticado.
- Nenhum gateway de pagamento entra no meio do processo: o Pix é gerado
  offline a partir da própria chave da pousada.

## Rodando localmente (opcional, para quem for mexer no código)

Não tem build nem `npm install` (o projeto não tem dependências). Para
testar as páginas estáticas localmente, sirva a pasta com qualquer servidor
estático, por exemplo:

```
npx serve .
```

As chamadas para `/api/*` só funcionam de verdade depois de publicado na
Vercel (ou usando `vercel dev`, que a CLI da Vercel oferece).

## Ajustando

- Cores e estilo: `assets/style.css` (variáveis no topo do arquivo).
- WhatsApp da pousada: `assets/config.js`.
- Percentual do sinal: variável de ambiente `DEPOSIT_PERCENT` na Vercel
  (padrão 30).
- Dados de exemplo dos quartos: apague/ajuste no fim de `sql/schema.sql`
  antes de rodar, ou edite depois pelo painel em `/admin/quartos.html`.
