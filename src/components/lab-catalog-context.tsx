"use client";

import { createContext, useContext } from "react";
import type { LabCatalog } from "@/components/schedule-data";

const emptyCatalog: LabCatalog = { rooms: [], equipment: [], materials: [] };

const LabCatalogContext = createContext<LabCatalog>(emptyCatalog);

export function LabCatalogProvider({
  value,
  children,
}: {
  value: LabCatalog;
  children: React.ReactNode;
}) {
  return (
    <LabCatalogContext.Provider value={value}>
      {children}
    </LabCatalogContext.Provider>
  );
}

export function useLabCatalog() {
  return useContext(LabCatalogContext);
}
