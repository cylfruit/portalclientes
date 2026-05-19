export type EmbarqueRow = {
  NroEmbarque: number | null;
  CodigoTemporada: string | null;
  CodRecibidor: string | null;
  Contenedor: string | null;
  Consignatario: string | null;
  NomRecibidor: string | null;
  CodigoGrupoRecibidor: string | null;
  NombreGrupoRecibidor: string | null;
  Pallet: string | null;
  CodEspecie: string | null;
  NomEspecie: string | null;
  CodVariedadEti: string | null;
  NomVariedadEti: string | null;
  TotalCajas: number | null;
  PesoBrutoAduana: number | null;
  PesoNeto: number | null;
  CodigoProductorEti: string | null;
  NomProductorEti: string | null;
  FechaPack: string | null;
  Termografo: string | null;
  NomCategoria: string | null;
  Fecha_ETD: string | null;
  Fecha_ETA: string | null;
  Fecha_ATD: string | null;
  Fecha_ATA: string | null;
  NomPuertoDestino: string | null;
  NomPuertoZarpe: string | null;
  NomPais: string | null;
  NomExportador: string | null;
  NombreNaviera: string | null;
  BL: string | null;
  Booking_AWB: string | null;
  MasaBruta: number | null;
  NomNave: string | null;
  NomPLU: string | null;
  NumeroCertificadoProductorEti: string | null;
  Mercado_Cliente: string | null;
  FDA: string | null;
};

export type DocumentSummary = {
  label: string;
  value: string;
  state:
    | "Emitido"
    | "Confirmado"
    | "Completo"
    | "Vigente"
    | "Parcial"
    | "Pendiente"
    | "Revisar";
};

export type ShipmentSummary = {
  groupKey: string;
  id: string;
  season: string;
  recipientCode: string;
  recipientName: string;
  recipientGroup: string;
  consignee: string;
  container: string;
  market: string;
  route: string;
  originPort: string;
  destinationPort: string;
  country: string;
  exporter: string;
  shippingLine: string;
  vesselName: string;
  status: "Programado" | "En transito" | "Arribado";
  pallets: number;
  totalBoxes: number;
  netWeight: number;
  grossWeight: number;
  etd: string | null;
  eta: string | null;
  atd: string | null;
  ata: string | null;
  producers: string[];
  species: string[];
  varieties: string[];
  bl: string;
  booking: string;
  documents: DocumentSummary[];
};

export type PortalClientUser = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  recipientCode: string;
  recipientName: string;
  groupCode: string;
  modules: string[];
  status: "Activo" | "Pendiente" | "Bloqueado";
  lastAccess: string;
  twoFactor: boolean;
  scope: string;
};

export const embarqueRows: EmbarqueRow[] = [
  {
    NroEmbarque: 240315,
    CodigoTemporada: "2025-2026",
    CodRecibidor: "REC-EU-14",
    Contenedor: "MSCU4215639",
    Consignatario: "RBC Fresh Europe BV",
    NomRecibidor: "RBC Fresh Europe",
    CodigoGrupoRecibidor: "EU-NORTH",
    NombreGrupoRecibidor: "Grupo Europa Norte",
    Pallet: "PAL-240315-001",
    CodEspecie: "CH",
    NomEspecie: "Cereza",
    CodVariedadEti: "SAN",
    NomVariedadEti: "Santina",
    TotalCajas: 420,
    PesoBrutoAduana: 4356,
    PesoNeto: 3780,
    CodigoProductorEti: "1109",
    NomProductorEti: "Agricola Los Maitenes",
    FechaPack: "2026-05-12",
    Termografo: "TG-55311",
    NomCategoria: "Premium",
    Fecha_ETD: "2026-05-17",
    Fecha_ETA: "2026-06-03",
    Fecha_ATD: "2026-05-18",
    Fecha_ATA: null,
    NomPuertoDestino: "Rotterdam",
    NomPuertoZarpe: "San Antonio",
    NomPais: "Paises Bajos",
    NomExportador: "C&L Fruit",
    NombreNaviera: "MSC",
    BL: "BL-948522",
    Booking_AWB: "BK-772191",
    MasaBruta: 4510,
    NomNave: "Santa Aurora",
    NomPLU: "4045",
    NumeroCertificadoProductorEti: "CERT-1109-81",
    Mercado_Cliente: "Retail premium",
    FDA: "FDA-CL-8821",
  },
  {
    NroEmbarque: 240315,
    CodigoTemporada: "2025-2026",
    CodRecibidor: "REC-EU-14",
    Contenedor: "MSCU4215639",
    Consignatario: "RBC Fresh Europe BV",
    NomRecibidor: "RBC Fresh Europe",
    CodigoGrupoRecibidor: "EU-NORTH",
    NombreGrupoRecibidor: "Grupo Europa Norte",
    Pallet: "PAL-240315-002",
    CodEspecie: "CH",
    NomEspecie: "Cereza",
    CodVariedadEti: "LAP",
    NomVariedadEti: "Lapins",
    TotalCajas: 390,
    PesoBrutoAduana: 4050,
    PesoNeto: 3510,
    CodigoProductorEti: "1180",
    NomProductorEti: "Agricola Valle Claro",
    FechaPack: "2026-05-12",
    Termografo: "TG-55312",
    NomCategoria: "Premium",
    Fecha_ETD: "2026-05-17",
    Fecha_ETA: "2026-06-03",
    Fecha_ATD: "2026-05-18",
    Fecha_ATA: null,
    NomPuertoDestino: "Rotterdam",
    NomPuertoZarpe: "San Antonio",
    NomPais: "Paises Bajos",
    NomExportador: "C&L Fruit",
    NombreNaviera: "MSC",
    BL: "BL-948522",
    Booking_AWB: "BK-772191",
    MasaBruta: 4190,
    NomNave: "Santa Aurora",
    NomPLU: "4706",
    NumeroCertificadoProductorEti: "CERT-1180-33",
    Mercado_Cliente: "Retail premium",
    FDA: "FDA-CL-8821",
  },
  {
    NroEmbarque: 240315,
    CodigoTemporada: "2025-2026",
    CodRecibidor: "REC-EU-14",
    Contenedor: "MSCU4215639",
    Consignatario: "RBC Fresh Europe BV",
    NomRecibidor: "RBC Fresh Europe",
    CodigoGrupoRecibidor: "EU-NORTH",
    NombreGrupoRecibidor: "Grupo Europa Norte",
    Pallet: "PAL-240315-003",
    CodEspecie: "CH",
    NomEspecie: "Cereza",
    CodVariedadEti: "SAN",
    NomVariedadEti: "Santina",
    TotalCajas: 405,
    PesoBrutoAduana: 4205,
    PesoNeto: 3645,
    CodigoProductorEti: "1264",
    NomProductorEti: "Agricola Las Encinas",
    FechaPack: "2026-05-13",
    Termografo: "TG-55313",
    NomCategoria: "Premium",
    Fecha_ETD: "2026-05-17",
    Fecha_ETA: "2026-06-03",
    Fecha_ATD: "2026-05-18",
    Fecha_ATA: null,
    NomPuertoDestino: "Rotterdam",
    NomPuertoZarpe: "San Antonio",
    NomPais: "Paises Bajos",
    NomExportador: "C&L Fruit",
    NombreNaviera: "MSC",
    BL: "BL-948522",
    Booking_AWB: "BK-772191",
    MasaBruta: 4320,
    NomNave: "Santa Aurora",
    NomPLU: "4045",
    NumeroCertificadoProductorEti: "CERT-1264-07",
    Mercado_Cliente: "Retail premium",
    FDA: "FDA-CL-8821",
  },
  {
    NroEmbarque: 240318,
    CodigoTemporada: "2025-2026",
    CodRecibidor: "REC-US-05",
    Contenedor: "SEGU7864210",
    Consignatario: "Sunfield Produce LLC",
    NomRecibidor: "Sunfield Produce",
    CodigoGrupoRecibidor: "USA-WEST",
    NombreGrupoRecibidor: "Grupo Costa Oeste",
    Pallet: "PAL-240318-001",
    CodEspecie: "KW",
    NomEspecie: "Kiwi",
    CodVariedadEti: "HAY",
    NomVariedadEti: "Hayward",
    TotalCajas: 510,
    PesoBrutoAduana: 9650,
    PesoNeto: 9180,
    CodigoProductorEti: "2012",
    NomProductorEti: "Fundo Los Rios",
    FechaPack: "2026-05-05",
    Termografo: "TG-44110",
    NomCategoria: "Export",
    Fecha_ETD: "2026-05-14",
    Fecha_ETA: "2026-05-25",
    Fecha_ATD: "2026-05-14",
    Fecha_ATA: "2026-05-26",
    NomPuertoDestino: "Long Beach",
    NomPuertoZarpe: "Valparaiso",
    NomPais: "Estados Unidos",
    NomExportador: "C&L Fruit",
    NombreNaviera: "Hapag-Lloyd",
    BL: "BL-951101",
    Booking_AWB: "BK-820054",
    MasaBruta: 9980,
    NomNave: "Pacific Spring",
    NomPLU: "4030",
    NumeroCertificadoProductorEti: "CERT-2012-11",
    Mercado_Cliente: "Foodservice",
    FDA: "FDA-US-9941",
  },
  {
    NroEmbarque: 240318,
    CodigoTemporada: "2025-2026",
    CodRecibidor: "REC-US-05",
    Contenedor: "SEGU7864210",
    Consignatario: "Sunfield Produce LLC",
    NomRecibidor: "Sunfield Produce",
    CodigoGrupoRecibidor: "USA-WEST",
    NombreGrupoRecibidor: "Grupo Costa Oeste",
    Pallet: "PAL-240318-002",
    CodEspecie: "KW",
    NomEspecie: "Kiwi",
    CodVariedadEti: "HAY",
    NomVariedadEti: "Hayward",
    TotalCajas: 495,
    PesoBrutoAduana: 9390,
    PesoNeto: 8910,
    CodigoProductorEti: "2088",
    NomProductorEti: "Fundo Santa Ines",
    FechaPack: "2026-05-05",
    Termografo: "TG-44111",
    NomCategoria: "Export",
    Fecha_ETD: "2026-05-14",
    Fecha_ETA: "2026-05-25",
    Fecha_ATD: "2026-05-14",
    Fecha_ATA: "2026-05-26",
    NomPuertoDestino: "Long Beach",
    NomPuertoZarpe: "Valparaiso",
    NomPais: "Estados Unidos",
    NomExportador: "C&L Fruit",
    NombreNaviera: "Hapag-Lloyd",
    BL: "BL-951101",
    Booking_AWB: "BK-820054",
    MasaBruta: 9720,
    NomNave: "Pacific Spring",
    NomPLU: "4030",
    NumeroCertificadoProductorEti: "CERT-2088-44",
    Mercado_Cliente: "Foodservice",
    FDA: "FDA-US-9941",
  },
  {
    NroEmbarque: 240322,
    CodigoTemporada: "2025-2026",
    CodRecibidor: "REC-ME-03",
    Contenedor: "OOLU2199417",
    Consignatario: "Gulf Orchard Trading",
    NomRecibidor: "Gulf Orchard Trading",
    CodigoGrupoRecibidor: "MEA",
    NombreGrupoRecibidor: "Grupo Medio Oriente",
    Pallet: "PAL-240322-001",
    CodEspecie: "PL",
    NomEspecie: "Ciruela",
    CodVariedadEti: "DAG",
    NomVariedadEti: "D'Agen",
    TotalCajas: 460,
    PesoBrutoAduana: 5890,
    PesoNeto: 5520,
    CodigoProductorEti: "3205",
    NomProductorEti: "Agricola El Monte",
    FechaPack: "2026-05-20",
    Termografo: "TG-61820",
    NomCategoria: "Premium",
    Fecha_ETD: "2026-05-28",
    Fecha_ETA: "2026-06-19",
    Fecha_ATD: null,
    Fecha_ATA: null,
    NomPuertoDestino: "Jebel Ali",
    NomPuertoZarpe: "San Antonio",
    NomPais: "Emiratos Arabes Unidos",
    NomExportador: "C&L Fruit",
    NombreNaviera: "CMA CGM",
    BL: "BL-960410",
    Booking_AWB: "BK-860177",
    MasaBruta: 6120,
    NomNave: "Desert Crown",
    NomPLU: "4040",
    NumeroCertificadoProductorEti: "CERT-3205-17",
    Mercado_Cliente: "Distribucion mayorista",
    FDA: null,
  },
  {
    NroEmbarque: 240322,
    CodigoTemporada: "2025-2026",
    CodRecibidor: "REC-ME-03",
    Contenedor: "OOLU2199417",
    Consignatario: "Gulf Orchard Trading",
    NomRecibidor: "Gulf Orchard Trading",
    CodigoGrupoRecibidor: "MEA",
    NombreGrupoRecibidor: "Grupo Medio Oriente",
    Pallet: "PAL-240322-002",
    CodEspecie: "PL",
    NomEspecie: "Ciruela",
    CodVariedadEti: "DAG",
    NomVariedadEti: "D'Agen",
    TotalCajas: 450,
    PesoBrutoAduana: 5750,
    PesoNeto: 5400,
    CodigoProductorEti: "3277",
    NomProductorEti: "Agricola La Esperanza",
    FechaPack: "2026-05-20",
    Termografo: "TG-61821",
    NomCategoria: "Premium",
    Fecha_ETD: "2026-05-28",
    Fecha_ETA: "2026-06-19",
    Fecha_ATD: null,
    Fecha_ATA: null,
    NomPuertoDestino: "Jebel Ali",
    NomPuertoZarpe: "San Antonio",
    NomPais: "Emiratos Arabes Unidos",
    NomExportador: "C&L Fruit",
    NombreNaviera: "CMA CGM",
    BL: "BL-960410",
    Booking_AWB: "BK-860177",
    MasaBruta: 5960,
    NomNave: "Desert Crown",
    NomPLU: "4040",
    NumeroCertificadoProductorEti: "CERT-3277-29",
    Mercado_Cliente: "Distribucion mayorista",
    FDA: null,
  },
];

export const clientUsers: PortalClientUser[] = [
  {
    id: "USR-001",
    fullName: "Camila Robles",
    username: "crobles_rbc",
    email: "camila.robles@rbcfresh.eu",
    role: "Administrador cliente",
    recipientCode: "REC-EU-14",
    recipientName: "RBC Fresh Europe",
    groupCode: "EU-NORTH",
    modules: ["Embarques", "Pallets", "Documentos", "Usuarios"],
    status: "Activo",
    lastAccess: "18 may 2026 · 08:42",
    twoFactor: true,
    scope: "Todo el recibidor",
  },
  {
    id: "USR-002",
    fullName: "Lars Van Dijk",
    username: "lvdijk_qc",
    email: "lars.vandijk@rbcfresh.eu",
    role: "Supervisor de calidad",
    recipientCode: "REC-EU-14",
    recipientName: "RBC Fresh Europe",
    groupCode: "EU-NORTH",
    modules: ["Embarques", "Pallets", "Documentos"],
    status: "Activo",
    lastAccess: "17 may 2026 · 19:10",
    twoFactor: true,
    scope: "Solo lectura operativa",
  },
  {
    id: "USR-003",
    fullName: "Megan Foster",
    username: "mfoster_ops",
    email: "megan.foster@sunfieldproduce.com",
    role: "Coordinador recibidor",
    recipientCode: "REC-US-05",
    recipientName: "Sunfield Produce",
    groupCode: "USA-WEST",
    modules: ["Embarques", "Pallets", "Documentos", "Alertas"],
    status: "Activo",
    lastAccess: "18 may 2026 · 06:55",
    twoFactor: false,
    scope: "Recibidor y alertas",
  },
  {
    id: "USR-004",
    fullName: "Omar Al Nuaimi",
    username: "onuaimi_gulf",
    email: "omar.alnuaimi@gulforchard.ae",
    role: "Administrador cliente",
    recipientCode: "REC-ME-03",
    recipientName: "Gulf Orchard Trading",
    groupCode: "MEA",
    modules: ["Embarques", "Pallets", "Documentos"],
    status: "Pendiente",
    lastAccess: "Invitacion enviada",
    twoFactor: false,
    scope: "Grupo completo",
  },
  {
    id: "USR-005",
    fullName: "Sandra Mella",
    username: "smella_internal",
    email: "sandra.mella@cylfruit.cl",
    role: "Backoffice comercial",
    recipientCode: "MULTI",
    recipientName: "Vista transversal",
    groupCode: "GLOBAL",
    modules: ["Embarques", "Pallets", "Documentos", "Usuarios", "Alertas"],
    status: "Bloqueado",
    lastAccess: "14 may 2026 · 12:21",
    twoFactor: true,
    scope: "Soporte interno",
  },
];

function collectUnique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter((value): value is string => Boolean(value && value.trim())),
    ),
  );
}

function sumNullable(values: Array<number | null | undefined>) {
  return values.reduce<number>(
    (accumulator, value) => accumulator + (value ?? 0),
    0,
  );
}

function resolveShipmentStatus(row: EmbarqueRow): ShipmentSummary["status"] {
  if (row.Fecha_ATA) {
    return "Arribado";
  }

  if (row.Fecha_ATD) {
    return "En transito";
  }

  return "Programado";
}

function buildShipmentGroupKey(row: EmbarqueRow) {
  return [
    row.CodigoTemporada ?? "sin-temporada",
    row.NroEmbarque ?? "sin-embarque",
    row.CodRecibidor ?? "sin-recibidor",
    row.Contenedor ?? "sin-contenedor",
    row.BL ?? "sin-bl",
    row.Booking_AWB ?? "sin-booking",
  ].join("|");
}

function buildDocuments(rows: EmbarqueRow[]): DocumentSummary[] {
  const firstRow = rows[0];
  const certificates = collectUnique(
    rows.map((row) => row.NumeroCertificadoProductorEti),
  );

  return [
    {
      label: "BL",
      value: firstRow.BL ?? "Pendiente de emision",
      state: firstRow.BL ? "Emitido" : "Pendiente",
    },
    {
      label: "Booking / AWB",
      value: firstRow.Booking_AWB ?? "Pendiente de confirmacion",
      state: firstRow.Booking_AWB ? "Confirmado" : "Pendiente",
    },
    {
      label: "Certificados productor",
      value:
        certificates.length > 0
          ? `${certificates.length} certificados cargados`
          : "Sin certificados",
      state:
        certificates.length === rows.length
          ? "Completo"
          : certificates.length > 0
            ? "Parcial"
            : "Pendiente",
    },
    {
      label: "FDA",
      value: firstRow.FDA ?? "Sin registro cliente",
      state: firstRow.FDA ? "Vigente" : "Revisar",
    },
  ];
}

export function buildShipmentsFromRows(rows: EmbarqueRow[]): ShipmentSummary[] {
  return Object.values(
    rows.reduce<Record<string, EmbarqueRow[]>>((groupedRows, row) => {
      const shipmentKey = buildShipmentGroupKey(row);

      if (!groupedRows[shipmentKey]) {
        groupedRows[shipmentKey] = [];
      }

      groupedRows[shipmentKey].push(row);
      return groupedRows;
    }, {}),
  ).map((shipmentRows) => {
    const firstRow = shipmentRows[0];

    return {
      groupKey: buildShipmentGroupKey(firstRow),
      id: String(firstRow.NroEmbarque ?? "sin-embarque"),
      season: firstRow.CodigoTemporada ?? "Sin temporada",
      recipientCode: firstRow.CodRecibidor ?? "Sin codigo",
      recipientName: firstRow.NomRecibidor ?? "Sin recibidor",
      recipientGroup: firstRow.CodigoGrupoRecibidor ?? "Sin grupo",
      consignee: firstRow.Consignatario ?? "Sin consignatario",
      container: firstRow.Contenedor ?? "Sin contenedor",
      market: firstRow.Mercado_Cliente ?? "Sin mercado",
      route: `${firstRow.NomPuertoZarpe ?? "Sin zarpe"} -> ${firstRow.NomPuertoDestino ?? "Sin destino"}`,
      originPort: firstRow.NomPuertoZarpe ?? "Sin zarpe",
      destinationPort: firstRow.NomPuertoDestino ?? "Sin destino",
      country: firstRow.NomPais ?? "Sin pais",
      exporter: firstRow.NomExportador ?? "Sin exportador",
      shippingLine: firstRow.NombreNaviera ?? "Sin naviera",
      vesselName: firstRow.NomNave ?? "Sin nave",
      status: resolveShipmentStatus(firstRow),
      pallets: shipmentRows.length,
      totalBoxes: sumNullable(shipmentRows.map((row) => row.TotalCajas)),
      netWeight: sumNullable(shipmentRows.map((row) => row.PesoNeto)),
      grossWeight: sumNullable(shipmentRows.map((row) => row.MasaBruta)),
      etd: firstRow.Fecha_ETD,
      eta: firstRow.Fecha_ETA,
      atd: firstRow.Fecha_ATD,
      ata: firstRow.Fecha_ATA,
      producers: collectUnique(shipmentRows.map((row) => row.NomProductorEti)),
      species: collectUnique(shipmentRows.map((row) => row.NomEspecie)),
      varieties: collectUnique(shipmentRows.map((row) => row.NomVariedadEti)),
      bl: firstRow.BL ?? "Sin BL",
      booking: firstRow.Booking_AWB ?? "Sin Booking",
      documents: buildDocuments(shipmentRows),
    };
  });
}

export const shipments: ShipmentSummary[] =
  buildShipmentsFromRows(embarqueRows);

export const portalMetrics = {
  activeShipments: shipments.filter(
    (shipment) => shipment.status !== "Arribado",
  ).length,
  recipients: collectUnique(embarqueRows.map((row) => row.CodRecibidor)).length,
  pallets: embarqueRows.length,
  totalBoxes: sumNullable(embarqueRows.map((row) => row.TotalCajas)),
  readyDocuments: shipments.reduce(
    (accumulator, shipment) =>
      accumulator +
      shipment.documents.filter((document) =>
        ["Emitido", "Confirmado", "Completo", "Vigente"].includes(
          document.state,
        ),
      ).length,
    0,
  ),
};

const numberFormatter = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
});

export function formatNumber(value: number | null | undefined) {
  return numberFormatter.format(value ?? 0);
}

export function formatWeight(value: number | null | undefined) {
  return `${formatNumber(value)} kg`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Por confirmar";
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return dateFormatter.format(parsedDate);
}

export const portalUserRoleBlueprint = [
  {
    name: "Administrador cliente",
    scope: "Grupo completo",
    description:
      "Crea o desactiva usuarios del mismo recibidor y ve todos los documentos asociados a sus embarques.",
    modules: ["Embarques", "Pallets", "Documentos", "Usuarios"],
  },
  {
    name: "Supervisor de calidad",
    scope: "Solo lectura",
    description:
      "Consulta detalle por pallet, termografos, certificados y trazabilidad sin editar accesos.",
    modules: ["Embarques", "Pallets", "Documentos"],
  },
  {
    name: "Backoffice comercial",
    scope: "Vista transversal",
    description:
      "Perfil interno para soporte, onboarding y revision de incidencias de clientes.",
    modules: ["Embarques", "Pallets", "Documentos", "Usuarios", "Alertas"],
  },
];

export const portalUserSchema = [
  {
    name: "Id",
    type: "UInt64",
    purpose: "Identificador tecnico del usuario cliente.",
  },
  {
    name: "Username",
    type: "String",
    purpose: "Login visible para el recibidor o cliente.",
  },
  {
    name: "PasswordHash",
    type: "String",
    purpose: "Hash BCrypt o Argon2 del acceso cliente.",
  },
  {
    name: "NombreCompleto",
    type: "String",
    purpose: "Nombre de contacto que se muestra en el mantenedor.",
  },
  {
    name: "Email",
    type: "String",
    purpose: "Correo para invitaciones, alertas y recuperacion.",
  },
  {
    name: "CodRecibidor",
    type: "String",
    purpose: "Filtro principal para mostrar embarques del cliente.",
  },
  {
    name: "CodigoGrupoRecibidor",
    type: "String",
    purpose: "Permite agrupar clientes con multiples recibidores o filiales.",
  },
  {
    name: "Modulos",
    type: "Array(String)",
    purpose:
      "Lista de modulos visibles: Embarques, Pallets, Documentos y Usuarios.",
  },
  {
    name: "Activo",
    type: "UInt8",
    purpose: "Bandera de habilitacion operacional del acceso.",
  },
  {
    name: "Version",
    type: "DateTime",
    purpose:
      "Columna de versionado para lecturas consistentes si se usa ReplacingMergeTree.",
  },
];
