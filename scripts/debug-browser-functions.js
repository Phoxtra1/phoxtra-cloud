const { spawn } = require('child_process');
const WebSocket = require('ws');

async function debugEdge() {
    console.log('Launching Edge with CDP...');
    const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless',
        '--remote-debugging-port=9222',
        '--ignore-certificate-errors',
        '--no-sandbox',
        'https://localhost/console'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    const targetsRes = await fetch('http://127.0.0.1:9222/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) {
        console.error('No page target found!');
        edge.kill();
        return;
    }

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
        console.log('CDP Connected! Enabling domains...');
        await send('Console.enable');
        await send('Runtime.enable');
        await send('Network.enable');
        await send('Page.enable');

        // First, create a user and log in via Runtime.evaluate fetch in browser context
        console.log('Logging in inside browser...');
        const loginScript = `
            async function setup() {
                const email = "browser_admin_${Date.now()}@phoxtra.com";
                const password = "PhoxtraPassword123!";
                await fetch('/v1/account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
                    body: JSON.stringify({ userId: 'unique()', email, password, name: 'Browser Admin' })
                });
                await fetch('/v1/account/sessions/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
                    body: JSON.stringify({ email, password })
                });
                const teamRes = await fetch('/v1/teams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
                    body: JSON.stringify({ teamId: 'unique()', name: 'Browser Team' })
                });
                const teamData = await teamRes.json();
                const projId = "proj-browser-" + Date.now();
                await fetch('/v1/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
                    body: JSON.stringify({ projectId: projId, name: 'Browser Test Project', teamId: teamData.$id })
                });
                return projId;
            }
            setup();
        `;

        const evalRes = await send('Runtime.evaluate', { expression: loginScript, awaitPromise: true });
        const projId = evalRes.result.value;
        console.log('Created project and logged in! ProjId:', projId);

        // Now navigate to the Functions page in console
        const funcsUrl = `https://localhost/console/project-default-${projId}/functions`;
        console.log('Navigating to:', funcsUrl);
        await send('Page.navigate', { url: funcsUrl });

        await new Promise(r => setTimeout(r, 4000));

        // Evaluate location and page title / DOM elements
        const pageInfoScript = `
            ({
                url: window.location.href,
                title: document.title,
                bodyText: document.body.innerText.substring(0, 500)
            })
        `;
        const infoRes = await send('Runtime.evaluate', { expression: pageInfoScript, returnByValue: true });
        console.log('Page State:', JSON.stringify(infoRes.result.value, null, 2));

        // Let's create a function via UI click or script to test detail page & tabs!
        const createFuncScript = `
            async function createFunc() {
                const funcId = "func-browser-" + Date.now();
                const res = await fetch('/v1/functions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Appwrite-Project': '${projId}',
                        'X-Appwrite-Mode': 'admin'
                    },
                    body: JSON.stringify({
                        functionId: funcId,
                        name: 'Browser Function',
                        runtime: 'php-8.3',
                        execute: ['any'],
                        events: [],
                        schedule: '',
                        timeout: 15,
                        enabled: true
                    })
                });
                return funcId;
            }
            createFunc();
        `;
        const createFuncRes = await send('Runtime.evaluate', { expression: createFuncScript, awaitPromise: true });
        const funcId = createFuncRes.result.value;
        console.log('Created function:', funcId);

        // Navigate to function detail page
        const funcDetailUrl = `https://localhost/console/project-default-${projId}/functions/function-${funcId}`;
        console.log('Navigating to Function Detail Page:', funcDetailUrl);
        await send('Page.navigate', { url: funcDetailUrl });

        await new Promise(r => setTimeout(r, 4000));

        const detailInfoRes = await send('Runtime.evaluate', { expression: pageInfoScript, returnByValue: true });
        console.log('Function Detail Page State:', JSON.stringify(detailInfoRes.result.value, null, 2));

        // Test clicking tabs: executions, domains, settings
        for (const tab of ['executions', 'domains', 'settings']) {
            const tabUrl = `${funcDetailUrl}/${tab}`;
            console.log(`Navigating to Tab (${tab}):`, tabUrl);
            await send('Page.navigate', { url: tabUrl });
            await new Promise(r => setTimeout(r, 3000));
            const tabInfoRes = await send('Runtime.evaluate', { expression: pageInfoScript, returnByValue: true });
            console.log(`Tab (${tab}) State:`, JSON.stringify(tabInfoRes.result.value, null, 2));
        }

        console.log('Finished browser testing!');
        ws.close();
        edge.kill();
    });
}

debugEdge().catch(console.error);
