process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const BASE_URL = process.env.TEST_URL || 'https://localhost';

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Host': 'cloud.phoxtra.com',
        'X-Appwrite-Project': 'console',
        ...(options.headers || {})
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });
    const cookieHeader = res.headers.get('set-cookie');
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, headers: res.headers, cookieHeader, data };
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFunctions() {
    console.log('--- STARTING FUNCTION DEPLOYMENT TEST ---');

    console.log('Creating dummy code payload...');
    execSync('mkdir -p code');
    fs.writeFileSync('code/index.js', 'module.exports = async function ({ res, req, log, error }) { return res.json({ success: true, message: "Hello from Executor!" }); };');
    execSync('tar -czvf code.tar.gz -C code .');
    console.log('Dummy code.tar.gz created.');

    console.log('Logging in...');
    let loginRes = await request('/v1/account/sessions/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD })
    });

    if (loginRes.status !== 201 && loginRes.status !== 200) {
        console.error('Login failed!', loginRes.data);
        process.exit(1);
    }
    const cookies = loginRes.cookieHeader ? loginRes.cookieHeader.split(';')[0] : '';
    console.log('Logged in successfully!');

    const projId = `func-test-proj-${Date.now()}`;
    const projRes = await request('/v1/projects', {
        method: 'POST',
        headers: { 'Cookie': cookies, 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projId, name: 'Function Test Project', teamId: 'team-admin' })
    });
    let teamId = 'func-team';
    if (projRes.status !== 201) {
        const teamRes = await request('/v1/teams', {
            method: 'POST',
            headers: { 'Cookie': cookies, 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId, name: 'Function Team' })
        });
        const finalProjRes = await request('/v1/projects', {
            method: 'POST',
            headers: { 'Cookie': cookies, 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: projId, name: 'Function Test Project', teamId: teamRes.data.$id || teamId })
        });
    }

    const headersWithProject = {
        'Cookie': cookies,
        'X-Appwrite-Project': projId,
        'X-Appwrite-Mode': 'admin'
    };

    console.log('Creating Function...');
    const funcId = `func-${Date.now()}`;
    const createFuncRes = await request('/v1/functions', {
        method: 'POST',
        headers: { ...headersWithProject, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            functionId: funcId,
            name: 'Test Node Function',
            runtime: 'node-20.0',
            execute: ['any'],
            events: [],
            schedule: '',
            timeout: 15,
            enabled: true
        })
    });
    if (createFuncRes.status !== 201) {
        console.error('Function creation failed!', createFuncRes.data);
        process.exit(1);
    }
    console.log('Function created:', createFuncRes.data.$id);

    console.log('Creating Deployment...');
    const filePath = path.resolve(__dirname, '../code.tar.gz');
    if (!fs.existsSync(filePath)) {
        console.error('code.tar.gz not found!');
        process.exit(1);
    }

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(filePath)]);
    formData.append('code', fileBlob, 'code.tar.gz');
    formData.append('activate', 'true');
    formData.append('entrypoint', 'index.js');
    formData.append('commands', 'npm install');

    const deployRes = await request(`/v1/functions/${funcId}/deployments`, {
        method: 'POST',
        headers: headersWithProject,
        body: formData
    });

    if (deployRes.status !== 201 && deployRes.status !== 202) {
        console.error('Deployment upload failed!', deployRes.data);
        process.exit(1);
    }
    const deploymentId = deployRes.data.$id;
    console.log(`Deployment created successfully. ID: ${deploymentId}. Waiting for ready status...`);

    let status = deployRes.data.status;
    let attempts = 0;
    while (status === 'processing' || status === 'building') {
        if (attempts > 30) {
            console.error('Deployment timed out waiting for ready status.');
            process.exit(1);
        }
        await sleep(2000);
        attempts++;
        const statusRes = await request(`/v1/functions/${funcId}/deployments/${deploymentId}`, {
            method: 'GET',
            headers: headersWithProject
        });
        status = statusRes.data.status;
        console.log(`Deployment status: ${status}`);
    }

    if (status !== 'ready') {
        console.error(`Deployment failed with status: ${status}`);
        process.exit(1);
    }
    console.log('Deployment is READY!');

    console.log('Triggering Function Execution...');
    const execRes = await request(`/v1/functions/${funcId}/executions`, {
        method: 'POST',
        headers: { ...headersWithProject, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: '',
            async: false
        })
    });

    if (execRes.status !== 201) {
        console.error('Execution failed to trigger!', execRes.data);
        process.exit(1);
    }

    const executionId = execRes.data.$id;
    console.log(`Execution triggered. ID: ${executionId}. Waiting for completion...`);

    let execStatus = execRes.data.status;
    attempts = 0;
    let finalExecData = execRes.data;
    while (execStatus === 'processing' || execStatus === 'waiting') {
        if (attempts > 30) {
            console.error('Execution timed out waiting for completion.');
            process.exit(1);
        }
        await sleep(2000);
        attempts++;
        const checkExecRes = await request(`/v1/functions/${funcId}/executions/${executionId}`, {
            method: 'GET',
            headers: headersWithProject
        });
        execStatus = checkExecRes.data.status;
        finalExecData = checkExecRes.data;
        console.log(`Execution status: ${execStatus}`);
    }

    if (execStatus !== 'completed') {
        console.error(`Execution failed with status: ${execStatus}`, finalExecData);
        process.exit(1);
    }

    console.log('Execution COMPLETED successfully!');
    console.log('Response body:', finalExecData.responseBody);
    console.log('Response statusCode:', finalExecData.responseStatusCode);

    // cleanup
    execSync('rm -rf code code.tar.gz');
}

testFunctions().catch(console.error);
