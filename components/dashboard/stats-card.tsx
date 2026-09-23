import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Users,
  BookOpen,
  CreditCard,
  TrendingUp,
  Activity,
  Award,
  DollarSign,
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react"

const defaultIconMap: Record<string, LucideIcon> = {
  Users,
  BookOpen,
  CreditCard,
  TrendingUp,
  Activity,
  Award,
  DollarSign,
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
}

export interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: string | LucideIcon
  trend?: {
    value: number
    isPositive?: boolean
    label?: string
  }
  loading?: boolean
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  loading = false,
  className,
}: StatsCardProps) {
  let IconComponent: LucideIcon | null = null
  if (typeof icon === "string") {
    IconComponent = defaultIconMap[icon] || Activity
  } else if (icon) {
    IconComponent = icon
  }

  if (loading) {
    return (
      <Card className={cn("overflow-hidden animate-pulse", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-8 w-8 bg-muted rounded-lg" />
        </CardHeader>
        <CardContent>
          <div className="h-7 w-20 bg-muted rounded mb-2" />
          <div className="h-3 w-32 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {IconComponent && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <IconComponent className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            {trend && (
              <span
                className={cn(
                  "font-bold inline-flex items-center",
                  trend.isPositive !== false ? "text-success" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.isPositive !== false ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
            )}
            {trend?.label && <span>{trend.label}</span>}
            {description && !trend?.label && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
