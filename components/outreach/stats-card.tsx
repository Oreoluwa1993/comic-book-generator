import { cn } from "@/lib/utils"

type StatsCardProps = {
  label: string
  value: number | string
  sub?: string
  className?: string
}

export const StatsCard = ({ label, value, sub, className }: StatsCardProps) => (
  <div className={cn("rounded-2xl border bg-card p-5 shadow-sm", className)}>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
    {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
  </div>
)
