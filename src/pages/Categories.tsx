import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ColorPicker } from '../components/ColorPicker'
import { CategoryIcon, IconPicker } from '../lib/categoryIcons'
import { PageHeader } from '../components/Layout'
import { ChevronDown, ChevronUp, Eye, EyeOff, FolderPlus, Layers, Pencil, Plus, Save } from 'lucide-react'
import { EmptyState, Modal, useToast } from '../components/ui'
import { useCatalog } from '../context/CatalogContext'
import { errorMessage } from '../lib/api'
import { uniqueCode } from '../lib/format'
import { supabase } from '../lib/supabase'
import { CATEGORY_COLORS, type Category } from '../lib/types'

export function Categories() {
  const { categories, items, badges, reload } = useCatalog()
  const toast = useToast()
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [showHidden, setShowHidden] = useState(false)

  const visible = categories.filter((c) => showHidden || c.is_active)
  const hiddenCount = categories.filter((c) => !c.is_active).length

  async function move(c: Category, dir: -1 | 1) {
    const list = categories.filter((x) => x.is_active || showHidden)
    const idx = list.findIndex((x) => x.id === c.id)
    const other = list[idx + dir]
    if (!other) return
    const reordered = [...list]
    reordered[idx] = other
    reordered[idx + dir] = c
    try {
      await Promise.all(
        reordered.map((x, i) => supabase.from('categories').update({ sort_order: i + 1 }).eq('id', x.id).throwOnError()),
      )
      await reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Danh mục" sub="Khai báo nhóm, khoản và badge để ghi chép">
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Thêm nhóm
        </button>
      </PageHeader>
      <p className="mb-5 rounded-2xl border border-white/80 bg-white/55 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
        Mỗi <b>nhóm</b> (vd. Tiền hàng, Sinh hoạt) gồm nhiều <b>khoản</b> (vd. Nhập hàng, Tiền ship). Mỗi khoản có thể có các{' '}
        <b>badge</b> (vd. TQ, VN) để ghi chi tiết hơn. Bấm vào nhóm để quản lý khoản và badge.
      </p>

      {visible.length === 0 ? (
        <EmptyState icon={Layers} title="Chưa có nhóm nào">Bấm “Thêm nhóm” để bắt đầu.</EmptyState>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {visible.map((c, idx) => {
            const its = items.filter((i) => i.category_code === c.code && i.is_active)
            const bCount = badges.filter((b) => its.some((i) => i.id === b.item_id) && b.is_active).length
            return (
              <div key={c.id} className={`card flex items-stretch overflow-hidden ${c.is_active ? '' : 'opacity-60'}`}>
                <span className="w-1.5 shrink-0 rounded-l-[18px]" style={{ background: c.color }} />
                <Link to={`/danh-muc/${c.code}`} className="min-w-0 flex-1 p-4 transition hover:bg-white/50">
                  <div className="flex items-center gap-2.5 font-display text-[15.5px] font-bold">
                    <CategoryIcon icon={c.icon} color={c.color} size={42} />
                    <span className="truncate">{c.name}</span>
                    {!c.is_active && <span className="rounded-full bg-[rgba(60,48,28,.06)] px-2 py-0.5 font-sans text-[11px] font-semibold text-muted">Đã ẩn</span>}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    {its.length} khoản · {bCount} badge
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {its.slice(0, 5).map((i) => (
                      <span key={i.id} className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-ink-2 ring-1 ring-line-2">
                        {i.name}
                      </span>
                    ))}
                    {its.length > 5 && <span className="text-xs text-muted">+{its.length - 5}</span>}
                  </div>
                </Link>
                <div className="flex flex-col border-l border-line text-muted">
                  <button className="grid flex-1 place-items-center px-3 transition hover:bg-white/60 hover:text-accent-deep disabled:opacity-30" disabled={idx === 0} onClick={() => move(c, -1)} aria-label="Lên">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button className="grid flex-1 place-items-center px-3 transition hover:bg-white/60 hover:text-accent-deep" onClick={() => setEditing(c)} aria-label="Sửa">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="grid flex-1 place-items-center px-3 transition hover:bg-white/60 hover:text-accent-deep disabled:opacity-30"
                    disabled={idx === visible.length - 1}
                    onClick={() => move(c, 1)}
                    aria-label="Xuống"
                  >
                    <ChevronDown className="h-4 w-4" />
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
          {showHidden ? 'Ẩn các nhóm đã ẩn' : `Hiện ${hiddenCount} nhóm đã ẩn`}
        </button>
      )}

      <CategoryModal
        value={editing}
        onClose={() => setEditing(null)}
        nextColor={CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]}
        nextOrder={categories.length + 1}
      />
    </>
  )
}

function CategoryModal({
  value,
  onClose,
  nextColor,
  nextOrder,
}: {
  value: Category | 'new' | null
  onClose: () => void
  nextColor: string
  nextOrder: number
}) {
  return (
    <Modal open={value !== null} title={value === 'new' ? 'Thêm nhóm' : 'Sửa nhóm'} icon={value === 'new' ? FolderPlus : Pencil} onClose={onClose}>
      {value !== null && (
        <CategoryForm key={value === 'new' ? 'new' : value.id} initial={value === 'new' ? null : value} onDone={onClose} nextColor={nextColor} nextOrder={nextOrder} />
      )}
    </Modal>
  )
}

function CategoryForm({
  initial,
  onDone,
  nextColor,
  nextOrder,
}: {
  initial: Category | null
  onDone: () => void
  nextColor: string
  nextOrder: number
}) {
  const { reload, categories } = useCatalog()
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'tag')
  const [color, setColor] = useState(initial?.color ?? nextColor)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (initial) {
        await supabase
          .from('categories')
          .update({ name: name.trim(), icon: icon.trim() || null, color })
          .eq('id', initial.id)
          .throwOnError()
      } else {
        await supabase
          .from('categories')
          .insert({
            name: name.trim(),
            code: uniqueCode(name, categories.map((c) => c.code), 'nhom'),
            icon: icon.trim() || null,
            color,
            sort_order: nextOrder,
          })
          .throwOnError()
      }
      await reload()
      toast('Đã lưu nhóm')
      onDone()
    } catch (err) {
      const m = errorMessage(err)
      toast(m.includes('duplicate') ? 'Nhóm này đã tồn tại, hãy thử tên khác' : m, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive() {
    if (!initial) return
    try {
      await supabase.from('categories').update({ is_active: !initial.is_active }).eq('id', initial.id).throwOnError()
      await reload()
      toast(initial.is_active ? 'Đã ẩn nhóm' : 'Đã hiện lại nhóm')
      onDone()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-end gap-3">
        <CategoryIcon icon={icon} color={color} size={48} />
        <label className="block flex-1">
          <span className="label">Tên nhóm *</span>
          <input
            className="input"
            required
            maxLength={60}
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="vd. Tiền hàng"
          />
        </label>
      </div>
      <div>
        <span className="label">Màu</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div>
        <span className="label">Icon</span>
        <IconPicker value={icon} color={color} onChange={setIcon} />
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <button className="btn-primary" disabled={busy}>
          <Save className="h-4 w-4" /> Lưu
        </button>
        <button type="button" className="btn-ghost" onClick={onDone}>
          Huỷ
        </button>
        {initial && (
          <button type="button" className="btn-ghost ml-auto" onClick={toggleActive}>
            {initial.is_active ? 'Ẩn nhóm' : 'Hiện lại'}
          </button>
        )}
      </div>
    </form>
  )
}
