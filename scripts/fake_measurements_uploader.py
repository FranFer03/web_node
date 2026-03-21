#!/usr/bin/env python3
"""
Populate historical simulated measurements through the API.

Default behavior:
- Uses all device nodes from GET /device-nodes
- Uses active sensor types from GET /sensor-types
- Generates 30 days of historical data ending yesterday
- Creates 1 measurement per day, per sensor, per node
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import time
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_API_BASE_URL = "https://almacenamiento-api-pf.s4bnsc.easypanel.host"


def normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def request_json(
    method: str,
    url: str,
    payload: Optional[Dict[str, Any]] = None,
    timeout: int = 30,
) -> Any:
    data = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = Request(url=url, method=method.upper(), headers=headers, data=data)
    with urlopen(req, timeout=timeout) as response:
        body = response.read().decode("utf-8") if response.length != 0 else ""
        if not body:
            return None
        try:
            return json.loads(body)
        except json.JSONDecodeError as exc:
            preview = body[:180].replace("\n", " ").replace("\r", " ")
            raise ValueError(f"Non-JSON response from {url}: {preview}") from exc


def parse_http_error(exc: HTTPError) -> Tuple[int, str]:
    status = exc.code
    try:
        raw = exc.read().decode("utf-8")
        data = json.loads(raw) if raw else {}
    except Exception:
        data = {}

    if isinstance(data, dict):
        detail = data.get("detail") or data.get("message") or data.get("error")
        if detail:
            return status, str(detail)
    return status, exc.reason


def pick_fallback_range(sensor: Dict[str, Any]) -> Tuple[float, float]:
    name = str(sensor.get("name") or "").lower()
    unit = str(sensor.get("unit_of_measure") or "").lower()

    if "temp" in name or "c" in unit:
        return 18.0, 34.0
    if "humid" in name or "%" in unit:
        return 35.0, 85.0
    if "press" in name or "pa" in unit:
        return 950.0, 1050.0
    if "volt" in name or "v" == unit.strip():
        return 3.0, 4.2
    return 0.0, 100.0


def sensor_range(sensor: Dict[str, Any]) -> Tuple[float, float]:
    min_value = sensor.get("min_value")
    max_value = sensor.get("max_value")
    if isinstance(min_value, (int, float)) and isinstance(max_value, (int, float)):
        if float(max_value) > float(min_value):
            return float(min_value), float(max_value)
    return pick_fallback_range(sensor)


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(value, hi))


def generate_value(
    sensor: Dict[str, Any],
    node_index: int,
    day_index: int,
    rng: random.Random,
) -> float:
    lo, hi = sensor_range(sensor)
    span = hi - lo
    sensor_id = int(sensor.get("sensor_type_id") or 0)

    phase = (day_index / 30.0) * (2.0 * math.pi)
    seasonal = math.sin(phase + node_index * 0.33 + sensor_id * 0.21) * (span * 0.18)
    noise = rng.uniform(-span * 0.05, span * 0.05)

    value = ((lo + hi) / 2.0) + seasonal + noise
    precision = int(sensor.get("precision_digits") or 2)
    precision = clamp(float(precision), 0.0, 4.0)
    return round(clamp(value, lo, hi), int(precision))


def build_timestamp(day: date, rng: random.Random, fixed_hour: int) -> str:
    minute = rng.randint(0, 59)
    second = rng.randint(0, 59)
    dt = datetime(day.year, day.month, day.day, fixed_hour, minute, second)
    return dt.isoformat(timespec="seconds")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate historical simulated measurements via API."
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("API_BASE_URL")
        or os.getenv("VITE_API_BASE_URL")
        or DEFAULT_API_BASE_URL,
        help="API base URL (default: API_BASE_URL, VITE_API_BASE_URL, or built-in value).",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=30,
        help="How many days to generate (default: 30).",
    )
    parser.add_argument(
        "--end-date",
        default=None,
        help="Last date to generate in YYYY-MM-DD. Default: yesterday.",
    )
    parser.add_argument(
        "--hour",
        type=int,
        default=12,
        help="Hour of day for generated timestamps (0-23, default: 12).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=12345,
        help="Random seed for reproducible results.",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=float,
        default=2.1,
        help="Delay between POST requests to avoid rate limits (default: 2.1).",
    )
    parser.add_argument(
        "--include-inactive-sensors",
        action="store_true",
        help="Include inactive sensors (default: only active sensors).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not POST data, only print what would be sent.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.days <= 0:
        print("ERROR: --days must be >= 1", file=sys.stderr)
        return 2
    if not 0 <= args.hour <= 23:
        print("ERROR: --hour must be between 0 and 23", file=sys.stderr)
        return 2
    if args.sleep_seconds < 0:
        print("ERROR: --sleep-seconds cannot be negative", file=sys.stderr)
        return 2

    if args.end_date:
        try:
            end_day = datetime.strptime(args.end_date, "%Y-%m-%d").date()
        except ValueError:
            print("ERROR: --end-date must be YYYY-MM-DD", file=sys.stderr)
            return 2
    else:
        end_day = date.today() - timedelta(days=1)

    start_day = end_day - timedelta(days=args.days - 1)
    base_url = normalize_base_url(args.base_url)

    rng = random.Random(args.seed)

    try:
        nodes = request_json("GET", f"{base_url}/device-nodes")
        sensors = request_json("GET", f"{base_url}/sensor-types")
    except HTTPError as exc:
        status, detail = parse_http_error(exc)
        print(f"ERROR fetching metadata: HTTP {status} - {detail}", file=sys.stderr)
        return 1
    except URLError as exc:
        print(f"ERROR connecting to API: {exc}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"ERROR parsing API response: {exc}", file=sys.stderr)
        return 1

    if not isinstance(nodes, list) or not nodes:
        print("ERROR: no device nodes returned by API", file=sys.stderr)
        return 1
    if not isinstance(sensors, list) or not sensors:
        print("ERROR: no sensor types returned by API", file=sys.stderr)
        return 1

    if not args.include_inactive_sensors:
        sensors = [s for s in sensors if bool(s.get("is_active", True))]

    if not sensors:
        print("ERROR: no sensor types available after filtering", file=sys.stderr)
        return 1

    total_records = args.days * len(nodes) * len(sensors)
    print(
        f"Generating {total_records} measurements "
        f"from {start_day.isoformat()} to {end_day.isoformat()} "
        f"for {len(nodes)} nodes and {len(sensors)} sensors."
    )
    if args.dry_run:
        print("DRY RUN enabled: no data will be posted.")

    success = 0
    failures = 0
    dry_preview = 0

    for day_offset in range(args.days):
        current_day = start_day + timedelta(days=day_offset)
        for node_index, node in enumerate(nodes):
            node_id = node.get("node_id")
            if node_id is None:
                continue
            for sensor in sensors:
                sensor_type_id = sensor.get("sensor_type_id")
                if sensor_type_id is None:
                    continue

                payload = {
                    "node_id": int(node_id),
                    "sensor_type_id": int(sensor_type_id),
                    "value": generate_value(sensor, node_index, day_offset, rng),
                    "timestamp": build_timestamp(current_day, rng, args.hour),
                }

                if args.dry_run:
                    if dry_preview < 10:
                        print(json.dumps(payload, ensure_ascii=True))
                    dry_preview += 1
                    success += 1
                    continue

                attempts = 0
                posted = False
                while attempts < 3 and not posted:
                    attempts += 1
                    try:
                        request_json("POST", f"{base_url}/measurements", payload=payload)
                        posted = True
                    except HTTPError as exc:
                        status, detail = parse_http_error(exc)
                        if status == 429 and attempts < 3:
                            wait_seconds = 65
                            print(
                                f"Rate limit reached (HTTP 429). "
                                f"Waiting {wait_seconds}s then retrying..."
                            )
                            time.sleep(wait_seconds)
                        else:
                            print(
                                "POST failed "
                                f"(node_id={payload['node_id']}, "
                                f"sensor_type_id={payload['sensor_type_id']}, "
                                f"timestamp={payload['timestamp']}): "
                                f"HTTP {status} - {detail}",
                                file=sys.stderr,
                            )
                            break
                    except URLError as exc:
                        print(
                            "POST failed "
                            f"(node_id={payload['node_id']}, "
                            f"sensor_type_id={payload['sensor_type_id']}, "
                            f"timestamp={payload['timestamp']}): {exc}",
                            file=sys.stderr,
                        )
                        break

                if posted:
                    success += 1
                else:
                    failures += 1

                if args.sleep_seconds > 0:
                    time.sleep(args.sleep_seconds)

    print(f"Done. Success: {success} | Failures: {failures}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
