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

export type FulfillmentRequest = {
  id: string;
  code: string;
  title: string;
  status: string;
  actorName: string;
  activityTitle: string;
  roomCode?: string;
  roomName: string;
  startAt: string;
  endAt: string;
  purpose: string;
  overdue: boolean;
  equipment: FulfillmentEquipment[];
  materials: FulfillmentMaterial[];
};
