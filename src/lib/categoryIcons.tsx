import type { IconType } from 'react-icons'
import {
  PiAirplaneDuotone,
  PiBabyDuotone,
  PiBankDuotone,
  PiBarbellDuotone,
  PiBookOpenDuotone,
  PiBriefcaseDuotone,
  PiBusDuotone,
  PiCarDuotone,
  PiChartLineUpDuotone,
  PiCoffeeDuotone,
  PiCoinsDuotone,
  PiCreditCardDuotone,
  PiDeviceMobileDuotone,
  PiDotsThreeOutlineDuotone,
  PiDropDuotone,
  PiFilmStripDuotone,
  PiForkKnifeDuotone,
  PiGameControllerDuotone,
  PiGasPumpDuotone,
  PiGiftDuotone,
  PiGraduationCapDuotone,
  PiHamburgerDuotone,
  PiHandCoinsDuotone,
  PiHeartbeatDuotone,
  PiHouseDuotone,
  PiLightningDuotone,
  PiMoneyDuotone,
  PiMotorcycleDuotone,
  PiMusicNotesDuotone,
  PiPackageDuotone,
  PiPawPrintDuotone,
  PiPiggyBankDuotone,
  PiPillDuotone,
  PiPlantDuotone,
  PiReceiptDuotone,
  PiScissorsDuotone,
  PiShoppingBagDuotone,
  PiShoppingCartDuotone,
  PiSparkleDuotone,
  PiStorefrontDuotone,
  PiTShirtDuotone,
  PiTagDuotone,
  PiTruckDuotone,
  PiUsersDuotone,
  PiWalletDuotone,
  PiWifiHighDuotone,
  PiWrenchDuotone,
} from 'react-icons/pi'

export interface IconDef {
  key: string
  label: string
  Icon: IconType
}

/** Bộ icon cho nhóm chi tiêu (Phosphor Duotone). `key` được lưu vào categories.icon */
export const ICON_GROUPS: { title: string; icons: IconDef[] }[] = [
  {
    title: 'Kinh doanh',
    icons: [
      { key: 'package', label: 'Hàng hoá', Icon: PiPackageDuotone },
      { key: 'truck', label: 'Vận chuyển', Icon: PiTruckDuotone },
      { key: 'storefront', label: 'Cửa hàng', Icon: PiStorefrontDuotone },
      { key: 'cart', label: 'Mua hàng', Icon: PiShoppingCartDuotone },
      { key: 'bag', label: 'Mua sắm', Icon: PiShoppingBagDuotone },
      { key: 'tag', label: 'Nhãn', Icon: PiTagDuotone },
      { key: 'receipt', label: 'Hoá đơn', Icon: PiReceiptDuotone },
      { key: 'briefcase', label: 'Công việc', Icon: PiBriefcaseDuotone },
      { key: 'chart', label: 'Đầu tư', Icon: PiChartLineUpDuotone },
    ],
  },
  {
    title: 'Tiền & thu nhập',
    icons: [
      { key: 'money', label: 'Tiền mặt', Icon: PiMoneyDuotone },
      { key: 'wallet', label: 'Ví', Icon: PiWalletDuotone },
      { key: 'coins', label: 'Tiền xu', Icon: PiCoinsDuotone },
      { key: 'hand-coins', label: 'Thu nhập', Icon: PiHandCoinsDuotone },
      { key: 'piggy-bank', label: 'Tiết kiệm', Icon: PiPiggyBankDuotone },
      { key: 'bank', label: 'Ngân hàng', Icon: PiBankDuotone },
      { key: 'credit-card', label: 'Thẻ', Icon: PiCreditCardDuotone },
    ],
  },
  {
    title: 'Sinh hoạt',
    icons: [
      { key: 'house', label: 'Nhà cửa', Icon: PiHouseDuotone },
      { key: 'fork-knife', label: 'Ăn uống', Icon: PiForkKnifeDuotone },
      { key: 'hamburger', label: 'Đồ ăn', Icon: PiHamburgerDuotone },
      { key: 'coffee', label: 'Cà phê', Icon: PiCoffeeDuotone },
      { key: 'lightning', label: 'Điện', Icon: PiLightningDuotone },
      { key: 'drop', label: 'Nước', Icon: PiDropDuotone },
      { key: 'wifi', label: 'Internet', Icon: PiWifiHighDuotone },
      { key: 'phone', label: 'Điện thoại', Icon: PiDeviceMobileDuotone },
      { key: 't-shirt', label: 'Quần áo', Icon: PiTShirtDuotone },
      { key: 'wrench', label: 'Sửa chữa', Icon: PiWrenchDuotone },
      { key: 'scissors', label: 'Làm đẹp', Icon: PiScissorsDuotone },
    ],
  },
  {
    title: 'Đi lại',
    icons: [
      { key: 'gas-pump', label: 'Xăng', Icon: PiGasPumpDuotone },
      { key: 'motorcycle', label: 'Xe máy', Icon: PiMotorcycleDuotone },
      { key: 'car', label: 'Ô tô', Icon: PiCarDuotone },
      { key: 'bus', label: 'Xe buýt', Icon: PiBusDuotone },
      { key: 'airplane', label: 'Du lịch', Icon: PiAirplaneDuotone },
    ],
  },
  {
    title: 'Gia đình & khác',
    icons: [
      { key: 'users', label: 'Gia đình', Icon: PiUsersDuotone },
      { key: 'baby', label: 'Con nhỏ', Icon: PiBabyDuotone },
      { key: 'graduation', label: 'Học hành', Icon: PiGraduationCapDuotone },
      { key: 'book', label: 'Sách', Icon: PiBookOpenDuotone },
      { key: 'pill', label: 'Thuốc', Icon: PiPillDuotone },
      { key: 'heartbeat', label: 'Sức khoẻ', Icon: PiHeartbeatDuotone },
      { key: 'barbell', label: 'Thể thao', Icon: PiBarbellDuotone },
      { key: 'gift', label: 'Quà tặng', Icon: PiGiftDuotone },
      { key: 'game', label: 'Giải trí', Icon: PiGameControllerDuotone },
      { key: 'film', label: 'Phim', Icon: PiFilmStripDuotone },
      { key: 'music', label: 'Âm nhạc', Icon: PiMusicNotesDuotone },
      { key: 'paw', label: 'Thú cưng', Icon: PiPawPrintDuotone },
      { key: 'plant', label: 'Cây cối', Icon: PiPlantDuotone },
      { key: 'sparkle', label: 'Đặc biệt', Icon: PiSparkleDuotone },
      { key: 'other', label: 'Khác', Icon: PiDotsThreeOutlineDuotone },
    ],
  },
]

const ICON_MAP = new Map(ICON_GROUPS.flatMap((g) => g.icons).map((i) => [i.key, i.Icon]))

/** Icon tròn của nhóm: nền nhạt + icon cùng màu nhóm. Vẫn hiển thị được emoji cũ. */
export function CategoryIcon({
  icon,
  color,
  size = 40,
  className = '',
}: {
  icon: string | null | undefined
  color: string
  size?: number
  className?: string
}) {
  const Icon = icon ? ICON_MAP.get(icon) : undefined
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${className}`}
      style={{ width: size, height: size, background: `${color}1c`, boxShadow: `inset 0 0 0 1.5px ${color}38`, color }}
      aria-hidden
    >
      {Icon ? (
        <Icon style={{ width: size * 0.56, height: size * 0.56 }} />
      ) : icon ? (
        <span style={{ fontSize: size * 0.48, lineHeight: 1 }}>{icon}</span>
      ) : (
        <PiTagDuotone style={{ width: size * 0.56, height: size * 0.56 }} />
      )}
    </span>
  )
}

/** Lưới chọn icon (trong form nhóm) */
export function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (k: string) => void }) {
  return (
    <div className="max-h-64 space-y-3 overflow-y-auto rounded-2xl border border-line-2 bg-white/60 p-3">
      {ICON_GROUPS.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[1px] text-muted">{g.title}</div>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {g.icons.map(({ key, label, Icon }) => {
              const active = value === key
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => onChange(key)}
                  className={`grid aspect-square place-items-center rounded-xl transition ${
                    active ? 'bg-white shadow-[0_0_0_2px_var(--accent),0_4px_12px_rgba(176,132,64,.2)]' : 'hover:bg-white'
                  }`}
                  style={{ color: active ? color : 'var(--ink-2)' }}
                >
                  <Icon className="h-6 w-6" />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
