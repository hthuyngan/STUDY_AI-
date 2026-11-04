import urllib.request
import json
import time
import sys

def check():
    url = 'https://api.github.com/repos/hthuyngan/STUDY_AI-/actions/runs'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    
    runs = data.get('workflow_runs', [])[:6]
    for r in runs:
        print(f"ID: {r['id']} | Name: {r['name']} | SHA: {r['head_sha'][:7]} | Status: {r['status']} | Conclusion: {r['conclusion']}")

if __name__ == '__main__':
    check()
