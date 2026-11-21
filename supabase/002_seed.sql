-- =====================================================================
-- DỮ LIỆU KHỞI TẠO
-- 1) Sửa email + tên bên dưới thành của bạn (admin đầu tiên) rồi chạy.
-- 2) Phần danh mục mẫu là tuỳ chọn, có thể xoá/sửa sau trong app.
-- =====================================================================

-- Admin đầu tiên (BẮT BUỘC sửa email)
insert into public.members (email, display_name, role)
values (lower('ban@example.com'), 'Chủ nhà', 'admin')
on conflict (email) do update set role = 'admin';

-- Thêm thành viên khác (tuỳ chọn) - hoặc thêm trong app ở màn "Tài khoản"
-- insert into public.members (email, display_name) values ('vo@example.com', 'Vợ');

-- ---------------------------------------------------------------------
-- Danh mục mẫu
-- ---------------------------------------------------------------------
insert into public.categories (code, name, color, icon, sort_order) values
  ('tien_hang', 'Tiền hàng',            '#2a78d6', '📦', 1),
  ('sinh_hoat', 'Sinh hoạt hằng ngày',  '#eb6834', '🏠', 2),
  ('thu_nhap',  'Thu nhập',             '#1baf7a', '💰', 3)
on conflict (code) do nothing;

insert into public.category_items (category_code, code, name, direction, sort_order) values
  ('tien_hang', 'nhap_hang',    'Nhập hàng',     'out', 1),
  ('tien_hang', 'tien_hang_ve', 'Tiền hàng về',  'in',  2),
  ('tien_hang', 'tien_ship',    'Tiền ship',     'out', 3),
  ('sinh_hoat', 'tien_an',      'Tiền ăn',       'out', 1),
  ('sinh_hoat', 'xang_xe',      'Xăng xe',       'out', 2),
  ('sinh_hoat', 'dien_nuoc',    'Điện nước',     'out', 3),
  ('thu_nhap',  'luong',        'Tiền lương',    'in',  1)
on conflict (category_code, code) do nothing;

insert into public.badges (item_id, name, color, sort_order)
select i.id, b.name, b.color, b.sort_order
  from public.category_items i
  cross join (values ('TQ', '#e34948', 1), ('VN', '#008300', 2), ('Jang Jang', '#6250d6', 3)) as b(name, color, sort_order)
 where i.category_code = 'tien_hang' and i.code = 'nhap_hang'
on conflict (item_id, name) do nothing;
