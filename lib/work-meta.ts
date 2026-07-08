import type { WorkStatus } from "@/lib/db/schema";

export const STATUS_META: Record<
  WorkStatus,
  { label: string; dot: string; badge: string; group: string; chip: string }
> = {
  someday: {
    label: "想做未做",
    dot: "bg-muted-foreground",
    badge: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    group: "想做未做",
  },
  scheduled: {
    label: "排期待做",
    dot: "bg-mist",
    badge: "text-mist",
    chip: "bg-[#EEF3FA] text-[#6F89AD]",
    group: "排期待做",
  },
  in_progress: {
    label: "进行中",
    dot: "bg-positive",
    badge: "text-positive",
    chip: "bg-[#EAF1EB] text-positive",
    group: "进行中",
  },
  done: {
    label: "已完成",
    dot: "bg-positive",
    badge: "text-positive",
    chip: "bg-[#EAF1EB] text-positive",
    group: "已完成",
  },
};

export const ACTIVE_GROUP_ORDER: WorkStatus[] = [
  "in_progress",
  "scheduled",
  "someday",
];

export const STATUS_OPTIONS = [
  "someday",
  "scheduled",
  "in_progress",
  "done",
] satisfies WorkStatus[];

export const NEXT_STATUS_BY_DOT: Record<WorkStatus, WorkStatus> = {
  someday: "scheduled",
  scheduled: "in_progress",
  in_progress: "done",
  done: "in_progress",
};
