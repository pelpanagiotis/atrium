import { Button } from "@/components/ui/button";
import { MenuSelect } from "@/components/ui/menu-select";

export const TASK_BULK_FORM_ID = "tasks-bulk";

export function TaskBulkActions({ formId = TASK_BULK_FORM_ID }: { formId?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MenuSelect
        name="status"
        form={formId}
        defaultValue=""
        aria-label="Bulk status"
        className="w-auto min-w-40"
        options={[
          { value: "", label: "Keep status" },
          { value: "done", label: "Mark done" },
          { value: "open", label: "Reopen" },
          { value: "blocked", label: "Mark blocked" },
        ]}
      />
      <MenuSelect
        name="priority"
        form={formId}
        defaultValue=""
        aria-label="Bulk priority"
        className="w-auto min-w-40"
        options={[
          { value: "", label: "Keep priority" },
          { value: "urgent", label: "Urgent" },
          { value: "high", label: "High" },
          { value: "low", label: "Low" },
        ]}
      />
      <Button type="submit" form={formId} variant="outline">
        Apply to selected
      </Button>
    </div>
  );
}
