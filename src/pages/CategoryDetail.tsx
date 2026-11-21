import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ColorPicker } from '../components/ColorPicker'
import { PageHeader } from '../components/Layout'
import { ArrowLeft, Eye, EyeOff, ListPlus, Pencil, Plus, Tag } from 'lucide-react'
import { DirectionTag, EmptyState, Modal, useToast } from '../components/ui'
import { useCatalog } from '../context/CatalogContext'
import { errorMessage } from '../lib/api'
import { uniqueCode } from '../lib/format'
import { supabase } from '../lib/supabase'
import { CATEGORY_COLORS, type Badge, type CategoryItem, type Direction } from '../lib/types'
import { CategoryIcon } from '../lib/categoryIcons'

export function CategoryDetail() {
  const { code = '' } = useParams()
  const { categoryByCode, items, badges } = useCatalog()
  const cat = categoryByCode.get(code)
  const [editingItem, setEditingItem] = useState<CategoryItem | 'new' | null>(null)
  const [editingBadge, setEditingBadge] = useState<{ item: CategoryItem; badge: Badge | null } | null>(null)
  const [showHidden, setShowHidden] = useState(false)

  if (!cat) {
    return (
      <EmptyState>
        Không tìm thấy nhóm.{' '}
        <Link to="/danh-muc" className="text-accent underline">
          Quay lại
        </Link>
      </EmptyState>
    )
  }

  const catItems = items.filter((i) => i.category_code === code)
  const visible = catItems.filter((i) => showHidden || i.is_active)
  const hiddenCount = catItems.filter((i) => !i.is_active).length

  return (
    <>
      <Link to="/danh-muc" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
        <ArrowLeft className="h-4 w-4" /> Danh mục
      </Link>
      <div className="mb-1">
        <CategoryIcon icon={cat.icon} color={cat.color} size={52} />
      </div>
      <PageHeader title={cat.name}>
        <button className="btn-primary" onClick={() => setEditingItem('new')}>
          <Plus className="h-4 w-4" /> Thêm khoản
        </button>
      </PageHeader>

      {visible.length === 0 ? (
        <EmptyState icon={ListPlus} title="Chưa có khoản nào">Bấm “Thêm khoản” để tạo khoản con cho nhóm này.</EmptyState>
      ) : (
        <div className="space-y-3">
          {visible.map((it) => {
            const itBadges = badges.filter((b) => b.item_id === it.id && (showHidden || b.is_active))
            return (
              <div key={it.id} className={`card p-4 sm:p-5 ${it.is_active ? '' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[15.5px] font-bold">{it.name}</span>
                  <DirectionTag direction={it.direction} />
                  {!it.is_active && <span className="rounded-full bg-[rgba(60,48,28,.06)] px-2 py-0.5 text-[11px] font-semibold text-muted">Đã ẩn</span>}
                  <button className="btn-ghost ml-auto px-3 py-1.5 text-[13px]" onClick={() => setEditingItem(it)}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted"><Tag className="h-3.5 w-3.5" /> Badge</span>
                  {itBadges.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setEditingBadge({ item: it, badge: b })}
                      className={`inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-white/80 px-2.5 py-1 text-xs font-semibold transition hover:border-accent hover:bg-white ${b.is_active ? '' : 'line-through opacity-60'}`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                      {b.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setEditingBadge({ item: it, badge: null })}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-accent/50 px-2.5 py-1 text-xs font-semibold text-accent-deep transition hover:border-accent hover:bg-white/70"
                  >
                    <Plus className="h-3.5 w-3.5" /> Badge
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hiddenCount > 0 && (
        <button className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline" onClick={() => setShowHidden((v) => !v)}>
          {showHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showHidden ? 'Ẩn mục đã ẩn' : `Hiện ${hiddenCount} khoản đã ẩn`}
        </button>
      )}

      <Modal open={editingItem !== null} title={editingItem === 'new' ? 'Thêm khoản' : 'Sửa khoản'} icon={editingItem === 'new' ? ListPlus : Pencil} onClose={() => setEditingItem(null)}>
        {editingItem !== null && (
          <ItemForm
            key={editingItem === 'new' ? 'new' : editingItem.id}
            categoryCode={code}
            initial={editingItem === 'new' ? null : editingItem}
            nextOrder={catItems.length + 1}
            onDone={() => setEditingItem(null)}
          />
        )}
      </Modal>

      <Modal open={editingBadge !== null} title={editingBadge?.badge ? 'Sửa badge' : `Thêm badge cho “${editingBadge?.item.name}”`} icon={Tag} onClose={() => setEditingBadge(null)}>
        {editingBadge && (
          <BadgeForm
            key={editingBadge.badge?.id ?? 'new'}
            item={editingBadge.item}
            initial={editingBadge.badge}
            nextColor={CATEGORY_COLORS[badges.filter((b) => b.item_id === editingBadge.item.id).length % CATEGORY_COLORS.length]}
            onDone={() => setEditingBadge(null)}
          />
        )}
      </Modal>
    </>
  )
}

function ItemForm({
  categoryCode,
  initial,
  nextOrder,
  onDone,
}: {
  categoryCode: string
  initial: CategoryItem | null
  nextOrder: number
  onDone: () => void
}) {
  const { reload, items } = useCatalog()
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [direction, setDirection] = useState<Direction>(initial?.direction ?? 'out')
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? nextOrder)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (initial) {
        await supabase
          .from('category_items')
          .update({ name: name.trim(), direction, sort_order: sortOrder })
          .eq('id', initial.id)
          .throwOnError()
      } else {
        await supabase
          .from('category_items')
          .insert({
            category_code: categoryCode,
            name: name.trim(),
            code: uniqueCode(name, items.filter((i) => i.category_code === categoryCode).map((i) => i.code), 'khoan'),
            direction,
            sort_order: sortOrder,
          })
          .throwOnError()
      }
      await reload()
      toast('Đã lưu khoản')
      onDone()
    } catch (err) {
      const m = errorMessage(err)
      toast(m.includes('duplicate') ? 'Khoản này đã tồn tại trong nhóm' : m, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive() {
    if (!initial) return
    try {
      await supabase.from('category_items').update({ is_active: !initial.is_active }).eq('id', initial.id).throwOnError()
      await reload()
      onDone()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="label">Tên khoản *</span>
        <input
          className="input"
          required
          autoFocus
          maxLength={60}
          value={name}
          placeholder="vd. Nhập hàng"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div>
        <span className="label">Loại tiền</span>
        <div className="grid grid-cols-2 gap-2">
          {(['out', 'in'] as Direction[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              aria-pressed={direction === d}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                direction === d ? (d === 'in' ? 'border-in bg-[rgba(4,120,87,.1)] text-in shadow-[0_0_0_3px_rgba(4,120,87,.1)]' : 'border-out bg-[rgba(220,38,38,.08)] text-out shadow-[0_0_0_3px_rgba(220,38,38,.08)]') : 'border-line-2 bg-white/70 text-ink-2 hover:bg-white'
              }`}
            >
              {d === 'out' ? '↑ Tiền ra (chi)' : '↓ Tiền vào (thu)'}
            </button>
          ))}
        </div>
        {initial && direction !== initial.direction && (
          <p className="mt-1.5 text-xs text-out">Lưu ý: các giao dịch cũ vẫn giữ loại cũ, chỉ giao dịch mới/sửa mới áp dụng.</p>
        )}
      </div>
      <label className="block">
        <span className="label">Thứ tự hiển thị</span>
        <input type="number" className="input w-28" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      <div className="flex flex-wrap gap-2 pt-2">
        <button className="btn-primary" disabled={busy}>
          Lưu
        </button>
        <button type="button" className="btn-ghost" onClick={onDone}>
          Huỷ
        </button>
        {initial && (
          <button type="button" className="btn-ghost ml-auto" onClick={toggleActive}>
            {initial.is_active ? 'Ẩn khoản' : 'Hiện lại'}
          </button>
        )}
      </div>
    </form>
  )
}

function BadgeForm({
  item,
  initial,
  nextColor,
  onDone,
}: {
  item: CategoryItem
  initial: Badge | null
  nextColor: string
  onDone: () => void
}) {
  const { reload, badges } = useCatalog()
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? nextColor)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (initial) {
        await supabase.from('badges').update({ name: name.trim(), color }).eq('id', initial.id).throwOnError()
      } else {
        const order = badges.filter((b) => b.item_id === item.id).length + 1
        await supabase.from('badges').insert({ item_id: item.id, name: name.trim(), color, sort_order: order }).throwOnError()
      }
      await reload()
      toast('Đã lưu badge')
      onDone()
    } catch (err) {
      const m = errorMessage(err)
      toast(m.includes('duplicate') ? 'Badge này đã có' : m, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive() {
    if (!initial) return
    try {
      await supabase.from('badges').update({ is_active: !initial.is_active }).eq('id', initial.id).throwOnError()
      await reload()
      onDone()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="label">Tên badge *</span>
        <input className="input" required autoFocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="vd. TQ" />
      </label>
      <div>
        <span className="label">Màu</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <button className="btn-primary" disabled={busy}>
          Lưu
        </button>
        <button type="button" className="btn-ghost" onClick={onDone}>
          Huỷ
        </button>
        {initial && (
          <button type="button" className="btn-ghost ml-auto" onClick={toggleActive}>
            {initial.is_active ? 'Ẩn badge' : 'Hiện lại'}
          </button>
        )}
      </div>
    </form>
  )
}
