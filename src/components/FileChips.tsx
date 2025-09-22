import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FileChipsProps {
  files: string[];
  onRemove?: (filename: string) => void;
  readOnly?: boolean;
}

export function FileChips({ files, onRemove, readOnly = false }: FileChipsProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((filename) => (
        <Badge
          key={filename}
          variant="secondary"
          className="flex items-center gap-1 px-3 py-1 text-sm"
        >
          <span className="truncate max-w-[200px]" title={filename}>
            {filename}
          </span>
          {!readOnly && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => onRemove(filename)}
              aria-label={`Remove ${filename}`}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Badge>
      ))}
    </div>
  );
}