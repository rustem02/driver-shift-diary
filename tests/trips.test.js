import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/server.js";
import { TripStore } from "../src/store.js";
import { validateTrip, isSameTrip } from "../src/validation.js";

const sampleTrip = {
  id: "t1",
  start: "2026-10-01T08:10:00+05:00",
  end: "2026-10-01T08:32:00+05:00",
  amount: 2400,
  payment: "card",
  commission: 360,
};

describe("validateTrip", () => {
  it("отклоняет amount <= 0", () => {
    const result = validateTrip({ ...sampleTrip, amount: 0 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/amount/i);
  });

  it("отклоняет end раньше или равный start", () => {
    const result = validateTrip({
      ...sampleTrip,
      end: "2026-10-01T08:10:00+05:00",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/end/i);
  });

  it("принимает корректную поездку", () => {
    const result = validateTrip(sampleTrip);
    expect(result.ok).toBe(true);
  });
});

describe("защита от дублей", () => {
  /** @type {string} */
  let tmpFile;
  /** @type {import('express').Express} */
  let app;

  beforeEach(async () => {
    tmpFile = path.join(os.tmpdir(), `trips-test-${Date.now()}.json`);
    await fs.writeFile(tmpFile, "[]", "utf8");
    app = createApp({ store: new TripStore(tmpFile) });
  });

  afterEach(async () => {
    await fs.unlink(tmpFile).catch(() => {});
  });

  it("isSameTrip: совпадение по id", () => {
    expect(isSameTrip(sampleTrip, { ...sampleTrip, amount: 999 })).toBe(true);
  });

  it("isSameTrip: совпадение по полям без id", () => {
    const a = { ...sampleTrip };
    delete a.id;
    const b = { ...sampleTrip };
    delete b.id;
    expect(isSameTrip(a, b)).toBe(true);
  });

  it("повторный POST с тем же id не создаёт дубль", async () => {
    const first = await request(app).post("/api/trips").send(sampleTrip);
    expect(first.status).toBe(201);
    expect(first.body.created).toBe(true);

    const second = await request(app).post("/api/trips").send(sampleTrip);
    expect(second.status).toBe(200);
    expect(second.body.created).toBe(false);
    expect(second.body.trip.id).toBe("t1");

    const day = await request(app).get("/api/trips").query({ date: "2026-10-01" });
    expect(day.body.trips).toHaveLength(1);
    expect(day.body.summary.tripsCount).toBe(1);
  });

  it("повторный POST с теми же полями (без id) не создаёт дубль", async () => {
    const withoutId = { ...sampleTrip };
    delete withoutId.id;

    const first = await request(app).post("/api/trips").send(withoutId);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/trips").send(withoutId);
    expect(second.status).toBe(200);
    expect(second.body.created).toBe(false);

    const day = await request(app).get("/api/trips").query({ date: "2026-10-01" });
    expect(day.body.trips).toHaveLength(1);
  });

  it("GET /api/trips возвращает сводку за день", async () => {
    await request(app).post("/api/trips").send(sampleTrip);
    await request(app)
      .post("/api/trips")
      .send({
        id: "t2",
        start: "2026-10-01T09:05:00+05:00",
        end: "2026-10-01T09:20:00+05:00",
        amount: 1500,
        payment: "cash",
        commission: 225,
      });

    const res = await request(app).get("/api/trips").query({ date: "2026-10-01" });
    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({
      tripsCount: 2,
      revenue: 3900,
      commission: 585,
      net: 3315,
    });
  });

  it("POST с невалидными данными возвращает 400", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({ ...sampleTrip, amount: -10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});
