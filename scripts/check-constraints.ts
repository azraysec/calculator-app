/**
 * Check all constraints and indexes
 */

import { prisma } from '@wig/db';

async function main() {
  console.log('=== CHECKING CONSTRAINTS AND INDEXES ===\n');

  // Check indexes
  console.log('1. Indexes on conversations table:');
  const indexes = await prisma.$queryRaw<any[]>`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'conversations'
    ORDER BY indexname;
  `;

  if (indexes.length > 0) {
    indexes.forEach((idx) => {
      console.log(`   - ${idx.indexname}`);
      console.log(`     ${idx.indexdef}`);
    });
  } else {
    console.log('   No indexes found');
  }

  // Check all unique constraints across all tables
  console.log('\n2. All Unique Constraints:');
  const constraints = await prisma.$queryRaw<any[]>`
    SELECT
      conname as constraint_name,
      conrelid::regclass as table_name,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE contype = 'u'
      AND connamespace = 'public'::regnamespace
    ORDER BY table_name, constraint_name;
  `;

  if (constraints.length > 0) {
    constraints.forEach((c) => {
      console.log(`   - ${c.table_name}.${c.constraint_name}`);
      console.log(`     ${c.definition}`);
    });
  } else {
    console.log('   No unique constraints found');
  }

  // Check edge constraint
  console.log('\n3. Edge Constraints:');
  const edgeConstraints = await prisma.$queryRaw<any[]>`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'edges'
      AND (indexdef LIKE '%UNIQUE%' OR indexdef LIKE '%unique%')
    ORDER BY indexname;
  `;

  if (edgeConstraints.length > 0) {
    edgeConstraints.forEach((idx) => {
      console.log(`   - ${idx.indexname}`);
      console.log(`     ${idx.indexdef}`);
    });
  } else {
    console.log('   No unique indexes on edges');
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
