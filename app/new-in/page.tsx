import { redirect } from "next/navigation";

// New In is now the "New Arrivals" collection (like the live site). This old path
// still works and forwards there.
export default function NewInPage() {
  redirect("/collections/new-arrivals");
}
