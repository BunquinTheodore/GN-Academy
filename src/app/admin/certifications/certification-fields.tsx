import {
  CheckboxField,
  ListField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/field";
import type { Certification } from "@/lib/db/certifications";

/**
 * The certification field set, shared by the create and edit forms so the
 * two can never drift apart.
 */
export function CertificationFields({ cert }: { cert?: Certification }) {
  return (
    <>
      {cert && <input type="hidden" name="id" value={cert.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="title"
          label="Title"
          required
          defaultValue={cert?.title}
          placeholder="Certified AI Virtual Assistant"
        />
        <TextField
          name="slug"
          label="URL slug"
          required
          defaultValue={cert?.slug}
          placeholder="certified-ai-virtual-assistant"
          hint="Appears in the address bar. Changing it breaks existing links."
        />
      </div>

      <TextField
        name="subtitle"
        label="Subtitle"
        defaultValue={cert?.subtitle}
        placeholder="Run client operations with AI, and prove it"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          name="level"
          label="Level"
          defaultValue={cert?.level}
          options={[
            { value: "foundation", label: "Foundation" },
            { value: "professional", label: "Professional" },
            { value: "advanced", label: "Advanced" },
          ]}
        />
        <TextField
          name="category"
          label="Category"
          defaultValue={cert?.category}
          placeholder="Virtual assistance"
        />
        <TextField
          name="format"
          label="Format"
          defaultValue={cert?.format}
          placeholder="Self-paced online"
        />
      </div>

      <TextAreaField
        name="summary"
        label="Summary"
        rows={3}
        defaultValue={cert?.summary}
        hint="One or two sentences. Shown on the catalogue card and in search results."
      />

      <TextAreaField
        name="description"
        label="Full description"
        rows={8}
        defaultValue={cert?.description}
        hint="The main body of the product page. Plain text."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <ListField name="skills" label="Skills" defaultValue={cert?.skills} />
        <ListField
          name="outcomes"
          label="Outcomes"
          defaultValue={cert?.outcomes}
          hint="One per line. What the learner can do afterwards."
        />
        <ListField name="roles" label="Roles" defaultValue={cert?.roles} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="price_php"
          label="Price (PHP)"
          type="number"
          defaultValue={cert?.price_php}
          hint="Leave blank for free courses."
        />
        <TextField
          name="credential_prefix"
          label="Credential prefix"
          required
          defaultValue={cert?.credential_prefix}
          placeholder="CAVA"
          hint="Letters only. Becomes CAVA-2026-000001. Never change it once credentials exist."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="passing_score"
          label="Passing score"
          type="number"
          defaultValue={cert?.passing_score ?? 70}
        />
        <TextField
          name="sort_order"
          label="Sort order"
          type="number"
          defaultValue={cert?.sort_order ?? 0}
          hint="Lower numbers come first in the catalogue."
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <CheckboxField
          name="is_free"
          label="Free course"
          defaultChecked={cert?.is_free}
          hint="Free enrollments activate instantly; paid ones wait for payment confirmation."
        />
        <CheckboxField
          name="is_published"
          label="Published"
          defaultChecked={cert?.is_published}
          hint="Unpublished certifications are invisible on the public site."
        />
      </div>
    </>
  );
}
