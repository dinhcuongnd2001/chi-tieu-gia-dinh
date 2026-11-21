-- =====================================================================
-- Chuyển icon nhóm từ emoji sang bộ icon (react-icons / Phosphor)
-- Chạy 1 lần trong Supabase SQL Editor.
-- =====================================================================

-- Cho phép lưu key icon dài hơn (vd. 'piggy-bank')
alter table public.categories drop constraint if exists categories_icon_check;
alter table public.categories add constraint categories_icon_check check (char_length(icon) <= 40);

-- Đổi các emoji mẫu sang key icon
update public.categories set icon = 'package' where icon = '📦';
update public.categories set icon = 'house'   where icon = '🏠';
update public.categories set icon = 'money'   where icon = '💰';
update public.categories set icon = 'tag'     where icon is null or icon = '';
