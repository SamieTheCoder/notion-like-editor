import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeletons'

export default function Loading() {
  return (
    <main className="min-h-[100dvh] bg-background">
      <DashboardSkeleton />
    </main>
  )
}
