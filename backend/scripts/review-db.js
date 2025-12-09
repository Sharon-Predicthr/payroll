const sql = require('mssql');

// Parse connection string
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

async function reviewDatabase() {
  const connectionString = process.argv[2] || process.env.DB_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('Please provide connection string as argument or DB_CONNECTION_STRING env var');
    process.exit(1);
  }

  const config = parseConnectionString(connectionString);
  console.log(`\n🔍 Connecting to database: ${config.database} on ${config.server}\n`);

  try {
    const pool = await sql.connect(config);
    console.log('✅ Connected successfully!\n');

    // Get all tables
    console.log('📊 TABLES:');
    console.log('='.repeat(80));
    const tablesResult = await pool.request().query(`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = t.TABLE_SCHEMA AND TABLE_NAME = t.TABLE_NAME) as COLUMN_COUNT
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    const tables = [];
    for (const table of tablesResult.recordset) {
      const fullName = `${table.TABLE_SCHEMA}.${table.TABLE_NAME}`;
      tables.push(fullName);
      console.log(`  • ${fullName} (${table.COLUMN_COUNT} columns)`);
    }

    console.log(`\n📋 Total tables: ${tables.length}\n`);

    // Get detailed column information for each table
    console.log('\n📝 TABLE DETAILS:');
    console.log('='.repeat(80));
    
    for (const table of tables) {
      const [schema, name] = table.split('.');
      console.log(`\n📌 ${table}`);
      console.log('-'.repeat(80));
      
      const columnsResult = await pool.request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, name)
        .query(`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            ORDINAL_POSITION
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
          ORDER BY ORDINAL_POSITION
        `);

      for (const col of columnsResult.recordset) {
        const length = col.CHARACTER_MAXIMUM_LENGTH 
          ? `(${col.CHARACTER_MAXIMUM_LENGTH})` 
          : '';
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
        console.log(`  ${col.ORDINAL_POSITION.toString().padStart(2)}. ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE}${length} ${nullable}${defaultVal}`);
      }

      // Get primary keys
      const pkResult = await pool.request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, name)
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
          ORDER BY ORDINAL_POSITION
        `);

      if (pkResult.recordset.length > 0) {
        const pkColumns = pkResult.recordset.map(r => r.COLUMN_NAME).join(', ');
        console.log(`  🔑 Primary Key: ${pkColumns}`);
      }

      // Get foreign keys
      const fkResult = await pool.request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, name)
        .query(`
          SELECT 
            fk.CONSTRAINT_NAME,
            fk.COLUMN_NAME,
            pk.TABLE_SCHEMA AS REFERENCED_SCHEMA,
            pk.TABLE_NAME AS REFERENCED_TABLE,
            pk.COLUMN_NAME AS REFERENCED_COLUMN
          FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk
            ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
            AND rc.CONSTRAINT_SCHEMA = fk.CONSTRAINT_SCHEMA
          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk
            ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
            AND rc.UNIQUE_CONSTRAINT_SCHEMA = pk.CONSTRAINT_SCHEMA
          WHERE fk.TABLE_SCHEMA = @schema AND fk.TABLE_NAME = @table
        `);

      if (fkResult.recordset.length > 0) {
        console.log(`  🔗 Foreign Keys:`);
        for (const fk of fkResult.recordset) {
          console.log(`     ${fk.COLUMN_NAME} → ${fk.REFERENCED_SCHEMA}.${fk.REFERENCED_TABLE}.${fk.REFERENCED_COLUMN}`);
        }
      }

      // Get indexes
      const indexResult = await pool.request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, name)
        .query(`
          SELECT 
            i.name AS INDEX_NAME,
            i.is_unique,
            i.is_primary_key,
            STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS COLUMNS
          FROM sys.indexes i
          INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
          INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
          INNER JOIN sys.tables t ON i.object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          WHERE s.name = @schema AND t.name = @table AND i.name IS NOT NULL
          GROUP BY i.name, i.is_unique, i.is_primary_key
          ORDER BY i.is_primary_key DESC, i.name
        `);

      if (indexResult.recordset.length > 0) {
        console.log(`  📇 Indexes:`);
        for (const idx of indexResult.recordset) {
          const type = idx.is_primary_key ? 'PRIMARY KEY' : idx.is_unique ? 'UNIQUE' : 'INDEX';
          console.log(`     ${idx.INDEX_NAME} (${type}): ${idx.COLUMNS}`);
        }
      }
    }

    // Get views
    console.log('\n\n👁️  VIEWS:');
    console.log('='.repeat(80));
    const viewsResult = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.VIEWS
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    if (viewsResult.recordset.length > 0) {
      for (const view of viewsResult.recordset) {
        console.log(`  • ${view.TABLE_SCHEMA}.${view.TABLE_NAME}`);
      }
    } else {
      console.log('  (No views found)');
    }

    // Get stored procedures
    console.log('\n\n⚙️  STORED PROCEDURES:');
    console.log('='.repeat(80));
    const spResult = await pool.request().query(`
      SELECT 
        ROUTINE_SCHEMA,
        ROUTINE_NAME,
        CREATED,
        LAST_ALTERED
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME
    `);

    if (spResult.recordset.length > 0) {
      for (const sp of spResult.recordset) {
        console.log(`  • ${sp.ROUTINE_SCHEMA}.${sp.ROUTINE_NAME} (Created: ${sp.CREATED}, Modified: ${sp.LAST_ALTERED})`);
      }
    } else {
      console.log('  (No stored procedures found)');
    }

    // Get functions
    console.log('\n\n🔧 FUNCTIONS:');
    console.log('='.repeat(80));
    const funcResult = await pool.request().query(`
      SELECT 
        ROUTINE_SCHEMA,
        ROUTINE_NAME,
        DATA_TYPE AS RETURN_TYPE
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'FUNCTION'
      ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME
    `);

    if (funcResult.recordset.length > 0) {
      for (const func of funcResult.recordset) {
        console.log(`  • ${func.ROUTINE_SCHEMA}.${func.ROUTINE_NAME} → ${func.RETURN_TYPE}`);
      }
    } else {
      console.log('  (No functions found)');
    }

    // Get row counts for each table
    console.log('\n\n📈 TABLE ROW COUNTS:');
    console.log('='.repeat(80));
    for (const table of tables) {
      const [schema, name] = table.split('.');
      try {
        const countResult = await pool.request()
          .query(`SELECT COUNT(*) as row_count FROM [${schema}].[${name}]`);
        const count = countResult.recordset[0].row_count;
        console.log(`  ${table.padEnd(50)} ${count.toLocaleString().padStart(10)} rows`);
      } catch (err) {
        console.log(`  ${table.padEnd(50)} (error: ${err.message})`);
      }
    }

    await pool.close();
    console.log('\n✅ Review completed!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

reviewDatabase();

