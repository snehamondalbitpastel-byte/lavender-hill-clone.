import { redirect } from "next/navigation";

// Shop is now the "All Products" collection (like the live site). This old path
// still works and forwards there, so any existing links keep functioning.
export default function ShopPage() {
  redirect("/collections/view-all-products");
}
