const { spawn } = require('child_process');
const WebSocket = require('ws');

async function testBrowserSession() {
    console.log('1. Logging in via HTTP API to get session cookie...');
    const email = `session_user_${Date.now()}@phoxtra.com`;
    const password = 'PhoxtraPassword123!';

    // Register account
    const regRes = await fetch('https://localhost/v1/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ userId: 'unique()', email, password, name: 'Session User' })
    });
    console.log('Register status:', regRes.status);

    // Login session
    const loginRes = await fetch('https://localhost/v1/account/sessions/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
        body: JSON.stringify({ email, password })
    });
    console.log('Login status:', loginRes.status);

    // Get set-cookie header
    const setCookie = loginRes.headers.get('set-cookie');
    console.log('Set-Cookie raw:', setCookie);

    // Parse session secret / cookie
    let cookieValue = '';
    if (setCookie) {
        const match = setCookie.match(/a_session_console=([^;]+)/);
        if (match) cookieValue = match[1];
    }
    console.log('Session Cookie Value:', cookieValue ? cookieValue.substring(0, 20) + '...' : 'NONE');

    // Create team & project
    const teamRes = await fetch('https://localhost/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console', 'Cookie': `a_session_console=${cookieValue}` },
        body: JSON.stringify({ teamId: 'unique()', name: 'Session Team' })
    });
    const teamData = await teamRes.json();
    console.log('Team ID:', teamData.$id);

    const projId = 'proj-sess-' + Date.now();
    const projRes = await fetch('https://localhost/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console', 'Cookie': `a_session_console=${cookieValue}` },
        body: JSON.stringify({ projectId: projId, name: 'Session Test Project', teamId: teamData.$id })
    });
    console.log('Project create status:', projRes.status, 'projId:', projId);

    // Create a function in this project
    const funcId = 'func-sess-' + Date.now();
    const funcRes = await fetch('https://localhost/v1/functions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': projId,
            'X-Appwrite-Mode': 'admin',
            'Cookie': `a_session_console=${cookieValue}`
        },
        body: JSON.stringify({
            functionId: funcId,
            name: 'Session Function',
            runtime: 'php-8.3',
            execute: ['any'],
            events: [],
            schedule: '',
            timeout: 15,
            enabled: true
        })
    });
    console.log('Function create status:', funcRes.status, 'funcId:', funcId);

    // Launch Edge via CDP
    console.log('Launching Edge with CDP...');
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless',
        '--remote-debugging-port=9223',
        '--ignore-certificate-errors',
        '--no-sandbox',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    const targetsRes = await fetch('http://127.0.0.1:9223/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();

    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id && pending.has(msg.id)) {
            const { resolve } = pending.get(msg.id);
            pending.delete(msg.id);
            resolve(msg.result);
        }

        if (msg.method === 'Console.messageAdded') {
            console.log('[BROWSER CONSOLE]', msg.params.message.level, msg.params.message.text);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
            const args = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ');
            console.log(`[BROWSER LOG (${msg.params.type})]`, args);
        } else if (msg.method === 'Runtime.exceptionThrown') {
            console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
        } else if (msg.method === 'Network.responseReceived') {
            const res = msg.params.response;
            if (res.status >= 400) {
                console.log(`[NETWORK FAIL ${res.status}] ${res.url}`);
            }
        }
    });

    ws.on('open', async () => {
        console.log('CDP Connected!');
        await send('Console.enable');
        await send('Runtime.enable');
        await send('Network.enable');
        await send('Page.enable');

        // Set session cookie in browser
        await send('Network.setCookie', {
            name: 'a_session_console',
            value: cookieValue,
            domain: 'localhost',
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: 'Lax'
        });
        console.log('Set Cookie in Edge successfully!');

        const evalPageScript = `
            ({
                url: window.location.href,
                title: document.title,
                bodySnippet: document.body ? document.body.innerText.substring(0, 400) : ''
            })
        `;

        // Test 1: Functions list page
        const funcsUrl = `https://localhost/console/project-default-${projId}/functions`;
        console.log('\n--- NAVIGATING TO FUNCTIONS LIST PAGE ---');
        console.log('URL:', funcsUrl);
        await send('Page.navigate', { url: funcsUrl });
        await new Promise(r => setTimeout(r, 4000));
        let infoRes = await send('Runtime.evaluate', { expression: evalPageScript, returnByValue: true });
        console.log('Functions List Page State:', JSON.stringify(infoRes.result.value, null, 2));

        // Test 2: Function Detail Page
        const funcDetailUrl = `https://localhost/console/project-default-${projId}/functions/function-${funcId}`;
        console.log('\n--- NAVIGATING TO FUNCTION DETAIL PAGE ---');
        console.log('URL:', funcDetailUrl);
        await send('Page.navigate', { url: funcDetailUrl });
        await new Promise(r => setTimeout(r, 4000));
        infoRes = await send('Runtime.evaluate', { expression: evalPageScript, returnByValue: true });
        console.log('Function Detail Page State:', JSON.stringify(infoRes.result.value, null, 2));

        // Test 3: Sub-tabs: executions, domains, settings
        for (const tab of ['executions', 'domains', 'settings']) {
            const tabUrl = `${funcDetailUrl}/${tab}`;
            console.log(`\n--- NAVIGATING TO TAB: ${tab} ---`);
            console.log('URL:', tabUrl);
            await send('Page.navigate', { url: tabUrl });
            await new Promise(r => setTimeout(r, 3000));
            infoRes = await send('Runtime.evaluate', { expression: evalPageScript, returnByValue: true });
            console.log(`Tab (${tab}) State:`, JSON.stringify(infoRes.result.value, null, 2));
        }

        console.log('\nBrowser test complete!');
        ws.close();
        edge.kill();
    });
}

// Disable TLS check for fetch in node
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
testBrowserSession().catch(console.error);
