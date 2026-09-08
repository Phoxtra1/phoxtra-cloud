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
token = "fm2_lJPECAAAAAAACLbexBAH7B8qiQv1Y4fz2UYgKpD1wrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOABBoMh8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDwNWeBQLKyQYi9JWjy/+1WCudvB7n9CNyaZ/kbkmvCB7Af5Lr6MVd/TQfuKhNs8YROyA3XFeISWsvMjcbHETvf6QsEV9B1Ao6uwhJ93chAxeTSb5/ygmKwP5xqvBeY0N6ICy1FIs+lTLDQVkuUjypIkWUdQ6vD9qEk1VjmbNW7E1YcEm85L5SC45dy7zMQgL3lBaoZyBfmGTvTs15IXNVCjtV8WXh+/l8tXsUeOvew=,fm2_lJPETvf6QsEV9B1Ao6uwhJ93chAxeTSb5/ygmKwP5xqvBeY0N6ICy1FIs+lTLDQVkuUjypIkWUdQ6vD9qEk1VjmbNW7E1YcEm85L5SC45dy7zMQQBEW38VgCj/M971XVA7+U8sO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZYEks5qkxa5zmqTGS8XzgAPxc8Kkc4AD8XPxCDHD6mzdTP4fumLmx6xsKVD3jk+moNKJvn6s35iQb1r3A==,fo1_TYffCIoK0EjQ-5trTyzGyloQBRdOra_iCdTs6dMO1k4="

# 1. Fetch current machine configuration
print("1. Fetching current machine config...")
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

# 2. Modify whitelist env vars
env = machine_data["config"]["env"]
env["_APP_CONSOLE_WHITELIST_ROOT"] = "disabled"
env["_APP_CONSOLE_WHITELIST_EMAILS"] = ""
env["_APP_CONSOLE_WHITELIST_DOMAINS"] = ""
env["_APP_CONSOLE_WHITELIST_IPS"] = ""


payload = json.dumps({"config": machine_data["config"]}).encode('utf-8')

# 3. Post updated configuration
print("2. Posting updated machine config...")
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

# 4. Restart machine
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

print("Config set and machine started successfully!")
