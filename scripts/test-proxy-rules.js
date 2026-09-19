process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = process.env.TEST_URL || 'https://localhost';

async function testProxyRules() {
    const email = `proxy_admin_${Date.now()}@phoxtra.com`;
    const password = 'PhoxtraPassword123!';

    await fetch(`${BASE_URL}/v1/account`, {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ userId: 'unique()', email, password, name: 'Proxy Admin' })
    });

    const loginRes = await fetch(`${BASE_URL}/v1/account/sessions/email`, {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ email, password })
    });

    const cookieHeader = loginRes.headers.get('set-cookie');
    const cookies = cookieHeader ? cookieHeader.split(',').map(c => c.split(';')[0]).join('; ') : '';

    const teamRes = await fetch(`${BASE_URL}/v1/teams`, {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console', 'Cookie': cookies },
        body: JSON.stringify({ teamId: 'unique()', name: 'Proxy Team' })
    });
    const teamData = await teamRes.json();

    const projId = `proj-${Date.now()}`;
    await fetch(`${BASE_URL}/v1/projects`, {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console', 'Cookie': cookies },
        body: JSON.stringify({ projectId: projId, name: 'Proxy Test Project', teamId: teamData.$id })
    });

    const headers = {
        'Host': 'cloud.phoxtra.com',
        'X-Appwrite-Project': projId,
        'X-Appwrite-Mode': 'admin',
        'Cookie': cookies
    };

    console.log('\nCreating Function...');
    const funcId = `func-${Date.now()}`;
    const createFuncRes = await fetch(`${BASE_URL}/v1/functions`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            functionId: funcId,
            name: 'Proxy Test Function',
            runtime: 'php-8.3',
            execute: ['any'],
            events: [],
            schedule: '',
            timeout: 15,
            enabled: true
        })
    });
    const funcData = await createFuncRes.json();
    console.log('Created function:', funcData.$id);

    console.log('\nTesting /v1/proxy/rules endpoint...');
    try {
        const res = await fetch(`${BASE_URL}/v1/proxy/rules`, { headers });
        console.log('proxy/rules Status:', res.status);
        console.log('proxy/rules Body:', await res.text());
    } catch (e) {
        console.error('proxy/rules error:', e.message);
    }
}

testProxyRules().catch(console.error);
