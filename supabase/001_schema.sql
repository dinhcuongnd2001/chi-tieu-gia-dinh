-- =====================================================================
-- THEO DÕI CHI TIÊU - SCHEMA
-- Chạy toàn bộ file này trong Supabase Dashboard > SQL Editor.
-- File có thể chạy lại nhiều lần (idempotent ở mức hợp lý).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. THÀNH VIÊN (danh sách email được phép truy cập)
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email)),
  display_name  text not null check (char_length(display_name) between 1 and 50),
  role          text not null default 'member' check (role in ('admin', 'member')),
  user_id       uuid unique references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Người dùng hiện tại có phải thành viên không
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'admin');
$$;

-- Gọi sau khi đăng nhập: gắn tài khoản auth với dòng members theo email
create or replace function public.claim_membership()
returns public.members language plpgsql security definer set search_path = public as $$
declare
  m public.members;
begin
  if auth.uid() is null then
    return null;
  end if;
  update public.members
     set user_id = auth.uid()
   where user_id is null
     and email = lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into m from public.members where user_id = auth.uid();
  return m;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. DANH MỤC: categories -> category_items -> badges
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name        text not null check (char_length(name) between 1 and 60),
  color       text not null default '#2a78d6' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon        text check (char_length(icon) <= 40),  -- key icon (vd. 'package') hoặc emoji
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.category_items (
  id             uuid primary key default gen_random_uuid(),
  category_code  text not null references public.categories(code) on update cascade on delete restrict,
  code           text not null check (code ~ '^[a-z0-9_]{2,40}$'),
  name           text not null check (char_length(name) between 1 and 60),
  direction      text not null check (direction in ('in', 'out')),
  sort_order     int  not null default 0,
  is_active      boolean not null default true,
  created_by     uuid default auth.uid() references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (category_code, code)
);
create index if not exists category_items_category_idx on public.category_items(category_code);

create table if not exists public.badges (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.category_items(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  color       text not null default '#52514e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (item_id, name)
);
create index if not exists badges_item_idx on public.badges(item_id);

-- ---------------------------------------------------------------------
-- 3. GIAO DỊCH
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  txn_date        date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  amount          bigint not null check (amount > 0 and amount <= 100000000000),
  item_id         uuid not null references public.category_items(id) on delete restrict,
  category_code   text not null references public.categories(code) on update cascade on delete restrict,
  direction       text not null check (direction in ('in', 'out')),
  payment_method  text check (payment_method in ('cash', 'transfer', 'card', 'ewallet')),
  note            text check (char_length(note) <= 500),
  receipt_path    text check (char_length(receipt_path) <= 300),
  created_by      uuid not null default auth.uid() references auth.users(id),
  updated_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists transactions_date_idx      on public.transactions(txn_date desc);
create index if not exists transactions_item_idx      on public.transactions(item_id);
create index if not exists transactions_category_idx  on public.transactions(category_code, txn_date);
create index if not exists transactions_amount_idx    on public.transactions(txn_date, direction, amount desc);

create table if not exists public.transaction_badges (
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  badge_id        uuid not null references public.badges(id) on delete cascade,
  primary key (transaction_id, badge_id)
);
create index if not exists transaction_badges_badge_idx on public.transaction_badges(badge_id);

-- category_code / direction luôn lấy theo item (client không thể làm sai lệch)
create or replace function public.tg_transactions_fill()
returns trigger language plpgsql set search_path = public as $$
declare
  it public.category_items;
begin
  select * into it from public.category_items where id = new.item_id;
  if not found then
    raise exception 'Khoản chi tiêu không tồn tại';
  end if;
  new.category_code := it.category_code;
  new.direction     := it.direction;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists transactions_fill on public.transactions;
create trigger transactions_fill
  before insert or update on public.transactions
  for each row execute function public.tg_transactions_fill();

-- Badge gắn vào giao dịch phải thuộc đúng khoản (item) của giao dịch
create or replace function public.tg_transaction_badges_check()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1
      from public.badges b
      join public.transactions t on t.item_id = b.item_id
     where b.id = new.badge_id and t.id = new.transaction_id
  ) then
    raise exception 'Badge không thuộc khoản của giao dịch';
  end if;
  return new;
end;
$$;

drop trigger if exists transaction_badges_check on public.transaction_badges;
create trigger transaction_badges_check
  before insert or update on public.transaction_badges
  for each row execute function public.tg_transaction_badges_check();

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.members            enable row level security;
alter table public.categories         enable row level security;
alter table public.category_items     enable row level security;
alter table public.badges             enable row level security;
alter table public.transactions       enable row level security;
alter table public.transaction_badges enable row level security;

-- members: thành viên xem được danh sách; chỉ admin thêm/sửa/xoá
drop policy if exists members_select on public.members;
drop policy if exists members_admin_insert on public.members;
drop policy if exists members_admin_update on public.members;
drop policy if exists members_admin_delete on public.members;
create policy members_select       on public.members for select to authenticated using (public.is_member());
create policy members_admin_insert on public.members for insert to authenticated with check (public.is_admin());
create policy members_admin_update on public.members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy members_admin_delete on public.members for delete to authenticated using (public.is_admin() and user_id is distinct from auth.uid());

-- danh mục: thành viên xem/thêm/sửa; chỉ admin xoá hẳn (UI dùng ẩn)
do $$
declare t text;
begin
  foreach t in array array['categories', 'category_items', 'badges'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.is_member())', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.is_member())', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.is_member()) with check (public.is_member())', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- giao dịch: thành viên xem tất cả; sửa/xoá giao dịch của mình (admin sửa được mọi giao dịch)
drop policy if exists transactions_select on public.transactions;
drop policy if exists transactions_insert on public.transactions;
drop policy if exists transactions_update on public.transactions;
drop policy if exists transactions_delete on public.transactions;
create policy transactions_select on public.transactions for select to authenticated
  using (public.is_member());
create policy transactions_insert on public.transactions for insert to authenticated
  with check (public.is_member());
create policy transactions_update on public.transactions for update to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()))
  with check (public.is_member());
create policy transactions_delete on public.transactions for delete to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()));

drop policy if exists transaction_badges_select on public.transaction_badges;
drop policy if exists transaction_badges_write  on public.transaction_badges;
drop policy if exists transaction_badges_delete on public.transaction_badges;
create policy transaction_badges_select on public.transaction_badges for select to authenticated
  using (public.is_member());
create policy transaction_badges_write on public.transaction_badges for insert to authenticated
  with check (exists (select 1 from public.transactions t
                       where t.id = transaction_id
                         and public.is_member()
                         and (t.created_by = auth.uid() or public.is_admin())));
create policy transaction_badges_delete on public.transaction_badges for delete to authenticated
  using (exists (select 1 from public.transactions t
                  where t.id = transaction_id
                    and public.is_member()
                    and (t.created_by = auth.uid() or public.is_admin())));

-- Quyền mức bảng: project Supabase mới KHÔNG tự cấp cho role authenticated.
-- RLS ở trên vẫn quyết định từng dòng được xem/sửa.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.members, public.categories, public.category_items,
  public.badges, public.transactions, public.transaction_badges
  to authenticated;

-- Không cho anon truy cập gì
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------
-- 5. LƯU GIAO DỊCH + BADGE (1 lần gọi, atomic). Chạy với quyền người gọi => RLS áp dụng.
-- ---------------------------------------------------------------------
create or replace function public.save_transaction(
  p_id             uuid,
  p_txn_date       date,
  p_amount         bigint,
  p_item_id        uuid,
  p_payment_method text,
  p_note           text,
  p_receipt_path   text,
  p_badge_ids      uuid[]
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into public.transactions (txn_date, amount, item_id, payment_method, note, receipt_path)
    values (p_txn_date, p_amount, p_item_id, nullif(p_payment_method, ''), nullif(trim(p_note), ''), nullif(p_receipt_path, ''))
    returning id into v_id;
  else
    update public.transactions
       set txn_date = p_txn_date,
           amount = p_amount,
           item_id = p_item_id,
           payment_method = nullif(p_payment_method, ''),
           note = nullif(trim(p_note), ''),
           receipt_path = nullif(p_receipt_path, '')
     where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Không tìm thấy giao dịch hoặc bạn không có quyền sửa';
    end if;
    delete from public.transaction_badges where transaction_id = v_id;
  end if;

  if p_badge_ids is not null and array_length(p_badge_ids, 1) > 0 then
    insert into public.transaction_badges (transaction_id, badge_id)
    select v_id, b from unnest(p_badge_ids) as b
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. THỐNG KÊ (security invoker => tuân theo RLS)
-- ---------------------------------------------------------------------
create or replace function public.stats_breakdown(p_from date, p_to date)
returns table (category_code text, item_id uuid, direction text, total bigint, txn_count bigint)
language sql stable security invoker set search_path = public as $$
  select t.category_code, t.item_id, t.direction, sum(t.amount)::bigint, count(*)::bigint
    from public.transactions t
   where t.txn_date between p_from and p_to
   group by 1, 2, 3;
$$;

create or replace function public.stats_badges(p_from date, p_to date)
returns table (badge_id uuid, total bigint, txn_count bigint)
language sql stable security invoker set search_path = public as $$
  select tb.badge_id, sum(t.amount)::bigint, count(*)::bigint
    from public.transactions t
    join public.transaction_badges tb on tb.transaction_id = t.id
   where t.txn_date between p_from and p_to
   group by 1;
$$;

create or replace function public.stats_trend(p_from date, p_to date, p_bucket text)
returns table (bucket date, direction text, total bigint)
language plpgsql stable security invoker set search_path = public as $$
begin
  if p_bucket not in ('day', 'week', 'month', 'year') then
    raise exception 'bucket không hợp lệ';
  end if;
  return query
    select date_trunc(p_bucket, t.txn_date::timestamp)::date, t.direction, sum(t.amount)::bigint
      from public.transactions t
     where t.txn_date between p_from and p_to
     group by 1, 2
     order by 1;
end;
$$;

revoke execute on function public.save_transaction(uuid, date, bigint, uuid, text, text, text, uuid[]) from public, anon;
revoke execute on function public.stats_breakdown(date, date) from public, anon;
revoke execute on function public.stats_badges(date, date) from public, anon;
revoke execute on function public.stats_trend(date, date, text) from public, anon;
revoke execute on function public.claim_membership() from public, anon;
grant execute on function public.save_transaction(uuid, date, bigint, uuid, text, text, text, uuid[]) to authenticated;
grant execute on function public.stats_breakdown(date, date) to authenticated;
grant execute on function public.stats_badges(date, date) to authenticated;
grant execute on function public.stats_trend(date, date, text) to authenticated;
grant execute on function public.claim_membership() to authenticated;

-- ---------------------------------------------------------------------
-- 7. STORAGE: ảnh hoá đơn (bucket private)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists receipts_select on storage.objects;
drop policy if exists receipts_insert on storage.objects;
drop policy if exists receipts_delete on storage.objects;
create policy receipts_select on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_member());
create policy receipts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_member());
create policy receipts_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_member() and (owner_id = auth.uid()::text or public.is_admin()));
