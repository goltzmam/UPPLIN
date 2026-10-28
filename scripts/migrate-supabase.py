#!/usr/bin/env python3
"""Apply only unapplied repository migrations via the Supabase Management API.

Requires pglast==8.7 and SUPABASE_ACCESS_TOKEN in the secure environment.
Use --apply after reviewing the catalog, migration history and recoverable backup.
"""
import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.request
from pglast import parse_sql, ast
from pglast.stream import RawStream

ROOT = Path(__file__).resolve().parent.parent
URL = "https://api.supabase.com/v1/projects/ermhzlthjlolqsbtjawf/database/query"


def query(sql, read_only=False):
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("SUPABASE_ACCESS_TOKEN is required")
    request = urllib.request.Request(URL, data=json.dumps({"query": sql, "read_only": read_only}).encode(),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # This endpoint receives repository SQL only, never secret values.
        try:
            data = json.load(error)
            message = str(data.get("message") or data.get("error") or "SQL request failed")
        except (ValueError, AttributeError):
            message = "SQL request failed"
        raise RuntimeError(f"HTTP {error.code}: {message[:1500]}") from None


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    applied = {r["version"] for r in query("SELECT version FROM supabase_migrations.schema_migrations", True)}
    pending = [p for p in sorted((ROOT / "supabase/migrations").glob("*.sql")) if p.name.split("_")[0] not in applied]
    print(f"Applied: {len(applied)}; pending: {len(pending)}", flush=True)
    for path in pending:
        version, name = path.stem.split("_", 1)
        statements = []
        guards = []
        for parsed in parse_sql(path.read_text()):
            node = parsed.stmt
            # One outer transaction also records migration history atomically.
            if isinstance(node, ast.TransactionStmt):
                continue
            if isinstance(node, ast.DropStmt) and node.removeType.name == "OBJECT_TABLE":
                for parts in node.objects:
                    names = [part.sval for part in parts]
                    relation = ".".join('"' + value.replace('"', '""') + '"' for value in names)
                    guards.append(f"DO $guard$ BEGIN IF to_regclass({literal(relation)}) IS NOT NULL THEN IF EXISTS (SELECT 1 FROM {relation} LIMIT 1) THEN RAISE EXCEPTION 'Refusing to drop a nonempty table'; END IF; END IF; END $guard$;")
            statements.append(RawStream()(node) + ";")
        print(("Applying " if args.apply else "Pending ") + version, flush=True)
        if not args.apply:
            continue
        sql = "BEGIN; SELECT pg_advisory_xact_lock(hashtext('upplin-repository-migrations'));\n"
        sql += "\n".join(guards + statements)
        sql += f"\nINSERT INTO supabase_migrations.schema_migrations(version,name) VALUES ({literal(version)},{literal(name)}); COMMIT;"
        query(sql)
        print("Applied " + version, flush=True)


if __name__ == "__main__":
    main()
