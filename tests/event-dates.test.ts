import test from "node:test";
import assert from "node:assert/strict";
import { toLocalDateTimeInput } from "../src/lib/event-dates.ts";
test("event editing preserves the instant when datetime-local is saved in Brazil", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "America/Fortaleza";
    const iso = "2026-11-20T22:00:00.000Z";
    assert.equal(toLocalDateTimeInput(iso), "2026-11-20T19:00");
    assert.equal(new Date(toLocalDateTimeInput(iso)).toISOString(), iso);
    assert.equal(toLocalDateTimeInput(null), "");
    assert.equal(toLocalDateTimeInput("invalid"), "");
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
