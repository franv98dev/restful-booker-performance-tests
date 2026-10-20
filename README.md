# Restful-Booker · k6 Performance Tests

[![Performance Tests](https://github.com/franv98dev/restful-booker-performance-tests/actions/workflows/performance.yml/badge.svg)](https://github.com/franv98dev/restful-booker-performance-tests/actions/workflows/performance.yml)
[![Results](https://img.shields.io/badge/results-live-7d64ff?logo=k6&logoColor=white)](https://franv98dev.github.io/restful-booker-performance-tests/)
![k6](https://img.shields.io/badge/k6-2.3-7d64ff?logo=k6&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

Performance testing of the [Restful-Booker](https://github.com/mwinteringham/restful-booker)
hotel booking API with **k6**, **TypeScript** and **Docker**: smoke, load, spike, stress, soak and
breakpoint tests with SLO-based pass/fail criteria, running nightly in GitHub Actions.

The tests found that the API handles its expected traffic easily but **slows down as data grows**:
the unpaginated list endpoint is ×40 slower with 20,000 bookings. Details in the
[**Performance Report**](docs/PERFORMANCE_REPORT.md).

📊 **[Latest nightly results](https://franv98dev.github.io/restful-booker-performance-tests/)** with the k6 dashboard of each test.

> Part of a portfolio: [UI tests with Playwright](https://github.com/franv98dev/saucedemo-playwright-framework) ·
> [API tests with REST Assured](https://github.com/franv98dev/restful-booker-api-tests) · **performance tests with k6**.

---

## Highlights

| Area                         | What it shows                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Six test types**           | Smoke, load, spike, stress, soak and breakpoint, each answering a different question (see below).                          |
| **SLOs as code**             | p95/p99 latency, error rate and checks defined once and enforced as k6 thresholds: a breach fails the pipeline.            |
| **Per-endpoint budgets**     | Every request is tagged by endpoint, so thresholds and reports split latency per operation.                                |
| **Realistic workload**       | Weighted user journeys (60% browse, 20% search, 15% book, 5% manage) with think time, not one endpoint hammered in a loop. |
| **Open and closed models**   | Arrival-rate executors for load and breakpoint, virtual-user executors for stress, spike and soak.                         |
| **Business metrics**         | Custom metrics for journey duration and success, bookings created and deleted.                                             |
| **Ethical and reproducible** | The API runs locally in Docker with fixed CPU and memory: no load is ever sent to the shared public instance.              |
| **Reports**                  | k6 web dashboard (HTML), JSON and Markdown summaries, GitHub job summary and a results page on GitHub Pages.               |
| **CI/CD**                    | Quality gate → smoke on every push → full suite nightly → results deployed to Pages. Any test can be run on demand.        |

## Test types

| Test           | File                  | Load profile                              | Question it answers                                   |
| -------------- | --------------------- | ----------------------------------------- | ----------------------------------------------------- |
| **Smoke**      | `tests/smoke.ts`      | 1 VU, every journey 3 times               | Do the script and the system work at all?             |
| **Load**       | `tests/load.ts`       | Constant 10 journeys/s (≈30 req/s), 5 min | Are the SLOs met under normal traffic?                |
| **Spike**      | `tests/spike.ts`      | 5 → 150 VUs in 10 s, then back            | Does it survive a sudden burst and recover?           |
| **Stress**     | `tests/stress.ts`     | Steps of 50 → 150 → 300 → 400 VUs         | How does it degrade above normal load?                |
| **Soak**       | `tests/soak.ts`       | 20 VUs for 30 min (configurable)          | Does anything get worse over time (leaks, slowdowns)? |
| **Breakpoint** | `tests/breakpoint.ts` | Arrival rate rising until the SLOs break  | What is the maximum capacity?                         |

## Key results

| Test       | Requests | p95    | Errors | Result                       |
| ---------- | -------: | ------ | -----: | ---------------------------- |
| Load       |    3,766 | 2 ms   |  0.00% | ✅ SLOs met                  |
| Spike      |   17,276 | 5 ms   |  0.01% | ✅ SLOs met                  |
| Stress     |   79,981 | 967 ms |  0.00% | ⚠️ Slower, but no errors     |
| Breakpoint |   30,579 | 644 ms |  0.02% | 🛑 Limit ≈ 500 req/s (1 CPU) |

**Findings** ([full report](docs/PERFORMANCE_REPORT.md)):

- **PERF-001 (High):** `GET /booking` returns every booking with no pagination: 380 KB and ×40
  latency with 20,000 bookings.
- **PERF-002 (Medium):** searches scan all bookings, even when nothing matches.
- **PERF-003 (Info):** capacity ≈ 500 req/s on one CPU; beyond it requests queue up (latency grows,
  errors stay at zero) and the API recovers immediately.
- **PERF-004 (Medium):** authenticated writes degrade about twice as fast as reads under stress.

## Tech stack

- **[k6](https://grafana.com/docs/k6/latest/) 2.3** (Grafana) with native **TypeScript** support
- **Docker** + **Docker Compose** for the system under test and the load generator
- **GitHub Actions** (service containers) + **GitHub Pages**
- ESLint · Prettier · `tsc` with `@types/k6` · Dependabot

## Project structure

```
.
├── .github/workflows/performance.yml   # CI: quality → tests → Pages
├── docker-compose.yml                  # API (1 CPU, 512 MB) + k6
├── docs/PERFORMANCE_REPORT.md          # Results and findings
├── scripts/build-site.mjs              # Builds the results page from the summaries
├── src/
│   ├── config.ts                       # Base URL, credentials, SLOs and thresholds
│   ├── lib/
│   │   ├── client.ts                   # One function per endpoint, tagged requests
│   │   ├── data.ts                     # Random valid bookings
│   │   ├── metrics.ts                  # Custom business metrics
│   │   ├── random.ts                   # Random helpers
│   │   └── summary.ts                  # Console, JSON and Markdown summaries
│   ├── scenarios/journeys.ts           # User journeys and the weighted traffic mix
│   └── types/jslib.d.ts                # Types for the remote k6 library
└── tests/                              # smoke, load, spike, stress, soak, breakpoint
```

## Getting started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- Node.js 22, only for the npm shortcuts and code checks (optional)

### Run the tests

```bash
git clone https://github.com/franv98dev/restful-booker-performance-tests.git
cd restful-booker-performance-tests

npm run api:up            # start the API in Docker
npm run test:smoke        # 30 seconds
npm run test:load         # 5 minutes, saves reports/load-report.html
npm run test:stress       # ~8 minutes
npm run api:down          # stop the API
```

Without npm, the same commands with Docker Compose:

```bash
docker compose up -d api
docker compose run --rm -e K6_WEB_DASHBOARD_EXPORT=reports/load-report.html k6 run tests/load.ts
```

Open `reports/<test>-report.html` in a browser to see the charts. While a test runs, the live
dashboard is also available at http://localhost:5665 (add `-p 5665:5665` to `docker compose run`).

### Configuration

| Variable   | Used by                | Default                   |
| ---------- | ---------------------- | ------------------------- |
| `BASE_URL` | all                    | `http://localhost:3001`   |
| `RATE`     | load                   | `10` journeys per second  |
| `DURATION` | load, soak, breakpoint | `5m` / `30m` / `10m`      |
| `STEP`     | stress                 | `1m` per step             |
| `PEAK`     | spike                  | `150` VUs                 |
| `VUS`      | soak                   | `20`                      |
| `MAX_RATE` | breakpoint             | `400` journeys per second |

Example: `docker compose run --rm -e RATE=20 -e DURATION=10m k6 run tests/load.ts`

## How the thresholds work

The SLOs live in [`src/config.ts`](src/config.ts) and become k6 thresholds:

```ts
http_req_failed: ['rate<0.01'],                       // errors < 1%
http_req_duration: ['p(95)<500', 'p(99)<1000'],       // latency
'http_req_duration{endpoint:get_booking}': ['p(95)<300'],  // per-endpoint budget
```

If any threshold fails, k6 exits with code **99** and the CI job turns red. Each test type uses the
limits that make sense for its question: smoke requires **every** check to pass, stress and spike
only fail if the system collapses, and breakpoint **stops itself** (`abortOnFail`) as soon as the
SLOs break, because that moment is the result.

## CI/CD pipeline

```
push / PR ──▶ quality (tsc, eslint, prettier) ──▶ smoke test
nightly   ──▶ quality ──▶ smoke + load + spike + stress ──▶ results page on GitHub Pages
manual    ──▶ any single test (soak and breakpoint included)
```

- The API runs as a **service container** with `--cpus 1 --memory 512m`, like in Docker Compose.
- Each test's Markdown summary is added to the **GitHub job summary**, so results are visible
  without downloading anything.
- HTML dashboards, JSON and Markdown summaries are kept as artifacts for 14 days.

## Design decisions

- **Never load-test shared systems.** The public Restful-Booker is used by thousands of people
  practising. All load goes to a local container; that is also what makes results repeatable.
- **Open model for capacity questions.** With virtual users (closed model), a slow server makes
  users wait and the load drops by itself, hiding the problem. Arrival-rate executors keep
  starting new journeys on schedule, like real traffic, and report `dropped_iterations` if the
  generator can't keep up.
- **Journeys, not endpoints.** Users don't call one endpoint in a loop. Weighted journeys with
  think time produce a realistic mix of reads and writes.
- **Tag every request.** Without the `endpoint` tag, `/booking/1` and `/booking/2` would be
  different metrics and no per-operation budget would be possible.
- **Accept only the 404s that are expected.** While browsing, another user may delete a booking
  between the list and the detail request. That 404 is marked as expected, so the error rate
  only counts real problems.

## Author

**Francisco Varela**, QA Automation Engineer

- LinkedIn: [linkedin.com/in/francisco-varela-qa](https://www.linkedin.com/in/francisco-varela-qa)
- GitHub: [@franv98dev](https://github.com/franv98dev)

## License

[MIT](LICENSE)
