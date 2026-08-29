with open('docker/fly-entrypoint.sh', 'r') as f:
    content = f.read()

content = content.replace("socat TCP4-LISTEN:3306,bind=127.0.0.1,fork,reuseaddr TCP6:[fdaa:18:121c:a7b:c8:7883:d487:2]:3306 &", "socat TCP-LISTEN:3306,fork,reuseaddr TCP:[fdaa:18:121c:a7b:c8:7883:d487:2]:3306 &")
with open('docker/fly-entrypoint.sh', 'w') as f:
    f.write(content)
