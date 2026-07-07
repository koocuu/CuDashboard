import type { WorkStatus } from "@/lib/db/schema";

export const STATUS_META: Record<
  WorkStatus,
  { label: string; dot: string; badge: string; group: string; chip: string }
> = {
  inbox: {
    label: "收件",
    dot: "bg-muted-foreground",
    badge: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    group: "收件",
  },
  in_progress: {
    label: "进行中",
    dot: "bg-positive",
    badge: "text-positive",
    chip: "bg-[#EAF1EB] text-positive",
    group: "进行中",
  },
  waiting: {
    label: "等待外部",
    dot: "bg-mist",
    badge: "text-mist",
    chip: "bg-[#EEF3FA] text-[#6F89AD]",
    group: "等待外部",
  },
  scheduled: {
    label: "排期",
    dot: "bg-mist",
    badge: "text-mist",
    chip: "bg-[#EEF3FA] text-[#6F89AD]",
    group: "排期",
  },
  someday: {
    label: "想做未做",
    dot: "bg-muted-foreground",
    badge: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    group: "想做未做",
  },
  done: {
    label: "完成",
    dot: "bg-positive",
    badge: "text-positive",
    chip: "bg-[#EAF1EB] text-positive",
    group: "已完成",
  },
  archived: {
    label: "归档",
    dot: "bg-muted-foreground/60",
    badge: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    group: "已完成",
  },
};

export const ACTIVE_GROUP_ORDER: WorkStatus[] = [
  "in_progress",
  "inbox",
  "scheduled",
  "waiting",
  "someday",
];

export const NEXT_STATUS: Record<WorkStatus, WorkStatus> = {
  inbox: "in_progress",
  in_progress: "scheduled",
  scheduled: "waiting",
  waiting: "someday",
  someday: "done",
  done: "archived",
  archived: "inbox",
};
