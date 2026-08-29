import urllib.request
import ssl
import json
import time

context = ssl._create_unverified_context()
token = "fm2_lJPECAAAAAAACLbexBCn6nGmzaH2yH0qqeFWLkE7wrVodHRwczovL2FwaS5mbHkuaW8vdjGWAJLOABBoMh8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDxpXSxM6rdG399YACSAPNrhjLqkrpAo3+MX3/C+rWaJpKKIDfyI/Y/ik7e8oca/d0A1/1cvZZo87VBhjEvETtxsIh6rKaGXFNygF2Tm2VRV84yrDHhuWKURFuJHSrJBpksQaUtuLvtbKDqr5qZg2iTvhZ8+BSimAtg5kWo3oy3/fnOZKSyKi6O4t2hHkQ2SlAORgc4A61nTHwWRgqdidWlsZGVyH6J3Zx8BxCAtHXBoypeczDk62xlEBIHNHZp/QSdlpfahedpb4H8E4g==,fm2_lJPETtxsIh6rKaGXFNygF2Tm2VRV84yrDHhuWKURFuJHSrJBpksQaUtuLvtbKDqr5qZg2iTvhZ8+BSimAtg5kWo3oy3/fnOZKSyKi6O4t2hHkcQQRtcCpVXQzeSDrKHyb70hacO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5qknqIzpAqgKYXzgAPxc8Kkc4AD8XPDMQQZG/UkpBmnww/pXoU657ztsQgJqaeDb1CJ0BWfRH6ErikTvldbkuyLgj4/vjqNUt3k0U="

req_get = urllib.request.Request(
    "https://api.machines.dev/v1/apps",
    headers={"Authorization": f"Bearer {token}"}
)

machine_data = None
for i in range(5):
    try:
        with urllib.request.urlopen(req_get, context=context) as res:
            machine_data = json.loads(res.read().decode())
            print(json.dumps(machine_data, indent=2))
            break
    except Exception as e:
        print(f"Fetch error: {e}")
        time.sleep(2)
