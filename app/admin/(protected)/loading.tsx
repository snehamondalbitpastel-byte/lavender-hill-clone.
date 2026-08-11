import { AdminListSkeleton } from "@/app/components/admin/AdminSkeletons";

// Instant fallback shown (inside the persistent admin shell) while ANY admin
// page that lacks its own loading.tsx compiles + fetches. Covers the list-style
// pages (orders, products, collections, customers, reviews, discounts, …).
export default function Loading() {
  return <AdminListSkeleton />;
}
