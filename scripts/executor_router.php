<?php
header('Content-Type: application/json');

$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$body = file_get_contents('php://input');

// Log incoming request
@file_put_contents('/tmp/executor.log', date('c') . " [$method] $uri\nBODY: $body\n---\n", FILE_APPEND);

if (str_contains($uri, '/health')) {
    echo json_encode(['status' => 'online', 'version' => '0.29.0']);
    exit;
}

// Build runtime request
if ($method === 'POST' && (str_contains($uri, '/runtimes') || str_contains($uri, '/builds')) && !str_contains($uri, '/executions') && !str_contains($uri, '/execution')) {
    echo json_encode([
        'status' => 'ready',
        'path' => '/tmp/build.tar.gz',
        'size' => 1024,
        'output' => '[appwrite] Deployment finished.'
    ]);
    exit;
}

// Execution request
if ($method === 'POST' && (str_contains($uri, '/execution') || str_contains($uri, '/executions'))) {
    echo json_encode([
        'status' => 'completed',
        'statusCode' => 200,
        'response' => '{"success":true,"message":"Hello from Phoxtra Cloud Function!"}',
        'output' => '{"success":true,"message":"Hello from Phoxtra Cloud Function!"}',
        'stdout' => 'Function execution completed successfully',
        'stderr' => '',
        'logs' => 'Function execution completed successfully',
        'errors' => '',
        'duration' => 0.05
    ]);
    exit;
}

// Delete runtime or default response
echo json_encode(['status' => 'success']);
