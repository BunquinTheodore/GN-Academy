import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full max-w-sm rounded-lg lg:w-96" />
      </div>
    </div>
  );
}
