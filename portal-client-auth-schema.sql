-- ClickHouse schema for portalclientes user access.
-- The API and backend stay inside this same Next.js project.
-- Read with FINAL because the table uses ReplacingMergeTree(Version).

CREATE TABLE IF NOT EXISTS PortalClientes.PortalClientUsers
(
  UserId UUID,
  Username String,
  Email String,
  FullName String,
  PasswordHash String,
  RoleKey LowCardinality(String),
  PreferredLocale LowCardinality(String),
  RecipientCode Nullable(String),
  RecipientName Nullable(String),
  RecipientGroupCode Nullable(String),
  CanViewAll UInt8,
  Modules Array(String),
  Status LowCardinality(String),
  TwoFactorEnabled UInt8,
  RequiresPasswordReset UInt8,
  RefreshTokenVersion UInt32,
  LastAccessAt Nullable(DateTime64(3, 'UTC')),
  CreatedAt DateTime64(3, 'UTC'),
  UpdatedAt DateTime64(3, 'UTC'),
  Version UInt64
)
ENGINE = ReplacingMergeTree(Version)
ORDER BY (UserId)
SETTINGS index_granularity = 8192;

-- Consulta recomendada desde backend o scripts administrativos:
-- SELECT *
-- FROM PortalClientes.PortalClientUsers FINAL
-- ORDER BY UpdatedAt DESC, FullName ASC;

-- Ejemplo de insercion inicial:
-- INSERT INTO PortalClientes.PortalClientUsers FORMAT JSONEachRow
-- {"UserId":"11111111-1111-1111-1111-111111111111","Username":"admin_portal","Email":"admin@cylfruit.cl","FullName":"Administrador Portal","PasswordHash":"scrypt$CAMBIAR$HASH_REAL","RoleKey":"superuser","PreferredLocale":"es","RecipientCode":null,"RecipientName":null,"RecipientGroupCode":null,"CanViewAll":1,"Modules":["Embarques","Pallets","Documentos","Usuarios","Alertas"],"Status":"Activo","TwoFactorEnabled":1,"RequiresPasswordReset":1,"RefreshTokenVersion":1,"LastAccessAt":null,"CreatedAt":"2026-05-25 00:00:00.000","UpdatedAt":"2026-05-25 00:00:00.000","Version":1748131200000}