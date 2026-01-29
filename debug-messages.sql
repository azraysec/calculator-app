-- Check latest LinkedIn upload job
SELECT
  id,
  status,
  progress,
  "createdAt",
  "completedAt",
  error,
  "fileMetadata"->>'fileName' as file_name,
  "resultMetadata"->>'connectionsProcessed' as connections,
  "resultMetadata"->>'messagesProcessed' as messages,
  "resultMetadata"->>'errors' as errors
FROM "ingest_jobs"
WHERE "sourceName" = 'linkedin_archive'
ORDER BY "createdAt" DESC
LIMIT 1;
