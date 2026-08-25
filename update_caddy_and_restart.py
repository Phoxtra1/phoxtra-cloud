import socket
old_getaddrinfo = socket.getaddrinfo
def new_getaddrinfo(*args, **kwargs):
    responses = old_getaddrinfo(*args, **kwargs)
    return [r for r in responses if r[0] == socket.AF_INET]
socket.getaddrinfo = new_getaddrinfo

import urllib.request
import ssl
import json
import time

context = ssl._create_unverified_context()
token = "FlyV1 fm2_lJPECAAAAAAACLbexBAGoYYmm4BfJvlXVn/5BWQrwrVodHRwczovL2FwaS5mbHkuaW8vdjGWAJLOABBoMh8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDy6Ge7NZgap/u9nGVx3086mMno8thKumBwaqllxgl66S3Djv2H46EmzrC215JKct7z02Fe4RoG8ptRYT/LETrrgCptmETdwssh9VTDYP4N+zrScLOnyg6YvSB73L1NFmWi1Z27KIabgu4+sK352G7c7Ci7aoyDiuXnc3jANgAc/0ctCTnMyj/MImQSfrA2SlAORgc4A61nTHwWRgqdidWlsZGVyH6J3Zx8BxCDCS2+oc/tajRFEl+dmai+HAOlvtO5I2m8jzVLbfmO20A==,fm2_lJPETrrgCptmETdwssh9VTDYP4N+zrScLOnyg6YvSB73L1NFmWi1Z27KIabgu4+sK352G7c7Ci7aoyDiuXnc3jANgAc/0ctCTnMyj/MImQSfrMQQ7xqOWeBuGyDjdwztW0vsssO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5qjDj0zpAkPxIXzgAPxc8Kkc4AD8XPDMQQKFmyUpRYXgByH3WsU8OW9sQg7+3ah3w+ere7VA/t02UZ4uyyNY5pHyZLjuVXT9Kgbj4="

# 1. Fetch current machine configuration
print("1. Fetching machine config...")
req_get = urllib.request.Request(
    "https://api.machines.dev/v1/apps/phoxtra-cloud/machines/849303a2743648",
    headers={"Authorization": f"Bearer {token}"}
)

machine_data = None
for i in range(5):
    try:
        with urllib.request.urlopen(req_get, context=context) as res:
            machine_data = json.loads(res.read().decode())
            break
    except Exception as e:
        print(f"Fetch error: {e}")
        time.sleep(2)

if not machine_data:
    print("Failed to fetch machine config.")
    exit(1)

# 2. Update whitelist
env = machine_data["config"]["env"]
env["_APP_CONSOLE_WHITELIST_ROOT"] = "enabled"
env["_APP_CONSOLE_WHITELIST_EMAILS"] = "phoxmanglobal@gmail.com,admin.phoxtra@gmail.com,admin@phoxtra.com"
env["_APP_CONSOLE_WHITELIST_DOMAINS"] = "gmail.com,phoxtra.com"
env["_APP_CONSOLE_WHITELIST_IPS"] = ""

payload = json.dumps({"config": machine_data["config"]}).encode('utf-8')

print("2. Updating machine configuration on Fly.io...")
req_post = urllib.request.Request(
    "https://api.machines.dev/v1/apps/phoxtra-cloud/machines/849303a2743648",
    data=payload,
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    method="POST"
)

for i in range(5):
    try:
        with urllib.request.urlopen(req_post, context=context) as res:
            print("UPDATE STATUS:", res.status)
            break
    except Exception as e:
        print(f"Update error: {e}")
        time.sleep(2)

# 3. Start/Restart machine
print("3. Starting machine...")
req_start = urllib.request.Request(
    "https://api.machines.dev/v1/apps/phoxtra-cloud/machines/849303a2743648/start",
    headers={"Authorization": f"Bearer {token}"},
    method="POST"
)

for i in range(5):
    try:
        with urllib.request.urlopen(req_start, context=context) as res:
            print("START STATUS:", res.status)
            break
    except Exception as e:
        print(f"Start error: {e}")
        time.sleep(2)

print("Machine update complete!")
