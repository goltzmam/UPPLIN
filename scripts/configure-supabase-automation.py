#!/usr/bin/env python3
"""Configure housekeeping cron jobs, keeping credentials in encrypted Vault only."""
import argparse
import importlib.util
import os
import secrets
from pathlib import Path

spec = importlib.util.spec_from_file_location("audit", Path(__file__).with_name("audit-production.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
PROJECT = "ermhzlthjlolqsbtjawf"
SECRET = "upplin_cron_auth"
JOBS = [
    ("upplin-expire-pending-orders", "* * * * *", "expire-pending-orders", True),
    ("upplin-check-subscription-expiry", "0 12 * * *", "check-subscription-expiry", True),
    ("upplin-process-email-queue", "* * * * *", "process-email-queue", False),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    token = os.environ["SUPABASE_ACCESS_TOKEN"]
    base = f"https://api.supabase.com/v1/projects/{PROJECT}"

    def query(sql, parameters=None, read_only=False):
        return audit.get_json(base + "/database/query", token,
                              {"query": sql, "parameters": parameters or [], "read_only": read_only})

    existing = query("SELECT jobname, schedule, active FROM cron.job ORDER BY jobname", read_only=True)
    if not args.apply:
        print({"existing_jobs": existing, "proposed_jobs": JOBS})
        return
    found = query("SELECT id FROM vault.secrets WHERE name = $1", [SECRET], True)
    if found:
        service = query("SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = $1::uuid",
                        [found[0]["id"]])[0]["decrypted_secret"]
    else:
        service = secrets.token_urlsafe(48)
        query("SELECT vault.create_secret($1::text, $2::text, 'UPPLIN housekeeping authentication')",
              [service, SECRET])
    audit.get_json(base + "/secrets", token, [{"name": "CRON_SECRET", "value": service}])
    previous = {item["jobname"]: item["active"] for item in existing}
    for name, schedule, function, default_active in JOBS:
        command = f"""SELECT net.http_post(
          url := 'https://{PROJECT}.supabase.co/functions/v1/{function}',
          headers := jsonb_build_object('Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
                                          WHERE name = '{SECRET}')),
          body := '{{}}'::jsonb, timeout_milliseconds := 10000);"""
        query("SELECT cron.alter_job(cron.schedule($1::text, $2::text, $3::text), "
              "active := $4::boolean)",
              [name, schedule, command, previous.get(name, default_active)])
    print(query("SELECT jobname, schedule, active FROM cron.job ORDER BY jobname", read_only=True))


if __name__ == "__main__":
    main()
