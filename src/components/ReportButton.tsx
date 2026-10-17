import { Megaphone } from 'lucide-react'
import { REPORT_POINTS } from '../data/rewards'

interface ReportButtonProps {
  onClick: () => void
  size?: 'sm' | 'lg'
}

export default function ReportButton({ onClick, size = 'sm' }: ReportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-xl font-bold transition active:scale-[0.98] ${
        size === 'lg'
          ? 'bg-espresso py-3 text-base text-white shadow-md shadow-espresso/25 hover:brightness-105'
          : 'bg-espresso/10 py-2 text-sm text-espresso hover:bg-espresso/15'
      }`}
    >
      <Megaphone size={size === 'lg' ? 18 : 15} />
      נמצא בעגלה? דווח מצב (+{REPORT_POINTS} נק׳) ☕
    </button>
  )
}
