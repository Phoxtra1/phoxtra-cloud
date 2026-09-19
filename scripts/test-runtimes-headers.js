process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testRuntimesHeaders() {
    const urls = [
        { name: 'No project header', headers: {} },
        { name: 'Console project header', headers: { 'X-Appwrite-Project': 'console' } },
        { name: 'Custom project header', headers: { 'X-Appwrite-Project': 'proj-1789802195224' } },
        { name: 'Console mode admin', headers: { 'X-Appwrite-Project': 'proj-1789802195224', 'X-Appwrite-Mode': 'admin' } },
    ];

    for (const u of urls) {
        const res = await fetch('https://localhost/v1/functions/runtimes', {
            headers: {
                'Host': 'localhost',
                ...u.headers
            }
        });
        console.log(`${u.name} | Status: ${res.status} | Body: ${(await res.text()).substring(0, 150)}`);
    }
}

testRuntimesHeaders().catch(console.error);
