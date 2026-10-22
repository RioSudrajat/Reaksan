"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  Edit2,
  Lock,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import QRCode from "qrcode";
import { exportWasteLogsToPdf } from "@/lib/waste-pdf";

export type WasteContainerItem = {
  id: string;
  code: string;
  name: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  categoryHazardBadge?: string | null;
  categoryColorHex?: string | null;
  maxCapacity: string;
  currentVolume: string;
  unit: string;
  status: "ACTIVE" | "FULL" | "SEALED" | "IN_TPS" | "DISPOSED" | "ARCHIVED";
  active: boolean;
  qrCode?: string | null;
  locationNotes?: string | null;
  openedAt: string | Date;
  closedAt?: string | Date | null;
  tpsMovedAt?: string | Date | null;
  disposedAt?: string | Date | null;
  manifestId?: string | null;
  manifestCode?: string | null;
  manifestNumber?: string | null;
  transporterName?: string | null;
  percentage: number;
  ageDays: number;
  isRetentionWarning: boolean;
  isCapacityWarning: boolean;
};

export type WasteCategoryItem = {
  id: string;
  code: string;
  name: string;
  physicalState: "LIQUID" | "SOLID";
  hazardBadge?: string | null;
  colorHex?: string | null;
};

export type WasteLogItem = {
  id: string;
  code: string;
  disposedAt: string | Date;
  quantity: string;
  unit: string;
  chemicalDescription: string;
  notes?: string | null;
  status: "LOGGED" | "VERIFIED" | "REJECTED";
  studentName: string;
  studentUsername?: string | null;
  containerName: string;
  containerCode: string;
  roomName: string;
  categoryName: string;
  requestCode?: string | null;
};

export type WasteSummaryData = {
  label: string;
  from: string | Date;
  to: string | Date;
  totalLogs: number;
  totalVolumeL: number;
  totalVolumeKg: number;
  byCategory: { name: string; badge: string | null; volumeL: number; count: number }[];
};

export type WasteManifestItem = {
  id: string;
  code: string;
  manifestNumber: string;
  transporterName: string;
  driverName?: string | null;
  vehiclePlate?: string | null;
  picStaffId: string;
  picStaffName?: string | null;
  handedOverAt: string | Date;
  notes?: string | null;
  totalContainers: string;
  totalVolumeL: string;
  totalVolumeKg: string;
  createdAt: string | Date;
};

export type RoomOption = {
  id: string;
  code: string;
  name: string;
};

export function WasteManagementClient({
  initialContainers,
  initialCategories,
  initialLogs,
  initialSummary,
  initialManifests = [],
  rooms,
}: {
  initialContainers: WasteContainerItem[];
  initialCategories: WasteCategoryItem[];
  initialLogs: WasteLogItem[];
  initialSummary: WasteSummaryData;
  initialManifests?: WasteManifestItem[];
  rooms: RoomOption[];
}) {
  const router = useRouter();

  // Primary active tab
  const [activeTab, setActiveTab] = useState<"containers" | "tps" | "logs">("containers");

  // Filters
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Period filters for logs (reactive)
  const [periodType, setPeriodType] = useState<"monthly" | "semester" | "quarterly" | "custom">("monthly");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedSemester, setSelectedSemester] = useState<"ganjil" | "genap">("ganjil");
  const [selectedQuarter, setSelectedQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">("Q4");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Reactive state for logs & summary
  const [logs, setLogs] = useState<WasteLogItem[]>(initialLogs);
  const [summary, setSummary] = useState<WasteSummaryData>(initialSummary);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Multi-selection states
  const [selectedSealedIds, setSelectedSealedIds] = useState<string[]>([]);
  const [selectedTpsIds, setSelectedTpsIds] = useState<string[]>([]);
  const [selectedPendingLogIds, setSelectedPendingLogIds] = useState<string[]>([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContainer, setEditingContainer] = useState<WasteContainerItem | null>(null);

  // Rollover / Seal Modal
  const [sealModalContainer, setSealModalContainer] = useState<WasteContainerItem | null>(null);
  const [sealRolloverCheck, setSealRolloverCheck] = useState(true);
  const [sealNewName, setSealNewName] = useState("");

  // Move to TPS Modal
  const [showMoveTpsModal, setShowMoveTpsModal] = useState(false);
  const [moveTpsNotes, setMoveTpsNotes] = useState("");

  // Manifest Handover Modal
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [manifestFormData, setManifestFormData] = useState({
    manifestNumber: "",
    transporterName: "",
    driverName: "",
    vehiclePlate: "",
    notes: "",
  });

  // QR Sticker Modal
  const [qrModalData, setQrModalData] = useState<{
    code: string;
    name: string;
    category: string;
    hazardBadge?: string | null;
    room: string;
    openedAt: string;
    retentionDeadline: string;
    closedAt?: string | null;
    currentVolume: string;
    maxCapacity: string;
    unit: string;
    dataUrl: string;
  } | null>(null);

  // Individual Verify Log Modal
  const [verifyLogModal, setVerifyLogModal] = useState<WasteLogItem | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [adjustedQty, setAdjustedQty] = useState<string>("");
  const [verifyNotes, setVerifyNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default Category for new form
  const cairCategory =
    initialCategories.find((c) => c.code === "CAIR") ||
    initialCategories.find((c) => c.physicalState === "LIQUID");

  // Form states for Create / Edit Container
  const [formData, setFormData] = useState({
    name: "",
    roomId: rooms[0]?.id || "",
    categoryId: cairCategory?.id || initialCategories[0]?.id || "",
    maxCapacity: 20,
    unit: "L",
    locationNotes: "",
  });

  // Re-fetch logs reactively when period or room filter changes in tab "logs"
  useEffect(() => {
    let cancelled = false;
    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const params = new URLSearchParams();
        if (selectedRoom !== "ALL") {
          const roomObj = rooms.find((r) => r.id === selectedRoom);
          if (roomObj) params.set("room", roomObj.code);
        }
        params.set("period", periodType);
        if (periodType === "monthly") params.set("month", selectedMonth);
        if (periodType === "semester") params.set("semester", selectedSemester);
        if (periodType === "quarterly") params.set("quarter", selectedQuarter);
        if (periodType === "custom" && customFrom && customTo) {
          params.set("from", customFrom);
          params.set("to", customTo);
        }

        const res = await fetch(`/api/plp/waste/logs?${params.toString()}`);
        if (!res.ok) throw new Error("Gagal mengambil logbook");
        const json = await res.json();
        if (!cancelled && json.data) {
          setLogs(json.data);
          if (json.summary) setSummary(json.summary);
          setSelectedPendingLogIds([]);
        }
      } catch (err) {
        console.error("Error fetching waste logs:", err);
      } finally {
        if (!cancelled) setLoadingLogs(false);
      }
    };

    fetchLogs();
    return () => {
      cancelled = true;
    };
  }, [
    periodType,
    selectedMonth,
    selectedSemester,
    selectedQuarter,
    customFrom,
    customTo,
    selectedRoom,
    rooms,
  ]);

  // Containers partitioning
  // Tab 1 (Lab Floor): ACTIVE and FULL
  const labFloorContainers = initialContainers.filter(
    (c) => c.status === "ACTIVE" || c.status === "FULL",
  );

  // Tab 2 (TPS & Handover): SEALED, IN_TPS
  const sealedContainers = initialContainers.filter((c) => c.status === "SEALED");
  const inTpsContainers = initialContainers.filter((c) => c.status === "IN_TPS");

  // Filtering for Tab 1
  const filteredLabContainers = labFloorContainers.filter((c) => {
    if (selectedRoom !== "ALL" && c.roomId !== selectedRoom) return false;
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.categoryName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtering for Tab 3 (Logs)
  const filteredLogs = logs.filter((l) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.chemicalDescription.toLowerCase().includes(q) ||
        l.studentName.toLowerCase().includes(q) ||
        l.containerName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Pending logs list
  const pendingLogs = filteredLogs.filter((l) => l.status === "LOGGED");

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: "",
      roomId: rooms[0]?.id || "",
      categoryId: cairCategory?.id || initialCategories[0]?.id || "",
      maxCapacity: 20,
      unit: "L",
      locationNotes: "",
    });
    setEditingContainer(null);
    setErrorMessage(null);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (container: WasteContainerItem) => {
    setEditingContainer(container);
    setFormData({
      name: container.name,
      roomId: container.roomId,
      categoryId: container.categoryId,
      maxCapacity: Number(container.maxCapacity),
      unit: container.unit,
      locationNotes: container.locationNotes || "",
    });
    setErrorMessage(null);
    setShowCreateModal(true);
  };

  // Submit Create / Edit Container
  const handleSubmitContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingContainer) {
        const res = await fetch(`/api/plp/waste/containers/${editingContainer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            categoryId: formData.categoryId,
            maxCapacity: formData.maxCapacity,
            unit: formData.unit,
            locationNotes: formData.locationNotes,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || err.message || "Gagal memperbarui wadah.");
        }
      } else {
        const res = await fetch("/api/plp/waste/containers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || err.message || "Gagal membuat wadah baru.");
        }
      }

      setShowCreateModal(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Seal / Rollover Modal
  const handleOpenSealModal = (container: WasteContainerItem) => {
    setSealModalContainer(container);
    setSealRolloverCheck(true);
    let baseName = container.name;
    const match = baseName.match(/^(.*?)\s*#(\d+)$/);
    let nextNum = 2;
    if (match) {
      baseName = match[1];
      nextNum = parseInt(match[2], 10) + 1;
    }
    setSealNewName(`${baseName} #${nextNum}`);
    setErrorMessage(null);
  };

  // Submit Seal / Rollover
  const handleConfirmSeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sealModalContainer) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/plp/waste/containers/${sealModalContainer.id}/seal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createNew: sealRolloverCheck,
          newName: sealRolloverCheck ? sealNewName : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.message || "Gagal menyegel jerigen.");
      }

      setSealModalContainer(null);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / Archive Container
  const handleDeleteContainer = async (container: WasteContainerItem) => {
    if (
      !confirm(
        `Hapus/Arsipkan wadah ${container.code}? Jika wadah belum pernah ada transaksi limbah, wadah akan dihapus permanen. Jika sudah memiliki riwayat log, sistem akan mengarsipkannya.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/plp/waste/containers/${container.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error?.message || err.message || "Gagal menghapus wadah.");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Move Selected Containers to TPS
  const handleMoveToTps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSealedIds.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/plp/waste/containers/move-tps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containerIds: selectedSealedIds,
          notes: moveTpsNotes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.message || "Gagal memindahkan wadah ke TPS.");
      }

      setSelectedSealedIds([]);
      setShowMoveTpsModal(false);
      setMoveTpsNotes("");
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Manifest Handover
  const handleSubmitManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTpsIds.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/plp/waste/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifestNumber: manifestFormData.manifestNumber,
          transporterName: manifestFormData.transporterName,
          driverName: manifestFormData.driverName || undefined,
          vehiclePlate: manifestFormData.vehiclePlate || undefined,
          notes: manifestFormData.notes || undefined,
          containerIds: selectedTpsIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.message || "Gagal membuat manifest serah terima.");
      }

      setSelectedTpsIds([]);
      setShowManifestModal(false);
      setManifestFormData({
        manifestNumber: "",
        transporterName: "",
        driverName: "",
        vehiclePlate: "",
        notes: "",
      });
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show Enhanced GHS QR Sticker Modal
  const handleShowQr = async (container: WasteContainerItem) => {
    try {
      const qrData = container.qrCode || `reaksan://waste-container/${container.code}`;
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 320,
        margin: 1,
        color: { dark: "#09090b", light: "#ffffff" },
      });

      const opened = new Date(container.openedAt);
      const retentionDead = new Date(opened.getTime() + 90 * 24 * 60 * 60 * 1000);

      setQrModalData({
        code: container.code,
        name: container.name,
        category: container.categoryName,
        hazardBadge: container.categoryHazardBadge,
        room: container.roomName,
        openedAt: opened.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        retentionDeadline: retentionDead.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        closedAt: container.closedAt
          ? new Date(container.closedAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : null,
        currentVolume: container.currentVolume,
        maxCapacity: container.maxCapacity,
        unit: container.unit,
        dataUrl,
      });
    } catch (err) {
      console.error("Gagal generate QR Code", err);
    }
  };

  // Individual Verify Modal
  const handleOpenVerifyLog = (log: WasteLogItem) => {
    setVerifyLogModal(log);
    setVerifyStatus("VERIFIED");
    setAdjustedQty(log.quantity);
    setVerifyNotes("");
  };

  const handleSubmitVerifyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyLogModal) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/plp/waste/logs/${verifyLogModal.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: verifyStatus,
          quantity: adjustedQty ? Number(adjustedQty) : undefined,
          notes: verifyNotes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.message || "Gagal verifikasi log limbah.");
      }

      setVerifyLogModal(null);
      // Refresh current active logs view
      setLogs((prev) =>
        prev.map((l) =>
          l.id === verifyLogModal.id
            ? { ...l, status: verifyStatus, quantity: adjustedQty || l.quantity }
            : l,
        ),
      );
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Verify Pending Logs
  const handleBatchVerify = async (status: "VERIFIED" | "REJECTED") => {
    if (selectedPendingLogIds.length === 0) return;
    const confirmMsg =
      status === "VERIFIED"
        ? `Setujui sekaligus ${selectedPendingLogIds.length} transaksi limbah yang dipilih?`
        : `Tolak ${selectedPendingLogIds.length} transaksi limbah terpilih? Volume akan dikembalikan ke wadah.`;

    if (!confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/plp/waste/logs/batch-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logIds: selectedPendingLogIds,
          status,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.message || "Gagal memproses batch verifikasi.");
      }

      setLogs((prev) =>
        prev.map((l) =>
          selectedPendingLogIds.includes(l.id) ? { ...l, status } : l,
        ),
      );
      setSelectedPendingLogIds([]);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to PDF
  const handleExportPdf = () => {
    exportWasteLogsToPdf({
      logs: filteredLogs,
      summary,
      periodLabel: summary.label,
      roomDisplay:
        selectedRoom === "ALL"
          ? "Seluruh Ruangan Lab"
          : rooms.find((r) => r.id === selectedRoom)?.name || "Lab",
      filename: `neraca-limbah-b3-${summary.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
              K3 & Lingkungan Hidup
            </span>
            <span className="text-xs text-slate-400 font-medium">·</span>
            <span className="text-xs text-slate-500 font-mono">Permen LHK No. 6/2021</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Pengelolaan & Neraca Limbah B3
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Monitoring kuota jerigen meja lab, perpindahan TPS B3, serah terima vendor resmi, dan logbook terintegrasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Main Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("containers")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === "containers"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Meja Lab</span>
              <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] text-slate-700">
                {labFloorContainers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tps")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === "tps"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-amber-600" />
              <span>TPS & Manifest</span>
              {(sealedContainers.length > 0 || inTpsContainers.length > 0) && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                  {sealedContainers.length + inTpsContainers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === "logs"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Logbook B3</span>
              {pendingLogs.length > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800">
                  {pendingLogs.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "containers" ? (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Wadah
            </button>
          ) : activeTab === "logs" ? (
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Ekspor Neraca PDF
            </button>
          ) : null}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONTAINERS VIEW (MEJA LAB FLOOR) */}
      {/* ========================================================================= */}
      {activeTab === "containers" && (
        <div className="space-y-4">
          {/* Floor KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">
                Wadah Aktif Menampung
              </span>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {labFloorContainers.filter((c) => c.status === "ACTIVE").length}{" "}
                <span className="text-xs font-normal text-slate-500">jerigen</span>
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Hampir / Sudah Penuh (Perlu Segel)
              </span>
              <p className="mt-1 text-2xl font-bold text-amber-950">
                {
                  labFloorContainers.filter(
                    (c) => c.status === "FULL" || c.percentage >= 90,
                  ).length
                }{" "}
                <span className="text-xs font-normal text-amber-700">wadah</span>
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                Batas Retensi K3 (&ge; 75 Hari)
              </span>
              <p className="mt-1 text-2xl font-bold text-rose-950">
                {labFloorContainers.filter((c) => c.isRetentionWarning).length}{" "}
                <span className="text-xs font-normal text-rose-700">wadah</span>
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari jerigen atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-60 rounded-xl border border-slate-200 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>

              {/* Room Filter */}
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-slate-400 focus:outline-none"
              >
                <option value="ALL">Semua Ruangan Lab</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-slate-400 focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif Menampung</option>
                <option value="FULL">Hampir Penuh / Penuh</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Menampilkan{" "}
              <span className="font-semibold text-slate-900">
                {filteredLabContainers.length}
              </span>{" "}
              wadah aktif
            </div>
          </div>

          {/* Containers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLabContainers.map((container) => {
              const curVol = Number(container.currentVolume);
              const maxCap = Number(container.maxCapacity);
              const pct = container.percentage;
              const isFullOrNear = container.status === "FULL" || pct >= 90;

              let barColor = "bg-emerald-500";
              let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";

              if (container.status === "FULL" || pct >= 95 || container.ageDays >= 90) {
                barColor = "bg-rose-500";
                badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
              } else if (pct >= 80 || container.isRetentionWarning) {
                barColor = "bg-amber-500";
                badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
              }

              return (
                <div
                  key={container.id}
                  className={`rounded-2xl border bg-white p-4.5 shadow-xs flex flex-col justify-between transition ${
                    isFullOrNear
                      ? "border-amber-300 ring-1 ring-amber-100"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-500">
                          {container.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {container.name}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {container.roomName}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}
                      >
                        {container.status}
                      </span>
                    </div>

                    {/* Category Pill */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: container.categoryColorHex || "#e11d48" }}
                      />
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {container.categoryName}
                      </span>
                      {container.categoryHazardBadge && (
                        <span className="ml-auto shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                          {container.categoryHazardBadge}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar & Capacity */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          {curVol.toFixed(2)} / {maxCap.toFixed(2)} {container.unit}
                        </span>
                        <span className="font-bold text-slate-900">{pct}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Warning Badges */}
                    {container.isRetentionWarning && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 border border-amber-200">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <span>
                          Usia wadah {container.ageDays} hari (Batas simpan K3: 90 hari).
                        </span>
                      </div>
                    )}

                    {container.locationNotes && (
                      <p className="mt-2 text-[11px] text-slate-500 italic">
                        📍 {container.locationNotes}
                      </p>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                    <button
                      onClick={() => handleShowQr(container)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                      title="Lihat & Cetak Stiker Label GHS"
                    >
                      <QrCode className="h-3.5 w-3.5 text-slate-500" />
                      Label GHS
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(container)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                        title="Edit Data Wadah"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {isFullOrNear ? (
                        <button
                          onClick={() => handleOpenSealModal(container)}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition"
                          title="Segel jerigen ini dan langsung buka jerigen pengganti"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Segel &amp; Rollover
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenSealModal(container)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 transition"
                          title="Segel Wadah Ini"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Segel
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteContainer(container)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 transition"
                        title="Hapus / Arsipkan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredLabContainers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <Archive className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-900">
                Tidak ada wadah jerigen aktif
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Ubah filter pencarian atau daftarkan wadah baru untuk laboratorium ini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TPS & MANIFEST VIEW */}
      {/* ========================================================================= */}
      {activeTab === "tps" && (
        <div className="space-y-6">
          {/* TPS KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">
                Wadah Disegel di Lab
              </span>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {sealedContainers.length}{" "}
                <span className="text-xs font-normal text-slate-500">jerigen</span>
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">Siap dipindah ke TPS B3</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold text-amber-900">
                Wadah di Gudang TPS B3
              </span>
              <p className="mt-1 text-xl font-bold text-amber-950">
                {inTpsContainers.length}{" "}
                <span className="text-xs font-normal text-amber-700">jerigen</span>
              </p>
              <p className="text-[10px] text-amber-800 mt-0.5">Menunggu angkut vendor</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">
                Total Akumulasi di TPS
              </span>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {inTpsContainers
                  .reduce((acc, c) => acc + (Number(c.currentVolume) || 0), 0)
                  .toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-500">L/kg</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">
                Manifest Serah Terima
              </span>
              <p className="mt-1 text-xl font-bold text-emerald-700">
                {initialManifests.length}{" "}
                <span className="text-xs font-normal text-slate-500">dokumen</span>
              </p>
            </div>
          </div>

          {/* Section 1: Wadah Disegel di Lab (Menunggu Pindah ke TPS) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-600" />
                  Wadah Disegel di Meja Lab (Menunggu Pemindahan ke TPS B3)
                </h3>
                <p className="text-xs text-slate-500">
                  Jerigen ini sudah ditutup dan disegel di ruang praktikum, perlu diangkut ke TPS B3 kampus.
                </p>
              </div>

              {selectedSealedIds.length > 0 && (
                <button
                  onClick={() => setShowMoveTpsModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Pindahkan Terpilih ({selectedSealedIds.length}) ke TPS B3
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          sealedContainers.length > 0 &&
                          selectedSealedIds.length === sealedContainers.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSealedIds(sealedContainers.map((c) => c.id));
                          } else {
                            setSelectedSealedIds([]);
                          }
                        }}
                        className="rounded text-slate-900 focus:ring-0"
                      />
                    </th>
                    <th className="px-3 py-2.5">Kode &amp; Wadah</th>
                    <th className="px-3 py-2.5">Ruangan Lab</th>
                    <th className="px-3 py-2.5">Kategori B3</th>
                    <th className="px-3 py-2.5">Volume Terisi</th>
                    <th className="px-3 py-2.5">Tanggal Segel</th>
                    <th className="px-3 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sealedContainers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedSealedIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSealedIds((prev) => [...prev, c.id]);
                            } else {
                              setSelectedSealedIds((prev) => prev.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded text-slate-900 focus:ring-0"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-medium text-slate-900">{c.code}</div>
                        <div className="text-[11px] text-slate-500 font-semibold">{c.name}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{c.roomName}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{c.categoryName}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        {c.currentVolume} {c.unit}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {c.closedAt
                          ? new Date(c.closedAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedSealedIds([c.id]);
                            setShowMoveTpsModal(true);
                          }}
                          className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition"
                        >
                          Pindah ke TPS
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sealedContainers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-xs text-slate-400 italic">
                        Tidak ada jerigen yang sedang disegel di meja lab.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Wadah di Gudang TPS B3 (Menunggu Serah Terima Vendor) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Wadah di Gudang TPS B3 (Siap Pengangkutan Vendor Pihak Ketiga)
                </h3>
                <p className="text-xs text-slate-500">
                  Wadah telah disimpan aman di TPS B3 kampus. Centang wadah untuk membuat Berita Acara &amp; Manifest Festronik KLHK.
                </p>
              </div>

              {selectedTpsIds.length > 0 && (
                <button
                  onClick={() => setShowManifestModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
                >
                  <Truck className="h-3.5 w-3.5 text-emerald-400" />
                  Serah Terima ke Vendor ({selectedTpsIds.length} Wadah)
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          inTpsContainers.length > 0 &&
                          selectedTpsIds.length === inTpsContainers.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTpsIds(inTpsContainers.map((c) => c.id));
                          } else {
                            setSelectedTpsIds([]);
                          }
                        }}
                        className="rounded text-slate-900 focus:ring-0"
                      />
                    </th>
                    <th className="px-3 py-2.5">Kode &amp; Wadah</th>
                    <th className="px-3 py-2.5">Asal Lab</th>
                    <th className="px-3 py-2.5">Kategori B3</th>
                    <th className="px-3 py-2.5">Volume</th>
                    <th className="px-3 py-2.5">Masuk TPS</th>
                    <th className="px-3 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inTpsContainers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTpsIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTpsIds((prev) => [...prev, c.id]);
                            } else {
                              setSelectedTpsIds((prev) => prev.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded text-slate-900 focus:ring-0"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-medium text-slate-900">{c.code}</div>
                        <div className="text-[11px] text-slate-500 font-semibold">{c.name}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{c.roomName}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{c.categoryName}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        {c.currentVolume} {c.unit}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {c.tpsMovedAt
                          ? new Date(c.tpsMovedAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedTpsIds([c.id]);
                            setShowManifestModal(true);
                          }}
                          className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition"
                        >
                          Manifest Vendor
                        </button>
                      </td>
                    </tr>
                  ))}
                  {inTpsContainers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-xs text-slate-400 italic">
                        Tidak ada wadah limbah di gudang TPS B3 saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Riwayat Manifest & Berita Acara Vendor */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-slate-700" />
              Riwayat Manifest Pengangkutan B3 Resmi (Festronik / KLHK)
            </h3>
            <p className="text-xs text-slate-500">
              Dokumen serah terima limbah B3 kepada pihak ketiga berizin untuk pemusnahan resmi.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">No. Dokumen / Manifest</th>
                    <th className="px-3 py-2.5">Vendor Pengangkut</th>
                    <th className="px-3 py-2.5">Supir &amp; Plat</th>
                    <th className="px-3 py-2.5">Petugas Lab (PIC)</th>
                    <th className="px-3 py-2.5">Jumlah Wadah</th>
                    <th className="px-3 py-2.5">Total Volume</th>
                    <th className="px-3 py-2.5">Tanggal Serah Terima</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {initialManifests.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-bold text-slate-900">{m.manifestNumber}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.code}</div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {m.transporterName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {m.driverName || "-"} {m.vehiclePlate ? `(${m.vehiclePlate})` : ""}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 font-medium">
                        {m.picStaffName || "Petugas PLP"}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {m.totalContainers} wadah
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        {Number(m.totalVolumeL) > 0 ? `${m.totalVolumeL} L` : ""}{" "}
                        {Number(m.totalVolumeKg) > 0 ? `${m.totalVolumeKg} kg` : ""}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {new Date(m.handedOverAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                  {initialManifests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-xs text-slate-400 italic">
                        Belum ada dokumen manifest pengangkutan yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LOGBOOK & NERACA VIEW */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">
                Total Pembuangan
              </span>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {summary.totalLogs} <span className="text-xs font-normal text-slate-500">log</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">
                Total Residu Cair
              </span>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {summary.totalVolumeL.toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-500">Liter</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">
                Total Residu Padat
              </span>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {summary.totalVolumeKg.toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-500">kg</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">
                Periode Aktif
              </span>
              <p className="mt-1 text-xs font-bold text-emerald-800 truncate">
                {summary.label}
              </p>
            </div>
          </div>

          {/* Logbook Filter Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Filter Periode:</span>
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
                  <button
                    onClick={() => setPeriodType("monthly")}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      periodType === "monthly" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Bulanan
                  </button>
                  <button
                    onClick={() => setPeriodType("semester")}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      periodType === "semester" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Semester
                  </button>
                  <button
                    onClick={() => setPeriodType("quarterly")}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      periodType === "quarterly" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Triwulan (Q1–Q4)
                  </button>
                  <button
                    onClick={() => setPeriodType("custom")}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      periodType === "custom" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Kustom
                  </button>
                </div>
              </div>

              {/* Sub-selectors */}
              {periodType === "monthly" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Pilih Bulan:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-800"
                  />
                </div>
              )}

              {periodType === "semester" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Pilih Semester:</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value as "ganjil" | "genap")}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-800"
                  >
                    <option value="ganjil">Semester Ganjil (Sept – Jan)</option>
                    <option value="genap">Semester Genap (Feb – Jun)</option>
                  </select>
                </div>
              )}

              {periodType === "quarterly" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Pilih Kuartal:</label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value as "Q1" | "Q2" | "Q3" | "Q4")}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-800"
                  >
                    <option value="Q1">Q1 (Januari – Maret)</option>
                    <option value="Q2">Q2 (April – Juni)</option>
                    <option value="Q3">Q3 (Juli – September)</option>
                    <option value="Q4">Q4 (Oktober – Desember)</option>
                  </select>
                </div>
              )}

              {periodType === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-800"
                  />
                  <span className="text-xs text-slate-400">s/d</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Search and Batch Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari zat kimia, nama mahasiswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>

              {selectedPendingLogIds.length > 0 ? (
                <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xs">
                  <span className="text-xs font-semibold">
                    {selectedPendingLogIds.length} terpilih:
                  </span>
                  <button
                    onClick={() => handleBatchVerify("VERIFIED")}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
                  >
                    Setujui Semua
                  </button>
                  <button
                    onClick={() => handleBatchVerify("REJECTED")}
                    className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition"
                  >
                    Tolak Semua
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  {loadingLogs
                    ? "Memuat data..."
                    : `${filteredLogs.length} transaksi pembuangan`}
                </span>
              )}
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={
                        pendingLogs.length > 0 &&
                        selectedPendingLogIds.length === pendingLogs.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPendingLogIds(pendingLogs.map((l) => l.id));
                        } else {
                          setSelectedPendingLogIds([]);
                        }
                      }}
                      className="rounded text-slate-900 focus:ring-0"
                    />
                  </th>
                  <th className="px-4 py-3">Waktu &amp; Kode</th>
                  <th className="px-4 py-3">Mahasiswa / NIM</th>
                  <th className="px-4 py-3">Wadah Jerigen</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3">Sisa Reaksi Kimia</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isPending = log.status === "LOGGED";
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-3 text-center">
                        {isPending && (
                          <input
                            type="checkbox"
                            checked={selectedPendingLogIds.includes(log.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPendingLogIds((prev) => [...prev, log.id]);
                              } else {
                                setSelectedPendingLogIds((prev) =>
                                  prev.filter((id) => id !== log.id),
                                );
                              }
                            }}
                            className="rounded text-slate-900 focus:ring-0"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-medium text-slate-900">{log.code}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(log.disposedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{log.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {log.studentUsername || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{log.containerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {log.containerCode}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {log.categoryName}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {log.quantity} {log.unit}
                      </td>
                      <td
                        className="px-4 py-3 max-w-xs truncate text-slate-600"
                        title={log.chemicalDescription}
                      >
                        {log.chemicalDescription}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            log.status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : log.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {log.status === "VERIFIED"
                            ? "Terverifikasi"
                            : log.status === "REJECTED"
                              ? "Ditolak"
                              : "Menunggu"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isPending ? (
                          <button
                            onClick={() => handleOpenVerifyLog(log)}
                            className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition"
                          >
                            Verifikasi
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Selesai</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                {loadingLogs
                  ? "Sedang memuat data logbook..."
                  : "Belum ada transaksi pembuangan limbah pada periode ini."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT CONTAINER */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingContainer ? "Edit Wadah Jerigen" : "Tambah Wadah Jerigen Baru"}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitContainer} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nama Wadah / Jerigen
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Jerigen Asam Ruang 302"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              {!editingContainer && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Ruangan Lab
                  </label>
                  <select
                    required
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Kategori Limbah B3
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    const chosenCat = initialCategories.find((c) => c.id === chosenId);
                    const isSolid =
                      chosenCat?.physicalState === "SOLID" ||
                      chosenCat?.code === "PADAT";
                    setFormData({
                      ...formData,
                      categoryId: chosenId,
                      unit: isSolid ? "kg" : "L",
                      maxCapacity: isSolid ? 10 : 20,
                    });
                  }}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  {initialCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.physicalState === "SOLID" ? "Padat" : "Cair"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Kapasitas Maksimal
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="1000"
                    required
                    value={formData.maxCapacity}
                    onChange={(e) =>
                      setFormData({ ...formData, maxCapacity: Number(e.target.value) })
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Satuan
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="L">Liter (L)</option>
                    <option value="mL">mililiter (mL)</option>
                    <option value="kg">Kilogram (kg)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Catatan Lokasi / Meja
                </label>
                <input
                  type="text"
                  placeholder="Misal: Bawah lemari asam sudut utara"
                  value={formData.locationNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, locationNotes: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {isSubmitting
                    ? "Menyimpan..."
                    : editingContainer
                      ? "Simpan Perubahan"
                      : "Daftarkan Wadah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SEAL & ROLLOVER MODAL */}
      {/* ========================================================================= */}
      {sealModalContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Segel Wadah Jerigen B3
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kunci wadah penuh dan siapkan pengganti agar praktikum tidak macet.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSealModalContainer(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleConfirmSeal} className="mt-4 space-y-3.5">
              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Wadah yang Disegel:</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {sealModalContainer.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kapasitas Terisi:</span>
                  <span className="font-bold text-slate-900">
                    {sealModalContainer.currentVolume} / {sealModalContainer.maxCapacity}{" "}
                    {sealModalContainer.unit} ({sealModalContainer.percentage}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lokasi:</span>
                  <span className="text-slate-800">{sealModalContainer.roomName}</span>
                </div>
              </div>

              {/* Rollover Checkbox */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sealRolloverCheck}
                    onChange={(e) => setSealRolloverCheck(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                      <RotateCcw className="h-3.5 w-3.5 text-emerald-700" />
                      1-Click Rollover: Otomatis Daftarkan Jerigen Baru
                    </span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Membuat wadah baru siap pakai di ruangan yang sama dengan kategori &amp; kuota yang identik.
                    </p>
                  </div>
                </label>

                {sealRolloverCheck && (
                  <div className="pt-2 border-t border-emerald-200/60">
                    <label className="block text-[11px] font-semibold text-emerald-900">
                      Nama Jerigen Baru Pengganti:
                    </label>
                    <input
                      type="text"
                      required={sealRolloverCheck}
                      value={sealNewName}
                      onChange={(e) => setSealNewName(e.target.value)}
                      className="mt-1 h-8 w-full rounded-lg border border-emerald-300 bg-white px-2.5 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSealModalContainer(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition shadow-xs"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi & Segel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MOVE TO TPS MODAL */}
      {/* ========================================================================= */}
      {showMoveTpsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-600" />
                Pindahkan ke TPS B3 Kampus
              </h3>
              <button
                onClick={() => setShowMoveTpsModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleMoveToTps} className="mt-4 space-y-3.5">
              <p className="text-xs text-slate-600">
                Anda akan menandai <strong>{selectedSealedIds.length} wadah</strong> tersegel telah dipindahkan dari ruang praktikum ke tempat penampungan sementara (TPS B3) kampus.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Catatan Pemindahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Disimpan di rak A3 TPS B3 Fakultas"
                  value={moveTpsNotes}
                  onChange={(e) => setMoveTpsNotes(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMoveTpsModal(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi Masuk TPS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MANIFEST HANDOVER TO VENDOR */}
      {/* ========================================================================= */}
      {showManifestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  Serah Terima Pengangkutan B3 (Manifest)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Serah terima {selectedTpsIds.length} wadah TPS ke vendor pengangkut berizin KLHK.
                </p>
              </div>
              <button
                onClick={() => setShowManifestModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitManifest} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nomor Manifest / No. Festronik KLHK
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: FST-2026-KLHK-09412"
                  value={manifestFormData.manifestNumber}
                  onChange={(e) =>
                    setManifestFormData({
                      ...manifestFormData,
                      manifestNumber: e.target.value,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs font-mono text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nama Vendor / PT Transporter B3
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Prasadha Pamunah Limbah Industri (PPLI)"
                  value={manifestFormData.transporterName}
                  onChange={(e) =>
                    setManifestFormData({
                      ...manifestFormData,
                      transporterName: e.target.value,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nama Pengemudi / Supir
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Bpk. Bambang"
                    value={manifestFormData.driverName}
                    onChange={(e) =>
                      setManifestFormData({
                        ...manifestFormData,
                        driverName: e.target.value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nomor Polisi Truk
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: B 9123 KHA"
                    value={manifestFormData.vehiclePlate}
                    onChange={(e) =>
                      setManifestFormData({
                        ...manifestFormData,
                        vehiclePlate: e.target.value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs font-mono text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Catatan Berita Acara (BAST)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Kondisi jerigen utuh tidak bocor saat dimuat"
                  value={manifestFormData.notes}
                  onChange={(e) =>
                    setManifestFormData({
                      ...manifestFormData,
                      notes: e.target.value,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManifestModal(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Menyimpan Manifest..." : "Simpan Serah Terima"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ENHANCED GHS QR STICKER */}
      {/* ========================================================================= */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-slate-200 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                Stiker Label Limbah B3 Resmi (GHS)
              </h3>
              <button
                onClick={() => setQrModalData(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              id="printable-ghs-sticker"
              className="mt-3 p-4 rounded-xl border-2 border-slate-900 bg-white text-left space-y-2 shadow-xs"
            >
              <div className="border-b-2 border-slate-900 pb-1.5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono font-black tracking-widest text-slate-500 uppercase">
                    LABORATORIUM KIMIA · FMIPA
                  </span>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    LABEL LIMBAH BAHAN BERBAHAYA &amp; BERACUN (B3)
                  </h4>
                </div>
                <div className="h-7 w-7 rounded border border-rose-600 bg-rose-50 flex items-center justify-center text-rose-700 font-black text-xs">
                  {qrModalData.hazardBadge || "B3"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Nama Wadah:</span>
                  <span className="font-bold text-slate-900">{qrModalData.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Kategori Limbah:</span>
                  <span className="font-bold text-rose-700">{qrModalData.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Ruangan Penghasil:</span>
                  <span className="font-semibold text-slate-800">{qrModalData.room}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Maks. Kapasitas:</span>
                  <span className="font-semibold text-slate-800">
                    {qrModalData.maxCapacity} {qrModalData.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Tanggal Dibuka:</span>
                  <span className="font-mono font-medium text-slate-800">{qrModalData.openedAt}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Batas Simpan K3 (90 Hari):</span>
                  <span className="font-mono font-bold text-amber-800">
                    {qrModalData.retentionDeadline}
                  </span>
                </div>
              </div>

              <div className="my-2 flex flex-col items-center justify-center border-t border-b border-dashed border-slate-200 py-2">
                <img
                  src={qrModalData.dataUrl}
                  alt={qrModalData.code}
                  className="h-36 w-36 rounded-md bg-white p-1 border border-slate-300"
                />
                <div className="mt-1 font-mono text-[11px] font-bold tracking-wider text-slate-900">
                  {qrModalData.code}
                </div>
              </div>

              <div className="text-[9px] text-slate-500 leading-tight">
                <strong>SOP K3:</strong> Pindai QR sebelum menuang sisa praktikum. Dilarang mencampur senyawa inkompatibel. Laporkan kebocoran ke PLP.
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setQrModalData(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Cetak Stiker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: VERIFY LOG MODAL */}
      {/* ========================================================================= */}
      {verifyLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Verifikasi Pembuangan Limbah
              </h3>
              <button
                onClick={() => setVerifyLogModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 space-y-1 text-xs">
              <div>
                <span className="text-slate-500">Mahasiswa:</span>{" "}
                <span className="font-semibold text-slate-800">
                  {verifyLogModal.studentName} ({verifyLogModal.studentUsername || "-"})
                </span>
              </div>
              <div>
                <span className="text-slate-500">Wadah:</span>{" "}
                <span className="font-semibold text-slate-800">
                  {verifyLogModal.containerName}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Sisa Zat:</span>{" "}
                <span className="font-semibold text-slate-800">
                  {verifyLogModal.chemicalDescription}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitVerifyLog} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Keputusan Verifikasi
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyStatus("VERIFIED")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      verifyStatus === "VERIFIED"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Setujui (Valid)
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerifyStatus("REJECTED")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      verifyStatus === "REJECTED"
                        ? "border-rose-500 bg-rose-50 text-rose-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    Tolak / Batal
                  </button>
                </div>
              </div>

              {verifyStatus === "VERIFIED" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Kuantitas Disetujui ({verifyLogModal.unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustedQty}
                    onChange={(e) => setAdjustedQty(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    PLP dapat menyesuaikan kuantitas jika estimasi mahasiswa kurang presisi.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Catatan Verifikasi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Sudah diperiksa kejernihan sisa pelarut"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerifyLogModal(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi Verifikasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
