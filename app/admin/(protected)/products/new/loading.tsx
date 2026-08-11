import { ProductFormSkeleton } from "@/app/components/admin/AdminSkeletons";

// Add-product page is a big two-column form; show a matching form skeleton
// (overrides the generic list skeleton) while it opens.
export default function Loading() {
  return <ProductFormSkeleton />;
}
