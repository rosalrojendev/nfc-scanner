-- CreateEnum
CREATE TYPE "Role" AS ENUM ('inspector', 'admin', 'client');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "AnchorStatus" AS ENUM ('pass', 'due', 'failed');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('pass', 'review', 'failed');

-- CreateEnum
CREATE TYPE "DrawingAttachmentKind" AS ENUM ('plan', 'detail', 'pdf');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("userId","clientId")
);

-- CreateTable
CREATE TABLE "Anchor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "drawing" TEXT NOT NULL,
    "status" "AnchorStatus" NOT NULL,
    "lastTested" TIMESTAMP(3),
    "nextDue" TIMESTAMP(3),
    "inspector" TEXT,
    "proofResult" TEXT,
    "nfcTag" TEXT,
    "qrCode" TEXT,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "inspector" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "result" "InspectionResult" NOT NULL,
    "proofLoad" TEXT NOT NULL DEFAULT '',
    "drawingRef" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signature" TEXT,
    "submittedBy" TEXT,
    "submittedByName" TEXT,
    "submittedByRole" "Role",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "building" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "planUrl" TEXT,
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingPin" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "status" "AnchorStatus" NOT NULL,

    CONSTRAINT "DrawingPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingAttachment" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "kind" "DrawingAttachmentKind" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentType" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "Membership_clientId_idx" ON "Membership"("clientId");

-- CreateIndex
CREATE INDEX "Anchor_projectId_idx" ON "Anchor"("projectId");

-- CreateIndex
CREATE INDEX "Inspection_projectId_idx" ON "Inspection"("projectId");

-- CreateIndex
CREATE INDEX "Inspection_anchorId_idx" ON "Inspection"("anchorId");

-- CreateIndex
CREATE INDEX "Inspection_testDate_idx" ON "Inspection"("testDate");

-- CreateIndex
CREATE INDEX "Drawing_projectId_idx" ON "Drawing"("projectId");

-- CreateIndex
CREATE INDEX "DrawingPin_drawingId_idx" ON "DrawingPin"("drawingId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingPin_drawingId_anchorId_key" ON "DrawingPin"("drawingId", "anchorId");

-- CreateIndex
CREATE INDEX "DrawingAttachment_drawingId_idx" ON "DrawingAttachment"("drawingId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anchor" ADD CONSTRAINT "Anchor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "Anchor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingPin" ADD CONSTRAINT "DrawingPin_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingAttachment" ADD CONSTRAINT "DrawingAttachment_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
