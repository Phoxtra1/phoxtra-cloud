process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testConsoleHTML() {
    console.log('Fetching console index.html...');
    const res = await fetch('https://localhost/console/project-default-test/functions', {
        headers: { 'Host': 'cloud.phoxtra.com' }
    });
    console.log('HTML Status:', res.status);
    const html = await res.text();
    console.log('HTML snippet:', html.substring(0, 500));
}

testConsoleHTML().catch(console.error);
