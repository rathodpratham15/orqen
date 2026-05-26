import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export default function DeleteWorkflowModal({ workflow, open, onOpenChange, onConfirm }) {
  if (!workflow) return null;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#12121A] border-border text-slate-100" data-testid="delete-workflow-modal">
        <AlertDialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            This will permanently delete{" "}
            <span className="font-semibold text-slate-200">{workflow.name}</span>{" "}
            and all of its run history. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border bg-transparent text-slate-300 hover:bg-white/5" data-testid="delete-cancel">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm?.(workflow)}
            className="bg-red-600 hover:bg-red-500 text-white"
            data-testid="delete-confirm"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
