-- Catálogo de produtos
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unit text not null default 'm²',
  unit_price numeric not null default 0,
  category text not null default 'Outro',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "users_own_products" on products
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
