process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testProjectFeatures() {
    console.log('=== TESTING APPWRITE CONSOLE & PROJECT CREATION ===');

    const email = 'phoxtra_owner@phoxtra.com';
    const password = 'PhoxtraOwnerPassword123!';
    const name = 'Phoxtra Owner';

    // 1. Signup / Login
    await fetch('https://localhost/v1/account', {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ userId: 'phoxtra_owner', email: email, password: password, name: name })
    });

    const loginRes = await fetch('https://localhost/v1/account/sessions/email', {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ email: email, password: password })
    });

    const cookieHeader = loginRes.headers.get('set-cookie');
    const cookies = cookieHeader ? cookieHeader.split(',').map(c => c.split(';')[0]).join('; ') : '';
    console.log('1. Logged in successfully. Cookie:', cookies.substring(0, 30) + '...');

    // 2. Create Organization (Team)
    const teamId = `org-${Date.now()}`;
    const teamRes = await fetch('https://localhost/v1/teams', {
        method: 'POST',
        headers: {
            'Host': 'cloud.phoxtra.com',
            'Content-Type': 'application/json',
            'X-Appwrite-Project': 'console',
            'Cookie': cookies
        },
        body: JSON.stringify({
            teamId: teamId,
            name: 'Phoxtra Main Organization'
        })
    });
    console.log('2. Organization Creation Status:', teamRes.status);
    const teamObj = await teamRes.json();
    console.log('   Organization ID:', teamObj.$id);

    // 3. Create Project
    const projId = `project-${Date.now()}`;
    const projRes = await fetch('https://localhost/v1/projects', {
        method: 'POST',
        headers: {
            'Host': 'cloud.phoxtra.com',
            'Content-Type': 'application/json',
            'X-Appwrite-Project': 'console',
            'Cookie': cookies
        },
        body: JSON.stringify({
            projectId: projId,
            name: 'Phoxtra Cloud Production',
            teamId: teamObj.$id
        })
    });

    console.log('3. Project Creation Status:', projRes.status);
    const projData = await projRes.json();
    console.log('   Project Result:', JSON.stringify(projData, null, 2));

    const realProjId = projData.$id;

    if (projRes.status === 201) {
        console.log(`\nDirect URL to access project in Console UI:`);
        console.log(`https://cloud.phoxtra.com/console/project-${realProjId}`);
        console.log(`https://localhost/console/project-${realProjId}`);
    }

    // 4. Test all Feature APIs for this project using Console Session cookie
    console.log('\n--- VERIFYING ALL CORE FEATURES FOR THIS PROJECT ---');

    // Auth (Users)
    const usersRes = await fetch('https://localhost/v1/users', {
        headers: { 'Host': 'cloud.phoxtra.com', 'X-Appwrite-Project': realProjId, 'X-Appwrite-Mode': 'admin', 'Cookie': cookies }
    });
    console.log('Auth (Users) API Status:', usersRes.status, await usersRes.text());

    // Databases
    const dbRes = await fetch('https://localhost/v1/databases', {
        headers: { 'Host': 'cloud.phoxtra.com', 'X-Appwrite-Project': realProjId, 'X-Appwrite-Mode': 'admin', 'Cookie': cookies }
    });
    console.log('Databases API Status:', dbRes.status, await dbRes.text());

    // Storage (Buckets)
    const storageRes = await fetch('https://localhost/v1/storage/buckets', {
        headers: { 'Host': 'cloud.phoxtra.com', 'X-Appwrite-Project': realProjId, 'X-Appwrite-Mode': 'admin', 'Cookie': cookies }
    });
    console.log('Storage API Status:', storageRes.status, await storageRes.text());

    // Functions
    const funcRes = await fetch('https://localhost/v1/functions', {
        headers: { 'Host': 'cloud.phoxtra.com', 'X-Appwrite-Project': realProjId, 'X-Appwrite-Mode': 'admin', 'Cookie': cookies }
    });
    console.log('Functions API Status:', funcRes.status, await funcRes.text());

    // Messaging (Topics)
    const msgRes = await fetch('https://localhost/v1/messaging/topics', {
        headers: { 'Host': 'cloud.phoxtra.com', 'X-Appwrite-Project': realProjId, 'X-Appwrite-Mode': 'admin', 'Cookie': cookies }
    });
    console.log('Messaging API Status:', msgRes.status, await msgRes.text());
}

testProjectFeatures().catch(console.error);
