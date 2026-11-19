import { Ellipsis } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@sdkwork/ui-pc-react";

export interface CategoryItemActionsMenuLabels {
  more: string;
  addChild: string;
  edit: string;
  moveUp: string;
  moveDown: string;
  activate: string;
  deactivate: string;
  delete: string;
}

/**
 * One compact trigger for every per-category action.
 *
 * The previous row rendered six icon buttons, which consumed the entire node
 * width and truncated the category name. A dropdown keeps the name readable
 * while preserving all actions (including keyboard access via the menu).
 */
export function CategoryItemActionsMenu({
  canAddChild,
  inactive,
  labels,
  onAddChild,
  onDelete,
  onEdit,
  onMoveDown,
  onMoveUp,
  onToggleStatus,
}: {
  canAddChild: boolean;
  inactive: boolean;
  labels: CategoryItemActionsMenuLabels;
  onAddChild: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={labels.more}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Ellipsis className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canAddChild ? (
          <DropdownMenuItem onSelect={onAddChild}>
            {labels.addChild}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={onEdit}>{labels.edit}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onMoveUp}>{labels.moveUp}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onMoveDown}>{labels.moveDown}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onToggleStatus}>
          {inactive ? labels.activate : labels.deactivate}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[var(--sdk-color-state-danger)] focus:text-[var(--sdk-color-state-danger)]"
          onSelect={onDelete}
        >
          {labels.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
