/**
 * Supabase to Appwrite 1.9.6 Automated Migration Utility
 * Phoxtra Cloud Platform Infrastructure (Zero Dependency - Native Fetch)
 */

const sdk = require('node-appwrite');

// --- Configuration Settings ---
const CONFIG = {
    // Supabase Credentials
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

    // Appwrite Credentials
    appwriteEndpoint: process.env.APPWRITE_ENDPOINT || 'http://localhost/v1',
    appwriteProjectId: process.env.APPWRITE_PROJECT_ID || 'proj1787375387928',
    appwriteApiKey: process.env.APPWRITE_API_KEY || '',
    appwriteDatabaseId: process.env.APPWRITE_DATABASE_ID || 'default',
};

// Initialize Appwrite SDK Client
const appwriteClient = new sdk.Client();

if (CONFIG.appwriteEndpoint) appwriteClient.setEndpoint(CONFIG.appwriteEndpoint);
if (CONFIG.appwriteProjectId) appwriteClient.setProject(CONFIG.appwriteProjectId);
if (CONFIG.appwriteApiKey) appwriteClient.setKey(CONFIG.appwriteApiKey);

const databases = new sdk.Databases(appwriteClient);

/**
 * Fetch records from a Supabase table via PostgREST API
 */
async function fetchSupabaseTable(tableName) {
    const url = `${CONFIG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${tableName}?select=*`;
    const response = await fetch(url, {
        headers: {
            'apikey': CONFIG.supabaseServiceKey,
            'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase API error (${response.status}): ${text}`);
    }

    return await response.json();
}

/**
 * Migrate a single table into an Appwrite Collection
 */
async function migrateTableToCollection(tableName, records) {
    console.log(`\n========================================`);
    console.log(` Migrating Table: "${tableName}" (${records.length} records)`);
    console.log(`========================================`);

    const collectionId = tableName.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');

    // 1. Ensure Appwrite Database exists
    try {
        await databases.get(CONFIG.appwriteDatabaseId);
    } catch (err) {
        console.log(`Database "${CONFIG.appwriteDatabaseId}" not found. Creating...`);
        await databases.create(CONFIG.appwriteDatabaseId, 'Production Database');
    }

    // 2. Ensure Appwrite Collection exists
    try {
        await databases.getCollection(CONFIG.appwriteDatabaseId, collectionId);
        console.log(`✓ Collection "${collectionId}" exists.`);
    } catch (err) {
        console.log(`Creating Collection "${collectionId}"...`);
        await databases.createCollection(
            CONFIG.appwriteDatabaseId,
            collectionId,
            tableName,
            [sdk.Permission.read(sdk.Role.any()), sdk.Permission.write(sdk.Role.users())]
        );
        console.log(`✓ Collection created (ID: ${collectionId}).`);
    }

    if (!records || records.length === 0) {
        console.log(`No records found for "${tableName}".`);
        return;
    }

    // 3. Introspect sample record to create Appwrite Attributes
    const sampleRecord = records[0];
    const fields = Object.keys(sampleRecord);

    for (const field of fields) {
        if (field === 'id' || field === '$id') continue;

        const sampleVal = sampleRecord[field];
        let appwriteType = 'string';

        if (typeof sampleVal === 'number') {
            appwriteType = Number.isInteger(sampleVal) ? 'integer' : 'float';
        } else if (typeof sampleVal === 'boolean') {
            appwriteType = 'boolean';
        }

        try {
            if (appwriteType === 'integer') {
                await databases.createIntegerAttribute(CONFIG.appwriteDatabaseId, collectionId, field, false);
            } else if (appwriteType === 'float') {
                await databases.createFloatAttribute(CONFIG.appwriteDatabaseId, collectionId, field, false);
            } else if (appwriteType === 'boolean') {
                await databases.createBooleanAttribute(CONFIG.appwriteDatabaseId, collectionId, field, false);
            } else {
                await databases.createStringAttribute(CONFIG.appwriteDatabaseId, collectionId, field, 65535, false);
            }
            console.log(`  + Created attribute "${field}" (${appwriteType})`);
        } catch (attrErr) {
            if (!attrErr.message.includes('already exists')) {
                console.warn(`  ! Attribute "${field}": ${attrErr.message}`);
            }
        }
    }

    console.log(`Waiting 2s for attributes to index...`);
    await new Promise((r) => setTimeout(r, 2000));

    // 4. Batch Migrate Documents
    let migratedCount = 0;
    for (const record of records) {
        const docId = record.id ? String(record.id).replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 36) : sdk.ID.unique();

        const dataPayload = {};
        for (const field of fields) {
            if (field === 'id' || field === '$id') continue;
            let val = record[field];
            if (typeof val === 'object' && val !== null) {
                val = JSON.stringify(val);
            }
            dataPayload[field] = val;
        }

        try {
            await databases.createDocument(
                CONFIG.appwriteDatabaseId,
                collectionId,
                docId,
                dataPayload
            );
            migratedCount++;
        } catch (docErr) {
            if (docErr.message.includes('already exists')) {
                try {
                    await databases.updateDocument(
                        CONFIG.appwriteDatabaseId,
                        collectionId,
                        docId,
                        dataPayload
                    );
                    migratedCount++;
                } catch (updateErr) {
                    console.error(` Failed updating doc "${docId}":`, updateErr.message);
                }
            } else {
                console.error(` Failed migrating doc "${docId}":`, docErr.message);
            }
        }
    }

    console.log(`✓ Migration for "${tableName}" complete! (${migratedCount}/${records.length} records transferred)`);
}

/**
 * Main Entrypoint
 */
async function runMigration() {
    console.log(`\n=====================================================================`);
    console.log(` SUPABASE -> APPWRITE 1.9.6 AUTOMATED MIGRATION UTILITY`);
    console.log(`=====================================================================`);

    if (!CONFIG.supabaseUrl || CONFIG.supabaseUrl.includes('your-project') || !CONFIG.supabaseServiceKey) {
        console.log(`
USAGE INSTRUCTIONS:
To run live data migration from your Supabase project into Appwrite Console:

1. Set your Supabase & Appwrite details as environment variables:
   $env:SUPABASE_URL="https://<your-project-id>.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="<your-supabase-service-role-key>"
   $env:APPWRITE_ENDPOINT="https://phoxtra-cloud.fly.dev/v1" (or http://localhost/v1)
   $env:APPWRITE_PROJECT_ID="<your-appwrite-project-id>"
   $env:APPWRITE_API_KEY="<your-appwrite-api-key>"

2. Run the migration script:
   node scripts/supabase-to-appwrite.js [table_name_1] [table_name_2] ...

Example:
   node scripts/supabase-to-appwrite.js users profiles transactions lessons
=====================================================================
        `);
        return;
    }

    const tableNames = process.argv.slice(2);
    if (tableNames.length === 0) {
        console.log(`Please specify one or more Supabase table names to migrate.`);
        console.log(`Example: node scripts/supabase-to-appwrite.js users books lessons`);
        return;
    }

    for (const table of tableNames) {
        try {
            console.log(`Fetching table "${table}" from Supabase...`);
            const records = await fetchSupabaseTable(table);
            await migrateTableToCollection(table, records);
        } catch (err) {
            console.error(`Failed to migrate table "${table}":`, err.message);
        }
    }
}

if (require.main === module) {
    runMigration().catch(console.error);
}

module.exports = { fetchSupabaseTable, migrateTableToCollection };
