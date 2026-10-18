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
      className={`flex w-full items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-150 active:scale-[0.97] ${
        size === 'lg'
          ? 'bg-gradient-to-r from-espresso to-espresso-dark py-3.5 text-base text-white shadow-md shadow-espresso/25 hover:brightness-105 ring-1 ring-espresso/30'
          : 'bg-espresso/12 py-2.5 text-xs text-espresso hover:bg-espresso/20 ring-1 ring-espresso/20'
      }`}
    >
      <Megaphone size={size === 'lg' ? 18 : 14} className="shrink-0 animate-bounce" />
      <span>נמצא בעגלה? דווח (+{REPORT_POINTS} נק׳) ☕</span>
    </button>
  )
}
