-- ============================================================================
-- Villa Recanto do Mar — schema do banco de dados (Supabase / Postgres)
-- ============================================================================
-- Como usar: copie todo este arquivo e cole no SQL Editor do seu projeto
-- Supabase (menu "SQL Editor" -> "New query"), depois clique em "Run".
-- Pode rodar tudo de uma vez, de cima a baixo.
--
-- Filosofia de segurança adotada aqui:
--   - RLS (Row Level Security) fica LIGADO em toda tabela.
--   - A leitura pública (sem login) só é permitida para o que É seguro
--     ficar público: os quartos e os preços por data (afinal, isso aparece
--     no site para qualquer visitante).
--   - Reservas, e-mails/telefones de hóspedes, comprovantes, estatísticas
--     de visualização etc. NUNCA ficam com policy pública — só o painel
--     administrativo autenticado enxerga isso, e a criação de reservas
--     acontece só através das funções serverless (api/*.js), que usam a
--     chave "service role" (secreta) e nunca ficam expostas no navegador.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensão para gerar UUID
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tabela: rooms (quartos/categorias da pousada)
-- ----------------------------------------------------------------------------
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  capacity int not null default 2,
  base_price numeric(10, 2) not null,
  photos jsonb not null default '[]'::jsonb, -- array de URLs (Supabase Storage)
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table rooms is 'Quartos/categorias de hospedagem da pousada.';
comment on column rooms.base_price is 'Preço padrão por noite (usado quando não há um preço específico para a data em price_overrides).';

-- ----------------------------------------------------------------------------
-- Tabela: price_overrides (preço específico OU bloqueio de uma data)
-- ----------------------------------------------------------------------------
create table if not exists price_overrides (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  date date not null,
  price numeric(10, 2), -- null = usa o base_price do quarto
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, date)
);

comment on table price_overrides is 'Preço específico ou bloqueio de disponibilidade para uma data de um quarto.';

-- ----------------------------------------------------------------------------
-- Tabela: property_photos (fotos da área comum / serviços da pousada,
-- não ligadas a um quarto específico — aparecem num carrossel na home)
-- ----------------------------------------------------------------------------
create table if not exists property_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table property_photos is 'Fotos gerais da pousada (área comum, serviços) exibidas na página inicial.';

-- ----------------------------------------------------------------------------
-- Tabela: reservations (reservas)
-- ----------------------------------------------------------------------------
create type reservation_status as enum (
  'aguardando_pix',
  'pix_confirmado',
  'cancelada',
  'concluida'
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id),
  guest_name text not null,
  guest_email text,
  guest_phone text not null,
  guest_count int not null default 1,
  children_ages jsonb not null default '[]'::jsonb, -- ex: [5, 8] = duas crianças, 5 e 8 anos
  check_in date not null,
  check_out date not null,
  nights int not null,
  total_price numeric(10, 2) not null,
  deposit_percent numeric(5, 2) not null default 30,
  deposit_amount numeric(10, 2) not null,
  status reservation_status not null default 'aguardando_pix',
  pix_txid text,
  pix_payload text,
  guest_marked_paid_at timestamptz, -- quando o hóspede clicou em "já enviei o comprovante"
  confirmed_at timestamptz,
  confirmed_by text, -- e-mail do admin que confirmou
  notes text,
  created_at timestamptz not null default now(),

  constraint check_dates check (check_out > check_in)
);

comment on table reservations is 'Reservas feitas pelo site. O sinal (deposit_amount) é cobrado via Pix; o saldo é pago presencialmente no check-in.';

create index if not exists idx_reservations_status on reservations(status);
create index if not exists idx_reservations_room_dates on reservations(room_id, check_in, check_out);

-- ----------------------------------------------------------------------------
-- Tabela: room_views (visualizações de cada quarto, para estatísticas)
-- ----------------------------------------------------------------------------
create table if not exists room_views (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_room_views_room on room_views(room_id, viewed_at);

-- ----------------------------------------------------------------------------
-- Tabela: funnel_events (funil de abandono: quantas pessoas passaram por
-- cada etapa antes de pagar o sinal)
-- ----------------------------------------------------------------------------
create type funnel_stage as enum (
  'viu_quarto',
  'iniciou_reserva',
  'gerou_pix',
  'confirmou_envio_comprovante'
);

create table if not exists funnel_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  room_id uuid references rooms(id) on delete set null,
  stage funnel_stage not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_funnel_events_stage on funnel_events(stage, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table rooms enable row level security;
alter table price_overrides enable row level security;
alter table property_photos enable row level security;
alter table reservations enable row level security;
alter table room_views enable row level security;
alter table funnel_events enable row level security;

-- --- rooms: leitura pública dos quartos ativos; escrita só autenticado ------
create policy "rooms_public_select" on rooms
  for select
  to anon, authenticated
  using (active = true or auth.role() = 'authenticated');

create policy "rooms_admin_write" on rooms
  for all
  to authenticated
  using (true)
  with check (true);

-- --- price_overrides: leitura pública (precisa pro site calcular o preço) --
create policy "price_overrides_public_select" on price_overrides
  for select
  to anon, authenticated
  using (true);

create policy "price_overrides_admin_write" on price_overrides
  for all
  to authenticated
  using (true)
  with check (true);

-- --- property_photos: leitura pública das ativas; escrita só autenticado ----
create policy "property_photos_public_select" on property_photos
  for select
  to anon, authenticated
  using (active = true or auth.role() = 'authenticated');

create policy "property_photos_admin_write" on property_photos
  for all
  to authenticated
  using (true)
  with check (true);

-- --- reservations: SEM policy pública nenhuma -------------------------------
-- Criação de reserva acontece via api/create-reservation.js (service role,
-- que ignora RLS). Só o admin autenticado lê/atualiza pelo painel.
create policy "reservations_admin_all" on reservations
  for all
  to authenticated
  using (true)
  with check (true);

-- --- room_views: SEM policy pública ------------------------------------------
-- Inserção acontece via api/log-event.js (service role). Só admin lê.
create policy "room_views_admin_select" on room_views
  for select
  to authenticated
  using (true);

-- --- funnel_events: SEM policy pública ---------------------------------------
create policy "funnel_events_admin_select" on funnel_events
  for select
  to authenticated
  using (true);

-- ============================================================================
-- STORAGE: bucket para fotos dos quartos
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('room-photos', 'room-photos', true)
on conflict (id) do nothing;

-- Qualquer pessoa pode VER as fotos (o bucket é público, é o esperado — são
-- fotos do site). Só o admin autenticado pode enviar/apagar fotos.
create policy "room_photos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'room-photos');

create policy "room_photos_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'room-photos');

create policy "room_photos_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'room-photos');

create policy "room_photos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'room-photos');

-- ============================================================================
-- Dados de exemplo (opcional) — apague ou ajuste como quiser
-- ============================================================================
insert into rooms (slug, name, description, capacity, base_price, sort_order)
values
  ('quarto-vista-mar', 'Quarto Vista Mar', 'Quarto com varanda e vista para o mar, cama de casal.', 2, 350.00, 1),
  ('quarto-standard', 'Quarto Standard', 'Quarto confortável, cama de casal ou duas de solteiro.', 2, 250.00, 2)
on conflict (slug) do nothing;

-- ============================================================================
-- Fim do schema.
-- ============================================================================
