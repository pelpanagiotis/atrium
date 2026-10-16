import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

export const TASK_BULK_FORM_ID = "tasks-bulk";

export function TaskBulkActions({ formId = TASK_BULK_FORM_ID }: { formId?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select name="status" form={formId} aria-label="Bulk status" className="w-auto min-w-40">
        <option value="">Keep status</option>
        <option value="done">Mark done</option>
        <option value="open">Reopen</option>
        <option value="blocked">Mark blocked</option>
      </Select>
      <Select name="priority" form={formId} aria-label="Bulk priority" className="w-auto min-w-40">
        <option value="">Keep priority</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="low">Low</option>
      </Select>
      <Button type="submit" form={formId} variant="outline">
        Apply to selected
      </Button>
    </div>
  );
}
