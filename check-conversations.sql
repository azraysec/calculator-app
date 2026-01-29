-- Check if conversations table has unique constraint
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'conversations';

-- Check if any conversations exist
SELECT COUNT(*) as conversation_count
FROM conversations;

-- Check recent conversations if any
SELECT *
FROM conversations
ORDER BY "createdAt" DESC
LIMIT 5;
