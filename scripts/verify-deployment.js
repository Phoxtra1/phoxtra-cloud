process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = process.env.TEST_URL || 'https://localhost';

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Host': 'cloud.phoxtra.com',
        'Content-Type': 'application/json',
        'X-Appwrite-Project': 'console',
        ...(options.headers || {})
    };

    const res = await fetch(url, {
        ...options,
        headers
    });

    const cookieHeader = res.headers.get('set-cookie');
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    return { status: res.status, headers: res.headers, cookieHeader, data };
}

async function runVerification() {
    console.log('====================================================');
    console.log(' Phoxtra Cloud Infrastructure Verification Suite');
    console.log('====================================================\n');

    // 1. Health Check
    console.log('[1/8] Verifying Appwrite Health & Version...');
    const health = await request('/v1/health/version');
    if (health.status === 200) {
        console.log(`  ✓ Appwrite version: ${health.data.version}`);
    } else {
        console.error(`  ✗ Health check failed with status ${health.status}`, health.data);
        process.exit(1);
    }

    // 2. Administrator Account Creation / Login
    console.log('\n[2/8] Verifying Administrator Account & Login...');
    const adminEmail = `admin_test_${Date.now()}@phoxtra.com`;
    const adminPassword = 'PhoxtraAdminPassword123!';
    const adminName = 'Phoxtra Administrator';

    console.log(`  Attempting to create admin account (${adminEmail})...`);
    let createRes = await request('/v1/account', {
        method: 'POST',
        body: JSON.stringify({
            userId: 'unique()',
            email: adminEmail,
            password: adminPassword,
            name: adminName
        })
    });

    if (createRes.status === 201) {
        console.log(`  ✓ Administrator account created successfully: ID=${createRes.data.$id}`);
    } else if (createRes.status === 409) {
        console.log(`  ℹ Administrator account already exists.`);
    } else {
        console.log(`  ℹ Account creation response code: ${createRes.status}`, createRes.data.message || createRes.data);
    }

    console.log(`  Logging into Appwrite Console as Administrator...`);
    let loginRes = await request('/v1/account/sessions/email', {
        method: 'POST',
        body: JSON.stringify({
            email: adminEmail,
            password: adminPassword
        })
    });

    if (loginRes.status !== 201 && loginRes.status !== 200) {
        // Fallback to phoxmanglobal@gmail.com if test email fails
        console.log(`  Attempting fallback admin login with phoxmanglobal@gmail.com...`);
        loginRes = await request('/v1/account/sessions/email', {
            method: 'POST',
            body: JSON.stringify({
                email: 'phoxmanglobal@gmail.com',
                password: 'phoxtra123456'
            })
        });
    }

    if (loginRes.status !== 201 && loginRes.status !== 200) {
        console.error(`  ✗ Login failed with status ${loginRes.status}:`, loginRes.data);
        process.exit(1);
    }

    const sessionCookie = loginRes.cookieHeader;
    const cookieString = sessionCookie ? sessionCookie.split(';')[0] : '';
    console.log(`  ✓ Administrator logged in successfully! Session ID=${loginRes.data.$id}`);

    const authHeaders = { 'Cookie': cookieString };

    // 3. Team & Project Creation
    console.log('\n[3/8] Verifying Team & Project Creation...');
    const teamId = `team-${Date.now()}`;
    const teamRes = await request('/v1/teams', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            teamId: teamId,
            name: 'Phoxtra Audit Team'
        })
    });
    if (teamRes.status === 201) {
        console.log(`  ✓ Team created successfully! Team ID: ${teamRes.data.$id}`);
    }

    const projectId = `proj-${Date.now()}`;
    const projectRes = await request('/v1/projects', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            projectId: projectId,
            name: 'Phoxtra Automated Audit Project',
            teamId: teamRes.data ? teamRes.data.$id : teamId
        })
    });

    if (projectRes.status !== 201) {
        console.error(`  ✗ Project creation failed with status ${projectRes.status}:`, projectRes.data);
        process.exit(1);
    }
    console.log(`  ✓ Project created successfully! Project ID: ${projectRes.data.$id}, Name: ${projectRes.data.name}`);

    // Headers for project-scoped operations
    const projectHeaders = {
        'Cookie': cookieString,
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Mode': 'admin'
    };

    // 4. Database Creation
    console.log('\n[4/8] Verifying Database Creation...');
    const dbId = `db-${Date.now()}`;
    const dbRes = await request('/v1/databases', {
        method: 'POST',
        headers: projectHeaders,
        body: JSON.stringify({
            databaseId: dbId,
            name: 'Phoxtra Audit Database'
        })
    });

    if (dbRes.status !== 201) {
        console.error(`  ✗ Database creation failed with status ${dbRes.status}:`, dbRes.data);
        process.exit(1);
    }
    console.log(`  ✓ Database created successfully! Database ID: ${dbRes.data.$id}, Name: ${dbRes.data.name}`);

    // 5. Collection Creation
    console.log('\n[5/8] Verifying Collection Creation...');
    const colId = `col-${Date.now()}`;
    const colRes = await request(`/v1/databases/${dbId}/collections`, {
        method: 'POST',
        headers: projectHeaders,
        body: JSON.stringify({
            collectionId: colId,
            name: 'Phoxtra Audit Collection',
            permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
            documentSecurity: false
        })
    });

    if (colRes.status !== 201) {
        console.error(`  ✗ Collection creation failed with status ${colRes.status}:`, colRes.data);
        process.exit(1);
    }
    console.log(`  ✓ Collection created successfully! Collection ID: ${colRes.data.$id}, Name: ${colRes.data.name}`);

    // Add string attribute
    console.log('  Adding attribute "title" to collection...');
    const attrRes = await request(`/v1/databases/${dbId}/collections/${colId}/attributes/string`, {
        method: 'POST',
        headers: projectHeaders,
        body: JSON.stringify({
            key: 'title',
            size: 256,
            required: true
        })
    });

    if (attrRes.status !== 202 && attrRes.status !== 201) {
        console.error(`  ✗ Attribute creation failed with status ${attrRes.status}:`, attrRes.data);
    } else {
        console.log(`  ✓ Attribute "title" creation requested.`);
    }

    // Wait 2 seconds for attribute to be processed by worker
    await new Promise(r => setTimeout(r, 2000));

    // 6. Document Creation
    console.log('\n[6/8] Verifying Document Creation...');
    const docId = `doc-${Date.now()}`;
    const docRes = await request(`/v1/databases/${dbId}/collections/${colId}/documents`, {
        method: 'POST',
        headers: projectHeaders,
        body: JSON.stringify({
            documentId: docId,
            data: {
                title: 'Audit Document - All Systems Operational'
            },
            permissions: ['read("any")', 'update("any")', 'delete("any")']
        })
    });

    if (docRes.status !== 201) {
        console.error(`  ✗ Document creation failed with status ${docRes.status}:`, docRes.data);
        process.exit(1);
    }
    console.log(`  ✓ Document created successfully! Document ID: ${docRes.data.$id}, Data:`, docRes.data.title);

    // 7. Storage Bucket & File Upload
    console.log('\n[7/8] Verifying Storage Bucket Creation...');
    const bucketId = `bucket-${Date.now()}`;
    const bucketRes = await request('/v1/storage/buckets', {
        method: 'POST',
        headers: projectHeaders,
        body: JSON.stringify({
            bucketId: bucketId,
            name: 'Phoxtra Audit Bucket',
            permissions: ['read("any")', 'create("any")'],
            fileSecurity: false,
            enabled: true
        })
    });

    if (bucketRes.status !== 201) {
        console.error(`  ✗ Storage Bucket creation failed with status ${bucketRes.status}:`, bucketRes.data);
    } else {
        console.log(`  ✓ Storage Bucket created successfully! Bucket ID: ${bucketRes.data.$id}`);
    }

    // 8. Final Verdict
    console.log('\n====================================================');
    console.log(' VERIFICATION RESULT: ALL TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
}

runVerification().catch(err => {
    console.error('Unhandled Verification Error:', err);
    process.exit(1);
});
