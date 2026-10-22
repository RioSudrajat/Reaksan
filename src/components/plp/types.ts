export type FulfillmentEquipment = {
  id?: string;
  unitId?: string;
  unitCode: string;
  unitLabel: string;
  assetName: string;
  usageType: "BORROWABLE" | "USAGE_ONLY";
  imageMediaId?: string | null;
};

export type FulfillmentMaterial = {
  name: string;
  quantity: number;
  unit: string;
  imageMediaId?: string | null;
};

export type ReturnSubmissionData = {
  condition: "GOOD" | "MINOR_ISSUE" | "DAMAGED" | "UNKNOWN";
  notes?: string;
  unitConditions?: Array<{
    unitId?: string;
    unitCode: string;
    unitName?: string;
    condition: "GOOD" | "MINOR_ISSUE" | "DAMAGED" | "UNKNOWN";
    notes?: string;
  }>;
  incident?: {
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    equipmentCode?: string;
  };
  incidents?: Array<{
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    equipmentCode?: string;
  }>;
  waste?: {
    containerId: string;
    chemicalDescription: string;
    quantity: number;
    unit: string;
    notes?: string;
  };
  wastes?: Array<{
    containerId: string;
    chemicalDescription: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
};

export type FulfillmentRequest = {
  id: string;
  code: string;
  title: string;
  status: string;
  actorName: string;
  activityTitle: string;
  roomId?: string;
  roomCode?: string;
  roomName: string;
  startAt: string;
  endAt: string;
  purpose: string;
  overdue: boolean;
  issuedAt?: string | null;
  returnedAt?: string | null;
  returnSubmission?: ReturnSubmissionData | null;
  returnSubmittedAt?: string | null;
  returnConfirmedAt?: string | null;
  returnRejectionReason?: string | null;
  equipment: FulfillmentEquipment[];
  materials: FulfillmentMaterial[];
};
