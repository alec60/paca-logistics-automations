// Phase 3 wires this to the row "Blacklist" action. Phase 1 stub.
export interface BlacklistDialogProps {
  open: boolean;
  company: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export function BlacklistDialog(_props: BlacklistDialogProps) {
  return null;
}
