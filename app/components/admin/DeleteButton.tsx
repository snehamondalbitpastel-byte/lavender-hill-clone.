"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

export default function DeleteButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product deleted");
      setOpen(false);
      setBusy(false);
      router.refresh();
    } else {
      toast.error("Delete failed.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[#b23a3a] hover:underline"
      >
        Delete
      </button>
      <ConfirmModal
        open={open}
        title="Delete this product?"
        message="This removes the product and its colour cards from the shop. This can't be undone."
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
