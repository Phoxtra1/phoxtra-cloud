process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = process.env.TEST_URL || 'https://localhost';

async function testVCS() {
    const email = `vcs_admin_${Date.now()}@phoxtra.com`;
    const password = 'PhoxtraPassword123!';

    await fetch(`${BASE_URL}/v1/account`, {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ userId: 'unique()', email, password, name: 'VCS Admin' })
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
        body: JSON.stringify({ teamId: 'unique()', name: 'VCS Team' })
    });
    const teamData = await teamRes.json();

    const projId = `proj-${Date.now()}`;
    await fetch(`${BASE_URL}/v1/projects`, {
        method: 'POST',
        headers: { 'Host': 'cloud.phoxtra.com', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console', 'Cookie': cookies },
        body: JSON.stringify({ projectId: projId, name: 'VCS Test Project', teamId: teamData.$id })
    });

    const headers = {
        'Host': 'cloud.phoxtra.com',
        'X-Appwrite-Project': projId,
        'X-Appwrite-Mode': 'admin',
        'Cookie': cookies
    };

    console.log('\n--- TESTING VCS INSTALLATIONS ENDPOINT ---');
    const vcsEndpoints = [
        `/v1/vcs/installations`,
        `/v1/vcs/github/installations`,
        `/v1/vcs/repos`,
        `/v1/functions/runtimes`,
        `/v1/functions/specifications?type=builds`,
        `/v1/functions/specifications?type=runtimes`
    ];

    for (const ep of vcsEndpoints) {
        try {
            const res = await fetch(`${BASE_URL}${ep}`, { headers });
            const text = await res.text();
            console.log(`Endpoint: ${ep} | Status: ${res.status} | Body: ${text.substring(0, 200)}`);
        } catch (e) {
            console.error(`Endpoint ${ep} error:`, e.message);
        }
    }
}

testVCS().catch(console.error);
