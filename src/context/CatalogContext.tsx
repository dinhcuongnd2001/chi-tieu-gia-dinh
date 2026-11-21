import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Badge, Category, CategoryItem, Member } from '../lib/types'

interface Catalog {
  loading: boolean
  categories: Category[]
  items: CategoryItem[]
  badges: Badge[]
  members: Member[]
  categoryByCode: Map<string, Category>
  itemById: Map<string, CategoryItem>
  badgeById: Map<string, Badge>
  memberNameByUserId: Map<string, string>
  reload: () => Promise<void>
}

const CatalogContext = createContext<Catalog | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<CategoryItem[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [members, setMembers] = useState<Member[]>([])

  const reload = useCallback(async () => {
    const [c, i, b, m] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order').order('name'),
      supabase.from('category_items').select('*').order('sort_order').order('name'),
      supabase.from('badges').select('*').order('sort_order').order('name'),
      supabase.from('members').select('*').order('created_at'),
    ])
    if (c.data) setCategories(c.data as Category[])
    if (i.data) setItems(i.data as CategoryItem[])
    if (b.data) setBadges(b.data as Badge[])
    if (m.data) setMembers(m.data as Member[])
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const value = useMemo<Catalog>(
    () => ({
      loading,
      categories,
      items,
      badges,
      members,
      categoryByCode: new Map(categories.map((c) => [c.code, c])),
      itemById: new Map(items.map((i) => [i.id, i])),
      badgeById: new Map(badges.map((b) => [b.id, b])),
      memberNameByUserId: new Map(
        members.filter((m) => m.user_id).map((m) => [m.user_id as string, m.display_name]),
      ),
      reload,
    }),
    [loading, categories, items, badges, members, reload],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog outside provider')
  return ctx
}
