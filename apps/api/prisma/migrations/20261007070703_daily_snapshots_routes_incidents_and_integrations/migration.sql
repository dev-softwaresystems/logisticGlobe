-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "cutAt" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" INTEGER NOT NULL,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePlan" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "shipmentIds" TEXT[],
    "geometry" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringState" (
    "planId" TEXT NOT NULL,
    "lastObservationId" TEXT,
    "lastObservedAt" TIMESTAMP(3),
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringState_pkey" PRIMARY KEY ("planId")
);

-- CreateTable
CREATE TABLE "RouteIncident" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "openingObservationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastObservedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,

    CONSTRAINT "RouteIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteIncidentHistory" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "observationId" TEXT,
    "actorId" TEXT,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteIncidentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationReceipt" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardSnapshot_timeZone_cutAt_key" ON "DashboardSnapshot"("timeZone", "cutAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoutePlan_requestId_key" ON "RoutePlan"("requestId");

-- CreateIndex
CREATE INDEX "RoutePlan_vehicleId_retiredAt_idx" ON "RoutePlan"("vehicleId", "retiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoutePlan_vehicleId_version_key" ON "RoutePlan"("vehicleId", "version");

-- CreateIndex
CREATE INDEX "RouteIncident_resolvedAt_startedAt_idx" ON "RouteIncident"("resolvedAt", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RouteIncident_planId_kind_openingObservationId_key" ON "RouteIncident"("planId", "kind", "openingObservationId");

-- CreateIndex
CREATE INDEX "IntegrationReceipt_source_externalId_version_idx" ON "IntegrationReceipt"("source", "externalId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationReceipt_source_externalId_version_key" ON "IntegrationReceipt"("source", "externalId", "version");

-- AddForeignKey
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringState" ADD CONSTRAINT "MonitoringState_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteIncident" ADD CONSTRAINT "RouteIncident_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteIncidentHistory" ADD CONSTRAINT "RouteIncidentHistory_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "RouteIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
