export const APPLICATION_RECORD_STATUSES = [
  "drafting",
  "resume_generated",
  "ready_to_apply",
  "applied",
  "rejected",
  "archived",
] as const;

export type ApplicationRecordStatus = (typeof APPLICATION_RECORD_STATUSES)[number];

export type ApplicationRecordInput = {
  jobDescriptionId?: string;
  companyName?: string;
  roleTitle?: string;
  jobUrl?: string;
  status?: ApplicationRecordStatus;
  notes?: string;
};

export type StoredApplicationRecord = {
  id: string;
  jobDescriptionId?: string;
  companyName?: string;
  roleTitle?: string;
  jobUrl?: string;
  status: ApplicationRecordStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
};

export function isApplicationRecordStatus(value: string): value is ApplicationRecordStatus {
  return (APPLICATION_RECORD_STATUSES as readonly string[]).includes(value);
}

export function normalizeApplicationRecordStatus(
  value: string | null | undefined,
): ApplicationRecordStatus {
  if (value && isApplicationRecordStatus(value)) {
    return value;
  }
  return "drafting";
}
