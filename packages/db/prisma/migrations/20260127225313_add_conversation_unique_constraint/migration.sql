-- CreateIndex
CREATE UNIQUE INDEX "conversations_sourceName_externalId_key" ON "conversations"("sourceName", "externalId");
