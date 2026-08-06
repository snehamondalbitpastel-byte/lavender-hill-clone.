"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

export default function CustomerDeleteButton({
  id,
  email,
  compact = false,
}: {
  id: number;
  email: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Customer deleted");
      router.push("/admin/customers");
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
        className={
          compact
            ? "text-xs text-[#b23a3a] hover:underline"
            : "text-xs text-[#b23a3a] border border-[#b23a3a]/30 rounded-md px-3 py-1.5 hover:bg-[#b23a3a]/5"
        }
      >
        {compact ? "Delete" : "Delete customer"}
      </button>
      <ConfirmModal
        open={open}
        title="Delete this customer?"
        message="This permanently removes their account. This can't be undone."
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
