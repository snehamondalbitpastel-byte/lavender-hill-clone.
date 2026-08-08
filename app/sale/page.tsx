import { redirect } from "next/navigation";

// Sale is now the "Sale" collection (like the live site). This old path still
// works and forwards there.
export default function SalePage() {
  redirect("/collections/sale");
}
