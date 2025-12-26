import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-[#E5E5E5] bg-white text-black",
        secondary: "border-[#E5E5E5] bg-[#F5F5F5] text-[#737373]",
        destructive: "border-[#E5E5E5] bg-white text-black",
        outline: "border-[#E5E5E5] text-black",
        success: "border-[#E5E5E5] bg-white text-black",
        warning: "border-[#E5E5E5] bg-white text-black",
        info: "border-black bg-black text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
