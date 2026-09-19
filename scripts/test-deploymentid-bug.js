process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testDeploymentBug() {
    console.log('1. Logging in as admin...');
    const email = `admin_${Date.now()}@phoxtra.com`;
    const password = 'PhoxtraPassword123!';

    await fetch('https://localhost/v1/account', {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ userId: 'unique()', email, password, name: 'Admin Test' })
    });

    const loginRes = await fetch('https://localhost/v1/account/sessions/email', {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ email, password })
    });

    const cookieHeader = loginRes.headers.get('set-cookie');
    const cookies = cookieHeader ? cookieHeader.split(',').map(c => c.split(';')[0]).join('; ') : '';

    const teamRes = await fetch('https://localhost/v1/teams', {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console', 'Cookie': cookies },
        body: JSON.stringify({ teamId: 'unique()', name: 'Test Team' })
    });
    const team = await teamRes.json();

    const projId = `proj-test-${Date.now()}`;
    await fetch('https://localhost/v1/projects', {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console', 'Cookie': cookies },
        body: JSON.stringify({ projectId: projId, name: 'Test Project', teamId: team.$id })
    });

    const headers = {
        'Host': 'cloud.phoxtra.com',
        'X-Appwrite-Project': projId,
        'Cookie': cookies
    };

    // Create a new function WITHOUT a deployment
    const funcId = `func-nodeploy-${Date.now()}`;
    console.log('\n2. Creating function without deployment:', funcId);
    const createRes = await fetch('https://localhost/v1/functions', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            functionId: funcId,
            name: 'No Deploy Function',
            runtime: 'php-8.3',
            execute: ['any']
        })
    });
    const funcData = await createRes.json();
    console.log('Created Function:', funcData.$id, 'deploymentId:', funcData.deploymentId);

    // Now test what the Console load function does:
    // listRules with query containing funcData.deploymentId
    console.log('\n3. Executing Console proxy.listRules query...');
    const queryStr = JSON.stringify({
        method: 'equal',
        attribute: 'deploymentId',
        values: [funcData.deploymentId]
    });
    const rulesUrl = `https://localhost/v1/proxy/rules?queries%5B0%5D=${encodeURIComponent(queryStr)}`;
    console.log('Fetch URL:', rulesUrl);
    
    const rulesRes = await fetch(rulesUrl, { headers });
    console.log('Rules Response Status:', rulesRes.status);
    const rulesText = await rulesRes.text();
    console.log('Rules Response Body:', rulesText);
}

testDeploymentBug().catch(console.error);
