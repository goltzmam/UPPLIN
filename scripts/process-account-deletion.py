#!/usr/bin/env python3
"""Process an email-requested deletion after support has verified identity.

Dry run by default. Never delete Auth directly: the deletion worker preserves
financial obligations, revokes Apple and cancels subscriptions first.
"""
import argparse
import hashlib
import json
import os
import secrets
import urllib.error
import urllib.request
import uuid

PROJECT = 'ermhzlthjlolqsbtjawf'
API = f'https://api.supabase.com/v1/projects/{PROJECT}'
SITE = f'https://{PROJECT}.supabase.co'


def request(url, token, data=None, apikey=None):
    headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
    if apikey:
        headers['apikey'] = apikey
    req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode() if data is not None else None)
    with urllib.request.urlopen(req, timeout=120) as response:
        body = response.read()
        return json.loads(body) if body else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--user-id', required=True, type=uuid.UUID)
    parser.add_argument('--identity-verified', action='store_true')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    keys = request(API + '/api-keys', os.environ['SUPABASE_ACCESS_TOKEN'])
    service = next(key['api_key'] for key in keys if key['name'] == 'service_role')
    anon = next(key['api_key'] for key in keys if key['name'] == 'anon')

    def rpc(name, data):
        return request(SITE + '/rest/v1/rpc/' + name, service, data, anon)

    uid = str(args.user_id)
    user = request(SITE + '/auth/v1/admin/users/' + uid, service, apikey=anon)
    if rpc('has_role', {'_user_id': uid, '_role': 'admin'}):
        raise RuntimeError('Support accounts require a separate administrative procedure.')
    if any(identity.get('provider') == 'apple' for identity in user.get('identities', [])):
        if not rpc('apple_deletion_token_ready', {'p_user_id': uid}):
            raise RuntimeError('Apple token missing: ask the owner to sign in with Apple before deletion.')
    if not args.apply:
        print('Account found. Dry run: no deletion initiated. Verify the owner identity before applying.')
        return
    if not args.identity_verified:
        raise RuntimeError('--identity-verified is required after the support identity check.')
    receipt_hash = hashlib.sha256(secrets.token_bytes(32)).hexdigest()
    job = rpc('begin_account_deletion', {'p_user_id': uid, 'p_receipt_hash': receipt_hash})
    request(SITE + '/functions/v1/privacy-worker', service, {}, anon)
    state = rpc('deletion_job_status', {'p_job_id': job, 'p_receipt_hash': receipt_hash})
    print(json.dumps({'job_id': job, 'status': state.get('status') if state else 'processing'}))


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as error:
        # Never log response payloads containing account data or credentials.
        raise SystemExit(f'Service request failed (HTTP {error.code}). Check privileged server logs.')
