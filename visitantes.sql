-- Pueblo Vivo · tabla de visitantes (control de acceso)
-- Correr una sola vez en Supabase → SQL Editor → New query → Run.

create table if not exists public.visitantes (
  id bigint generated always as identity primary key,
  nombre text not null,
  whatsapp text not null,
  created_at timestamptz not null default now()
);

alter table public.visitantes enable row level security;

-- Cualquier visitante puede DEJAR sus datos (insert), pero nadie los puede LEER desde la app.
-- Ustedes los ven desde el panel de Supabase → Table editor → visitantes.
create policy "visitantes_insert" on public.visitantes
  for insert to anon, authenticated with check (true);
