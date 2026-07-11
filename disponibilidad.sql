-- Pueblo Vivo · Disponibilidad de casas (editable por cada dueño con su clave)
-- Correr una sola vez en Supabase -> SQL Editor -> New query -> Run.

-- 1) Disponibilidad: rangos ocupados por lote. Lectura pública (para el buscador); escritura solo por la función.
create table if not exists public.disp (
  lote int primary key,
  ocupado jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.disp enable row level security;
drop policy if exists disp_lectura_publica on public.disp;
create policy disp_lectura_publica on public.disp for select to anon, authenticated using (true);

-- 2) Claves: el secreto de cada casa (+ lote 0 = clave MAESTRA de los moderadores). Nadie las lee desde la app.
create table if not exists public.claves (
  lote int primary key,
  clave text not null
);
alter table public.claves enable row level security;  -- sin policies: solo la funcion (security definer) las usa

-- 3) Funcion que guarda la disponibilidad validando la clave del lado del servidor.
create or replace function public.set_disp(p_lote int, p_clave text, p_ocupado jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare v_ok boolean;
begin
  select exists(
    select 1 from claves
    where clave = p_clave and (lote = p_lote or lote = 0)   -- su casa, o la clave maestra
  ) into v_ok;
  if not v_ok then
    raise exception 'clave incorrecta';
  end if;
  insert into disp(lote, ocupado, updated_at)
    values (p_lote, coalesce(p_ocupado, '[]'::jsonb), now())
    on conflict (lote) do update set ocupado = excluded.ocupado, updated_at = now();
end;
$fn$;
grant execute on function public.set_disp(int, text, jsonb) to anon, authenticated;

-- 4) Cargar las claves (lote 0 = maestra de moderadores; el resto una por casa).
insert into public.claves(lote, clave) values
  (0,'01bc4b99d76d'),
  (19,'6d252b9d'),(31,'fb7669e3'),(35,'4386e7e4'),(45,'40785255'),(70,'00c2d466'),
  (73,'966882b1'),(89,'f61e1856'),(107,'b61ee439'),(110,'30f64b48'),(138,'4d3f28ad'),
  (171,'42c8525e'),(182,'741fde5c'),(183,'45a602dd'),(206,'22a8daac'),(213,'b02bdd6a'),
  (214,'2a2edb3e'),(215,'a304ac77'),(216,'89604e5e'),(217,'b6aae3a3'),(218,'dc8f4f0f')
on conflict (lote) do update set clave = excluded.clave;
