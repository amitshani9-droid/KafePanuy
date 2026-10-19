import { Coffee, Truck } from 'lucide-react'
import type { RankedPlace } from '../lib/rank'
import { formatDistance } from '../lib/geo'
import { describeSource } from '../lib/busyness'
import { StatusTag } from './StatusTag'

interface Props {
  items: RankedPlace[]
  onSelect: (key: string) => void
  limit?: number
}

export function PlaceRow({ item, onSelect }: { item: RankedPlace; onSelect: (key: string) => void }) {
  const { place, status, km } = item
  const Icon = place.kind === 'cart' ? Truck : Coffee
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(place.key)}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-hover active:bg-hover"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-page text-muted">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{place.name}</span>
          <span className="block truncate text-sm text-muted">
            {km != null && <>{formatDistance(km)} · </>}
            {describeSource(status)}
          </span>
        </span>
        <StatusTag status={status} />
      </button>
    </li>
  )
}

export function PlaceList({ items, onSelect, limit }: Props) {
  const shown = limit ? items.slice(0, limit) : items
  return (
    <ul className="divide-y divide-line">
      {shown.map((item) => (
        <PlaceRow key={item.place.key} item={item} onSelect={onSelect} />
      ))}
    </ul>
  )
}
