import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ColorPicker } from '../components/ColorPicker'
import { PageHeader } from '../components/Layout'
import { EmptyState, Modal, useToast } from '../components/ui'
import { useCatalog } from '../context/CatalogContext'
import { errorMessage } from '../lib/api'
import { slugify } from '../lib/format'
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
      <PageHeader title="Danh mục">
        <button className="btn-primary" onClick={() => setEditing('new')}>
          + Thêm nhóm
        </button>
      </PageHeader>
      <p className="mb-4 text-sm text-ink-2">
        Mỗi <b>nhóm</b> (vd. Tiền hàng, Sinh hoạt) gồm nhiều <b>khoản</b> (vd. Nhập hàng, Tiền ship). Mỗi khoản có thể có các{' '}
        <b>badge</b> (vd. TQ, VN) để ghi chi tiết hơn. Bấm vào nhóm để quản lý khoản và badge.
      </p>

      {visible.length === 0 ? (
        <EmptyState>Chưa có nhóm nào. Bấm “Thêm nhóm” để bắt đầu.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((c, idx) => {
            const its = items.filter((i) => i.category_code === c.code && i.is_active)
            const bCount = badges.filter((b) => its.some((i) => i.id === b.item_id) && b.is_active).length
            return (
              <div key={c.id} className={`card flex items-stretch overflow-hidden ${c.is_active ? '' : 'opacity-60'}`}>
                <span className="w-1.5 shrink-0" style={{ background: c.color }} />
                <Link to={`/danh-muc/${c.code}`} className="min-w-0 flex-1 p-4 hover:bg-surface-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="text-lg">{c.icon}</span>
                    <span className="truncate">{c.name}</span>
                    {!c.is_active && <span className="rounded bg-surface-2 px-1.5 text-xs font-normal text-muted">Đã ẩn</span>}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {its.length} khoản · {bCount} badge · mã <code>{c.code}</code>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {its.slice(0, 5).map((i) => (
                      <span key={i.id} className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2">
                        {i.name}
                      </span>
                    ))}
                    {its.length > 5 && <span className="text-xs text-muted">+{its.length - 5}</span>}
                  </div>
                </Link>
                <div className="flex flex-col border-l border-line text-sm">
                  <button className="flex-1 px-3 text-muted hover:bg-surface-2 disabled:opacity-30" disabled={idx === 0} onClick={() => move(c, -1)} aria-label="Lên">
                    ▲
                  </button>
                  <button className="flex-1 px-3 text-muted hover:bg-surface-2" onClick={() => setEditing(c)} aria-label="Sửa">
                    ✎
                  </button>
                  <button
                    className="flex-1 px-3 text-muted hover:bg-surface-2 disabled:opacity-30"
                    disabled={idx === visible.length - 1}
                    onClick={() => move(c, 1)}
                    aria-label="Xuống"
                  >
                    ▼
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hiddenCount > 0 && (
        <button className="mt-4 text-sm text-accent" onClick={() => setShowHidden((v) => !v)}>
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
    <Modal open={value !== null} title={value === 'new' ? 'Thêm nhóm' : 'Sửa nhóm'} onClose={onClose}>
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
  const { reload } = useCatalog()
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [codeTouched, setCodeTouched] = useState(false)
  const [icon, setIcon] = useState(initial?.icon ?? '')
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
          .insert({ name: name.trim(), code, icon: icon.trim() || null, color, sort_order: nextOrder })
          .throwOnError()
      }
      await reload()
      toast('Đã lưu nhóm')
      onDone()
    } catch (err) {
      const m = errorMessage(err)
      toast(m.includes('duplicate') ? 'Mã nhóm đã tồn tại' : m, 'error')
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
      <div className="grid grid-cols-[4.5rem_1fr] gap-3">
        <label className="block">
          <span className="label">Icon</span>
          <input className="input text-center text-xl" value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} placeholder="📦" />
        </label>
        <label className="block">
          <span className="label">Tên nhóm *</span>
          <input
            className="input"
            required
            maxLength={60}
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value)
              if (!initial && !codeTouched) setCode(slugify(e.target.value))
            }}
            placeholder="vd. Tiền hàng"
          />
        </label>
      </div>
      <label className="block">
        <span className="label">Mã (category_code)</span>
        <input
          className="input font-mono text-sm"
          required
          pattern="[a-z0-9_]{2,40}"
          value={code}
          disabled={Boolean(initial)}
          onChange={(e) => {
            setCodeTouched(true)
            setCode(e.target.value.toLowerCase())
          }}
        />
        <span className="mt-1 block text-xs text-muted">
          {initial ? 'Mã không đổi được sau khi tạo.' : 'Chữ thường không dấu, số, dấu gạch dưới. Tự sinh theo tên.'}
        </span>
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
            {initial.is_active ? 'Ẩn nhóm' : 'Hiện lại'}
          </button>
        )}
      </div>
    </form>
  )
}
