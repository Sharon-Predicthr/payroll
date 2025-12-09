const sql = require('mssql');

function parseConnectionString(connectionString) {
  const config = { options: { trustServerCertificate: true } };
  const parts = connectionString.split(';');
  
  for (const part of parts) {
    const [key, value] = part.split('=').map(s => s.trim());
    if (!key || !value) continue;
    
    switch (key.toLowerCase()) {
      case 'server':
        config.server = value;
        break;
      case 'database':
        config.database = value;
        break;
      case 'user id':
      case 'userid':
        config.user = value;
        break;
      case 'password':
        config.password = value;
        break;
      case 'port':
        config.port = parseInt(value);
        break;
    }
  }
  
  return config;
}

async function analyzeRelationships() {
  const connectionString = process.argv[2] || process.env.DB_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('Please provide connection string as argument or DB_CONNECTION_STRING env var');
    process.exit(1);
  }

  const config = parseConnectionString(connectionString);
  console.log(`\n🔗 Analyzing relationships in: ${config.database}\n`);

  try {
    const pool = await sql.connect(config);
    console.log('✅ Connected!\n');

    // Get all foreign key relationships
    const fkResult = await pool.request().query(`
      SELECT 
        OBJECT_SCHEMA_NAME(fk.parent_object_id) AS parent_schema,
        OBJECT_NAME(fk.parent_object_id) AS parent_table,
        COL_NAME(fk.parent_object_id, fkc.parent_column_id) AS parent_column,
        OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS referenced_schema,
        OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
        COL_NAME(fk.referenced_object_id, fkc.referenced_column_id) AS referenced_column,
        fk.name AS constraint_name,
        fk.delete_referential_action_desc AS delete_action,
        fk.update_referential_action_desc AS update_action
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc 
        ON fk.object_id = fkc.constraint_object_id
      ORDER BY parent_schema, parent_table, constraint_name, fkc.constraint_column_id
    `);

    // Group by relationship
    const relationships = {};
    for (const fk of fkResult.recordset) {
      const key = `${fk.parent_schema}.${fk.parent_table} -> ${fk.referenced_schema}.${fk.referenced_table}`;
      if (!relationships[key]) {
        relationships[key] = {
          parent: `${fk.parent_schema}.${fk.parent_table}`,
          referenced: `${fk.referenced_schema}.${fk.referenced_table}`,
          columns: [],
          constraint: fk.constraint_name,
          deleteAction: fk.delete_action,
          updateAction: fk.update_action
        };
      }
      relationships[key].columns.push({
        parent: fk.parent_column,
        referenced: fk.referenced_column
      });
    }

    console.log('📊 FOREIGN KEY RELATIONSHIPS:');
    console.log('='.repeat(100));
    
    if (Object.keys(relationships).length === 0) {
      console.log('  ⚠️  No foreign key relationships found!');
      console.log('  This suggests the database may need relationship constraints.\n');
    } else {
      for (const [key, rel] of Object.entries(relationships)) {
        console.log(`\n🔗 ${rel.parent} → ${rel.referenced}`);
        console.log(`   Constraint: ${rel.constraint}`);
        console.log(`   Columns: ${rel.columns.map(c => `${c.parent} → ${c.referenced}`).join(', ')}`);
        console.log(`   On Delete: ${rel.deleteAction}, On Update: ${rel.updateAction}`);
      }
    }

    // Analyze potential missing relationships
    console.log('\n\n🔍 POTENTIAL MISSING RELATIONSHIPS:');
    console.log('='.repeat(100));
    
    const tablesResult = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    const allTables = tablesResult.recordset.map(t => `${t.TABLE_SCHEMA}.${t.TABLE_NAME}`);
    const potentialFKs = [];

    for (const table of allTables) {
      const [schema, name] = table.split('.');
      const columnsResult = await pool.request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, name)
        .query(`
          SELECT COLUMN_NAME, DATA_TYPE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
        `);

      for (const col of columnsResult.recordset) {
        // Check for common FK patterns
        const colName = col.COLUMN_NAME.toLowerCase();
        
        // Pattern matching for potential FKs
        if (colName.endsWith('_id') || colName.endsWith('_code') || colName.includes('client_id') || colName.includes('employee_id')) {
          // Check if this column might reference another table
          for (const otherTable of allTables) {
            if (otherTable === table) continue;
            const [otherSchema, otherName] = otherTable.split('.');
            
            // Check if other table has a matching PK
            const pkResult = await pool.request()
              .input('schema', sql.NVarChar, otherSchema)
              .input('table', sql.NVarChar, otherName)
              .query(`
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = @schema 
                  AND TABLE_NAME = @table
                  AND CONSTRAINT_NAME IN (
                    SELECT CONSTRAINT_NAME 
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                    WHERE CONSTRAINT_TYPE = 'PRIMARY KEY'
                      AND TABLE_SCHEMA = @schema
                      AND TABLE_NAME = @table
                  )
              `);

            const pkColumns = pkResult.recordset.map(r => r.COLUMN_NAME.toLowerCase());
            
            // Check if column name matches a PK column
            if (pkColumns.some(pk => colName.includes(pk) || pk.includes(colName.replace('_id', '').replace('_code', '')))) {
              const existingFK = Object.values(relationships).find(r => 
                r.parent === table && 
                r.referenced === otherTable &&
                r.columns.some(c => c.parent === col.COLUMN_NAME)
              );
              
              if (!existingFK) {
                potentialFKs.push({
                  from: table,
                  fromColumn: col.COLUMN_NAME,
                  to: otherTable,
                  toColumn: pkColumns[0]
                });
              }
            }
          }
        }
      }
    }

    if (potentialFKs.length > 0) {
      console.log('\n⚠️  Potential missing foreign keys (suggested relationships):\n');
      for (const fk of potentialFKs) {
        console.log(`  • ${fk.from}.${fk.fromColumn} → ${fk.to}.${fk.toColumn}`);
      }
    } else {
      console.log('\n✅ No obvious missing relationships detected.');
    }

    // Generate ER diagram text representation
    console.log('\n\n📐 ENTITY RELATIONSHIP DIAGRAM (Text):');
    console.log('='.repeat(100));
    console.log('\n[Core Entities]\n');
    
    const coreEntities = ['clients', 'employees', 'departments'];
    for (const entity of coreEntities) {
      const table = allTables.find(t => t.includes(entity));
      if (table) {
        const [schema, name] = table.split('.');
        const cols = await pool.request()
          .input('schema', sql.NVarChar, schema)
          .input('table', sql.NVarChar, name)
          .query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
            ORDER BY ORDINAL_POSITION
            LIMIT 10
          `);
        console.log(`${name.toUpperCase()}`);
        console.log('─'.repeat(50));
        for (const col of cols.recordset) {
          const nullable = col.IS_NULLABLE === 'YES' ? '?' : '';
          console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${nullable}`);
        }
        if (cols.recordset.length >= 10) console.log('  ...');
        console.log('');
      }
    }

    // Relationship summary
    console.log('\n[Relationship Summary]\n');
    const relGroups = {};
    for (const rel of Object.values(relationships)) {
      const parentBase = rel.parent.split('.').pop();
      if (!relGroups[parentBase]) relGroups[parentBase] = [];
      relGroups[parentBase].push(rel.referenced.split('.').pop());
    }
    
    for (const [parent, refs] of Object.entries(relGroups)) {
      console.log(`${parent}`);
      for (const ref of refs) {
        console.log(`  └─→ ${ref}`);
      }
      console.log('');
    }

    // Data quality checks
    console.log('\n\n🔎 DATA QUALITY CHECKS:');
    console.log('='.repeat(100));
    
    // Check for orphaned records
    console.log('\nChecking for potential orphaned records...\n');
    
    const orphanChecks = [
      { child: 'dbo.employees', childCol: 'client_id', parent: 'dbo.clients', parentCol: 'client_id' },
      { child: 'dbo.employees', childCol: 'department_number', parent: 'dbo.departments', parentCol: 'department_number' },
      { child: 'dbo.employees', childCol: 'city_code', parent: 'dbo.cities', parentCol: 'city_code' },
      { child: 'dbo.employee_bank_details', childCol: 'client_id', parent: 'dbo.clients', parentCol: 'client_id' },
      { child: 'dbo.employee_bank_details', childCol: 'employee_id', parent: 'dbo.employees', parentCol: 'employee_id' },
    ];

    for (const check of orphanChecks) {
      try {
        const [childSchema, childTable] = check.child.split('.');
        const [parentSchema, parentTable] = check.parent.split('.');
        
        const orphanResult = await pool.request()
          .input('childSchema', sql.NVarChar, childSchema)
          .input('childTable', sql.NVarChar, childTable)
          .input('childCol', sql.NVarChar, check.childCol)
          .input('parentSchema', sql.NVarChar, parentSchema)
          .input('parentTable', sql.NVarChar, parentTable)
          .input('parentCol', sql.NVarChar, check.parentCol)
          .query(`
            SELECT COUNT(*) as orphan_count
            FROM [${childSchema}].[${childTable}] c
            LEFT JOIN [${parentSchema}].[${parentTable}] p 
              ON c.[${check.childCol}] = p.[${check.parentCol}]
            WHERE p.[${check.parentCol}] IS NULL
          `);
        
        const count = orphanResult.recordset[0].orphan_count;
        if (count > 0) {
          console.log(`  ⚠️  ${check.child}.${check.childCol}: ${count} orphaned records (no matching ${check.parent})`);
        } else {
          console.log(`  ✅ ${check.child}.${check.childCol}: No orphaned records`);
        }
      } catch (err) {
        // Skip if tables don't exist or query fails
      }
    }

    await pool.close();
    console.log('\n✅ Analysis completed!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

analyzeRelationships();

