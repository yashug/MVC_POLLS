import { notFound } from "next/navigation";
import { AdminSlots, type AdminSlotView } from "@/components/AdminSlots";
import { getActiveEvent, getItemBySlug } from "@/lib/items";
import { getSlotEntries, getSlots, slotLabel } from "@/lib/slots";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminSlotsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;

  const event = await getActiveEvent();
  const item = await getItemBySlug(event.id, slug);
  if (!item || !item.collectsSlot) notFound();

  const slotRows = await getSlots(item.id);
  const entries = await getSlotEntries(item.id);
  const labelOf = new Map(slotRows.map((s) => [s.id, slotLabel(s, "en")]));

  const views: AdminSlotView[] = slotRows.map((s) => ({
    id: s.id,
    label: slotLabel(s, "en"),
    capacity: s.capacity,
    adultsCount: s.adultsCount,
    kidsCount: s.kidsCount,
    isLocked: s.isLocked,
    lockNote: s.lockNoteEn,
    requested: entries
      .filter((e) => e.requestedSlotId === s.id)
      .map((e) => ({ entryId: e.id, villaNos: e.villaNos })),
    assigned: entries
      .filter((e) => e.assignedSlotId === s.id)
      .map((e) => ({
        entryId: e.id,
        villaNos: e.villaNos,
        amount: e.amountPledged,
        family: e.familyName,
      })),
  }));

  const unassigned = entries
    .filter((e) => e.assignedSlotId == null)
    .map((e) => ({
      entryId: e.id,
      villaNos: e.villaNos,
      requestedLabel: e.requestedSlotId ? (labelOf.get(e.requestedSlotId) ?? null) : null,
      amount: e.amountPledged,
    }));

  return (
    <AdminSlots
      itemId={item.id}
      itemTitle={item.titleEn}
      slug={item.slug}
      slots={views}
      unassigned={unassigned}
      showCapacity={item.maxEntriesPerVilla === 1}
      showAmounts={item.allowPartial}
      allocated={entries.some((e) => e.assignedSlotId != null)}
    />
  );
}
