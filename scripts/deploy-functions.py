#!/usr/bin/env python3
"""Deploy repository Edge Functions through the documented multipart API.

Supports securely injected proxy credentials without local CLI token parsing.
"""
import argparse
import json
import os
from pathlib import Path
import tomllib
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://api.supabase.com/v1/projects/ermhzlthjlolqsbtjawf/functions/deploy"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--function")
    args = parser.parse_args()
    config = tomllib.loads((ROOT / "supabase/config.toml").read_text())["functions"]
    shared = [p for p in (ROOT / "supabase/functions/_shared").rglob("*") if p.is_file() and p.suffix in [".ts", ".tsx"] and not p.name.endswith(".test.ts")]
    for entry in sorted((ROOT / "supabase/functions").glob("*/index.ts")):
        slug = entry.parent.name
        if args.function and slug != args.function:
            continue
        meta = {"name": slug, "entrypoint_path": entry.relative_to(ROOT).as_posix(),
                "verify_jwt": config.get(slug, {}).get("verify_jwt", True)}
        files = [entry, *shared]
        deno = entry.parent / "deno.json"
        if deno.exists():
            meta["import_map_path"] = deno.relative_to(ROOT).as_posix()
            files.append(deno)
        if not args.apply:
            print("Prepared " + slug)
            continue
        token = os.environ.get("SUPABASE_ACCESS_TOKEN")
        if not token:
            raise RuntimeError("SUPABASE_ACCESS_TOKEN is required")
        boundary = "upplin-" + uuid.uuid4().hex
        parts = [f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n{json.dumps(meta)}\r\n'.encode()]
        for path in files:
            filename = path.relative_to(ROOT).as_posix()
            parts += [f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode(), path.read_bytes(), b"\r\n"]
        parts.append(f"--{boundary}--\r\n".encode())
        request = urllib.request.Request(BASE + "?slug=" + slug, data=b"".join(parts),
            headers={"Authorization": "Bearer " + token, "Content-Type": "multipart/form-data; boundary=" + boundary})
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                data = json.load(response)
                print(f"Deployed {slug}: version {data.get('version')}, status {data.get('status')}", flush=True)
        except urllib.error.HTTPError as error:
            try:
                data = json.load(error)
                message = str(data.get("message") or data.get("error") or "Deployment failed")
            except (ValueError, AttributeError):
                message = "Deployment failed"
            raise RuntimeError(f"{slug}: HTTP {error.code}: {message[:1500]}") from None


if __name__ == "__main__":
    main()
