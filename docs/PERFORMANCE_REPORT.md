# Performance Report

Results and findings of the performance tests against Restful-Booker, run while building this
project. The nightly pipeline repeats the smoke, load, spike and stress tests and publishes the
latest numbers on [GitHub Pages](https://franv98dev.github.io/restful-booker-performance-tests/).

## Test environment

| Item              | Value                                                           |
| ----------------- | --------------------------------------------------------------- |
| System under test | `mwinteringham/restfulbooker:latest` (Node.js, in-memory store) |
| Resources         | Docker container limited to **1 CPU** and **512 MB**            |
| Load generator    | k6 2.3.0 on the same host (`--network host`)                    |
| Workload          | Mixed journeys: 60% browse · 20% search · 15% book · 5% manage  |
| SLOs              | p95 < 500 ms · p99 < 1000 ms · errors < 1% · checks > 99%       |

> Absolute numbers depend on the hardware. What matters is the shape of the results and how
> they change between runs, which is why the API always runs with the same resource limits.

## Summary

| Test       | Load                                | Requests | p95    | p99     | Errors | SLOs                    |
| ---------- | ----------------------------------- | -------: | ------ | ------- | -----: | ----------------------- |
| Smoke      | 1 VU, 3 iterations                  |       35 | 4 ms   | 10 ms   |  0.00% | ✅ Pass                 |
| Load       | 10 journeys/s for 2 min (~30 req/s) |    3,766 | 2 ms   | 5 ms    |  0.00% | ✅ Pass                 |
| Spike      | 5 → 150 VUs in 10 s                 |   17,276 | 5 ms   | 11 ms   |  0.01% | ✅ Pass                 |
| Stress     | 50 → 150 → 300 → 400 VUs            |   79,981 | 967 ms | 1298 ms |  0.00% | ⚠️ Degrades (expected)  |
| Breakpoint | Arrival rate 5 → 800 journeys/s     |   30,579 | 644 ms | 985 ms  |  0.02% | 🛑 Stopped at the limit |

**Conclusion:** the API meets its SLOs comfortably at normal and spike load. Its capacity on one
CPU is about **170 journeys/s (≈500 requests/s)**. Past that point it degrades by getting slower,
not by failing, and it recovers as soon as the load drops. The main risk is not traffic but
**data volume**: the list and search endpoints get slower as bookings accumulate (PERF-001, PERF-002).

---

## Findings

| ID                    | Finding                                                          | Impact |
| --------------------- | ---------------------------------------------------------------- | ------ |
| [PERF-001](#perf-001) | `GET /booking` has no pagination: latency grows with stored data | High   |
| [PERF-002](#perf-002) | Search scans every booking, even when nothing matches            | Medium |
| [PERF-003](#perf-003) | Capacity ≈ 500 req/s on 1 CPU; beyond it latency queues up       | Info   |
| [PERF-004](#perf-004) | Authenticated writes degrade about twice as fast as reads        | Medium |

### PERF-001

**`GET /booking` has no pagination: payload and latency grow with the stored data** · Impact: High

The endpoint returns the id of every booking in a single response. Measured with 40 sequential
requests after seeding the API with bookings:

| Stored bookings | Response size | p50     | p95      |
| --------------: | ------------: | ------- | -------- |
|              10 |        < 1 KB | 2.1 ms  | 3.4 ms   |
|           1,010 |         18 KB | 3.0 ms  | 5.3 ms   |
|           5,010 |         92 KB | 11.0 ms | 34.5 ms  |
|          10,010 |        185 KB | 28.4 ms | 64.3 ms  |
|          20,010 |        380 KB | 82.0 ms | 133.8 ms |

- **Expected:** stable latency regardless of data volume (e.g. `?page=` / `?limit=` parameters).
- **Actual:** size grows linearly and latency grows faster than linearly: ×40 slower at 20k
  bookings. In the breakpoint test the load generator received **120 MB in under 2 minutes**,
  mostly from this endpoint.
- **Risk:** in production the list would eventually time out, and every client downloading it
  multiplies bandwidth costs.

### PERF-002

**Search scans every booking, even when nothing matches** · Impact: Medium

With 20,010 stored bookings, `GET /booking?firstname=Nobody` (zero results) takes **16 ms at
p50**, against about 2 ms with only a few bookings. A search that matches many bookings
(`?firstname=Seed`) takes 93 ms and returns 380 KB. The cost grows with the total data, not with
the number of results, which points to a full scan instead of an index.

### PERF-003

**Capacity is about 500 requests/s on 1 CPU; beyond it requests queue up** · Impact: Info

The breakpoint test raises the arrival rate until p95 crosses 500 ms and then stops (`abortOnFail`).
In two runs it stopped after 112 s and 118 s, at an arrival rate of about 170 journeys/s
(≈3.1 requests per journey ≈ 500 req/s).

- The failure mode is **latency, not errors**: error rate stayed at 0.02% while p95 went from
  2 ms to 644 ms. Node.js serves requests on a single thread, so extra load waits in a queue.
- The stress test confirms it: at 400 virtual users p95 reached 967 ms with **zero** failed
  requests, and a request right after the ramp-down took 4 ms (full recovery). Memory stayed
  between 45 and 67 MB during all runs: no sign of a leak.
- **Recommendation:** scale horizontally (more instances) before 400 req/s, or alert when p95
  exceeds 300 ms, so users never reach the degraded zone.

### PERF-004

**Authenticated writes degrade about twice as fast as reads** · Impact: Medium

At the top of the stress test (400 virtual users):

| Endpoint                      | avg    | p95      |
| ----------------------------- | ------ | -------- |
| `GET /booking/{id}`           | 266 ms | 929 ms   |
| `POST /booking` (no auth)     | 260 ms | 926 ms   |
| `PUT /booking/{id}` (auth)    | 480 ms | 1,796 ms |
| `PATCH /booking/{id}` (auth)  | 474 ms | 1,716 ms |
| `DELETE /booking/{id}` (auth) | 472 ms | 1,758 ms |

Creating a booking costs the same as reading one, but the three authenticated operations take
about twice as long. The difference is the token validation on every request, which becomes
visible under contention. Worth profiling if write traffic grows.

---

## How to reproduce

```bash
npm run api:up          # API in Docker, 1 CPU / 512 MB
npm run test:load       # or test:stress, test:spike, test:breakpoint...
```

To reproduce PERF-001, create bookings in bulk (e.g. with the `book` journey of the load test
running for a few minutes) and compare `list_bookings` latency between runs.
