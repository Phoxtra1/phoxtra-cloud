process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function debugConsole() {
    // 1. Get all teams for console
    console.log('--- LOGGING IN TO CONSOLE ---');
    // Let's test with the last created admin or register a new one
    const email = 'admin_latest@phoxtra.com';
    const password = 'PhoxtraPassword123!';

    // Register if doesn't exist
    await fetch('https://localhost/v1/account', {
        method: 'POST',
        headers: { 'Host': 'localhost', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ userId: 'admin_latest', email: email, password: password, name: 'Latest Admin' })
    });

    const loginRes = await fetch('https://localhost/v1/account/sessions/email', {
        method: 'POST',
        headers: { 'Host': 'localhost', 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ email: email, password: password })
    });

    const cookieHeader = loginRes.headers.get('set-cookie');
    console.log('Login status:', loginRes.status);
    const cookies = cookieHeader ? cookieHeader.split(',').map(c => c.split(';')[0]).join('; ') : '';

    console.log('\n--- FETCHING TEAMS (ORGANIZATIONS) ---');
    const teamsRes = await fetch('https://localhost/v1/teams', {
        method: 'GET',
        headers: {
            'Host': 'localhost',
            'X-Appwrite-Project': 'console',
            'Cookie': cookies
        }
    });
    console.log('Teams Status:', teamsRes.status);
    const teamsData = await teamsRes.json();
    console.log('Teams Data:', JSON.stringify(teamsData, null, 2));

    console.log('\n--- FETCHING PROJECTS ---');
    const projectsRes = await fetch('https://localhost/v1/projects', {
        method: 'GET',
        headers: {
            'Host': 'localhost',
            'X-Appwrite-Project': 'console',
            'Cookie': cookies
        }
    });
    console.log('Projects Status:', projectsRes.status);
    const projectsData = await projectsRes.json();
    console.log('Projects Data:', JSON.stringify(projectsData, null, 2));

    if (teamsData.teams && teamsData.teams.length > 0) {
        const teamId = teamsData.teams[0].$id;
        console.log(`\n--- FETCHING SINGLE TEAM ${teamId} ---`);
        const singleTeamRes = await fetch(`https://localhost/v1/teams/${teamId}`, {
            method: 'GET',
            headers: {
                'Host': 'localhost',
                'X-Appwrite-Project': 'console',
                'Cookie': cookies
            }
        });
        console.log('Single Team Status:', singleTeamRes.status);
        console.log('Single Team Body:', await singleTeamRes.text());
    }
}

debugConsole().catch(console.error);
