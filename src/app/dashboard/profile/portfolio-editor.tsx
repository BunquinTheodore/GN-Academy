import { AdminForm } from "@/components/admin/admin-form";
import { TextAreaField, TextField } from "@/components/admin/field";
import { ImageUpload } from "@/components/image-upload";
import { PORTFOLIO_BUCKET, publicStorageUrl } from "@/lib/storage";
import type { PortfolioItem } from "@/lib/db/talent";
import {
  deletePortfolioItemAction,
  savePortfolioItemAction,
} from "./actions";

function PortfolioFields({
  item,
  defaultSortOrder = 0,
}: {
  item?: PortfolioItem;
  defaultSortOrder?: number;
}) {
  return (
    <>
      <TextField
        name="title"
        label="Title"
        required
        defaultValue={item?.title}
        placeholder="Weekly reporting pipeline for a Shopify store"
      />
      <TextAreaField
        name="description"
        label="What you did"
        rows={4}
        defaultValue={item?.description}
        hint="The problem, what you built, and the result. Numbers if you have them."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="project_url"
          label="Link"
          type="url"
          defaultValue={item?.project_url}
          hint="Optional."
        />
        <TextField
          name="sort_order"
          label="Order"
          type="number"
          defaultValue={item?.sort_order ?? defaultSortOrder}
        />
      </div>
      <ImageUpload
        bucket={PORTFOLIO_BUCKET}
        name="image_path"
        label="Screenshot"
        maxWidthOrHeight={1400}
        defaultUrl={
          item?.image_path
            ? publicStorageUrl(PORTFOLIO_BUCKET, item.image_path)
            : null
        }
      />
    </>
  );
}

export function PortfolioEditor({
  items,
  nextSortOrder,
}: {
  items: PortfolioItem[];
  nextSortOrder: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <details key={item.id} className="rounded-lg border border-border bg-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-4">
            <span className="font-medium">{item.title}</span>
            <span className="text-xs text-muted-foreground">
              #{item.sort_order}
            </span>
          </summary>
          <div className="flex flex-col gap-6 border-t border-border p-4">
            <AdminForm action={savePortfolioItemAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <PortfolioFields item={item} />
            </AdminForm>

            <div className="border-t border-border pt-4">
              <AdminForm
                action={deletePortfolioItemAction}
                submitLabel="Remove this item"
                destructive
              >
                <input type="hidden" name="itemId" value={item.id} />
                <p className="text-xs text-muted-foreground">
                  Removes it from your public profile. The uploaded image stays
                  in your storage folder.
                </p>
              </AdminForm>
            </div>
          </div>
        </details>
      ))}

      <details className="rounded-lg border border-dashed border-border">
        <summary className="min-h-11 cursor-pointer list-none p-4 text-sm text-muted-foreground">
          + Add a piece of work
        </summary>
        <div className="border-t border-border p-4">
          <AdminForm action={savePortfolioItemAction} submitLabel="Add">
            <PortfolioFields defaultSortOrder={nextSortOrder} />
          </AdminForm>
        </div>
      </details>
    </div>
  );
}
