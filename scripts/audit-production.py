#!/usr/bin/env python3
"""Read-only production metadata audit. Never exports credential values or user rows."""
import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request


def get_json(url, token, payload=None):
    headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}
    request = urllib.request.Request(url, headers=headers,
        data=json.dumps(payload).encode() if payload is not None else None)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Management request rejected: HTTP {error.code}") from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="/tmp/upplin-production-metadata.json")
    args = parser.parse_args()
    report = {}
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    project = "ermhzlthjlolqsbtjawf"
    if not token:
        report["supabase"] = {"blocked": "SUPABASE_ACCESS_TOKEN is not configured"}
    else:
        base = f"https://api.supabase.com/v1/projects/{project}"
        query = """SELECT jsonb_build_object(
          'tables', (SELECT jsonb_agg(jsonb_build_object('name',tablename,'rls',rowsecurity)) FROM pg_tables WHERE schemaname='public'),
          'columns', (SELECT jsonb_agg(jsonb_build_object('table',table_name,'name',column_name,'type',data_type,'nullable',is_nullable)) FROM information_schema.columns WHERE table_schema='public'),
          'policies', (SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'command',cmd)) FROM pg_policies WHERE schemaname='public'),
          'extensions', (SELECT jsonb_agg(extname) FROM pg_extension),
          'migration_history_present', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
        ) AS metadata"""
        rows = get_json(base + "/database/query", token, {"query": query, "read_only": True})
        metadata = rows[0]["metadata"] if rows else {}
        if metadata.get("migration_history_present"):
            metadata["migration_versions"] = get_json(base + "/database/query", token,
                {"query": "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version", "read_only": True})
        # Secret API returns metadata; retain names only.
        metadata["secret_names"] = [item["name"] for item in get_json(base + "/secrets", token)]
        auth = get_json(base + "/config/auth", token)
        allowed = ["site_url", "uri_allow_list", "external_google_enabled", "external_apple_enabled",
                   "external_email_enabled", "mailer_autoconfirm", "hook_send_email_enabled", "hook_send_email_uri"]
        metadata["auth"] = {key: auth.get(key) for key in allowed}
        report["supabase"] = metadata
    token = os.environ.get("VERCEL_TOKEN")
    project_id = os.environ.get("VERCEL_PROJECT_ID")
    team_id = os.environ.get("VERCEL_TEAM_ID")
    query = "?" + urllib.parse.urlencode({"teamId": team_id}) if team_id else ""
    if not token:
        report["vercel"] = {"blocked": "VERCEL_TOKEN is not configured"}
    elif not project_id:
        projects = get_json("https://api.vercel.com/v9/projects" + query, token)
        report["vercel"] = {"projects": [{"id": p["id"], "name": p["name"]} for p in projects.get("projects", [])],
                            "next_step": "Set VERCEL_PROJECT_ID for the UPPLIN project"}
    else:
        base = "https://api.vercel.com/v9/projects/" + urllib.parse.quote(project_id, safe="")
        data = get_json(base + query, token)
        env = get_json(base + "/env" + query, token)
        report["vercel"] = {key: data.get(key) for key in ["id", "name", "framework", "rootDirectory"]}
        report["vercel"]["environment_names"] = [item["key"] for item in env.get("envs", [])]
    Path(args.output).write_text(json.dumps(report, indent=2) + "\n")
    for service in report:
        print(service + ": " + (report[service].get("blocked") or "metadata saved"))
    return 2 if any("blocked" in item for item in report.values()) else 0


if __name__ == "__main__":
    raise SystemExit(main())
