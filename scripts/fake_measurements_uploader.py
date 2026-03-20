#!/usr/bin/env python3
"""
Sube mediciones falsas a la API LoRa Mesh manteniendo latitud y longitud fijas.

Uso rapido:
  python scripts/fake_measurements_uploader.py --node-id 1

Notas:
  - Por defecto envia 5 mediciones por ciclo (temp, humedad, presion, lat, lng).
  - El intervalo default es 12s para no superar el rate limit de POST /measurements (30/min).
"""

from __future__ import annotations

import argparse
import json
import math
import random
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://almacenamiento-api-pf.s4bnsc.easypanel.host"


@dataclass
class SensorIds:
    temperature: int = 1
    humidity: int = 2
    pressure: int = 3
    latitude: int = 4
    longitude: int = 5


def iso_now() -> str:
    # La API actual acepta mejor timestamp ISO sin timezone (ej: 2026-03-20T01:59:23.007780).
    return datetime.now(UTC).replace(tzinfo=None).isoformat(timespec="microseconds")


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def api_request(base_url: str, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    body = None
    headers = {"Content-Type": "application/json"}

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    req = Request(url=url, data=body, headers=headers, method=method.upper())
    try:
        with urlopen(req, timeout=15) as resp:
            raw = resp.read()
            if not raw:
                return None
            return json.loads(raw.decode("utf-8"))
    except HTTPError as exc:
        detail = exc.reason
        try:
            raw = exc.read().decode("utf-8")
            parsed = json.loads(raw)
            detail = parsed.get("detail") or parsed
        except Exception:
            pass
        raise RuntimeError(f"HTTP {exc.code} en {method} {path}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Error de red en {method} {path}: {exc.reason}") from exc


def resolve_node_ids(
    base_url: str, explicit_node_ids: list[int] | None, explicit_node_id: int | None
) -> list[int]:
    if explicit_node_ids:
        return explicit_node_ids

    if explicit_node_id is not None:
        return [explicit_node_id]

    nodes = api_request(base_url, "GET", "/device-nodes")
    if not isinstance(nodes, list) or not nodes:
        raise RuntimeError("No hay nodos disponibles en /device-nodes. Pasa --node-ids manualmente.")

    active = [n for n in nodes if n.get("status") == "active"]
    chosen = active[0] if active else nodes[0]
    node_id = chosen.get("node_id")
    if not isinstance(node_id, int):
        raise RuntimeError("No se pudo obtener node_id valido desde /device-nodes.")
    return [node_id]


def post_measurement(base_url: str, node_id: int, sensor_type_id: int, value: float, timestamp: str) -> None:
    payload = {
        "node_id": node_id,
        "sensor_type_id": sensor_type_id,
        "value": round(value, 4),
        "timestamp": timestamp,
    }
    api_request(base_url, "POST", "/measurements", payload)


def run(args: argparse.Namespace) -> None:
    sensor_ids = SensorIds(
        temperature=args.sensor_temp,
        humidity=args.sensor_hum,
        pressure=args.sensor_press,
        latitude=args.sensor_lat,
        longitude=args.sensor_lng,
    )

    node_ids = resolve_node_ids(args.base_url, args.node_ids, args.node_id)
    measurements_per_cycle = len(node_ids) * 5
    min_interval = max(1, math.ceil(measurements_per_cycle * 2.0))
    print(f"[INFO] Base URL: {args.base_url}")
    print(f"[INFO] Node IDs: {', '.join(str(n) for n in node_ids)}")
    print(
        f"[INFO] Sensor IDs: temp={sensor_ids.temperature}, hum={sensor_ids.humidity}, "
        f"press={sensor_ids.pressure}, lat={sensor_ids.latitude}, lng={sensor_ids.longitude}"
    )
    print(f"[INFO] Lat/Lng fijas: {args.fixed_lat}, {args.fixed_lng}")
    print(f"[INFO] Intervalo: {args.interval_sec}s | Ciclos: {'infinito' if args.cycles == 0 else args.cycles}")
    if args.interval_sec < min_interval:
        print(
            "[WARN] El intervalo configurado puede superar el rate limit "
            f"(30/min). Recomendado para {measurements_per_cycle} mediciones/ciclo: "
            f"--interval-sec >= {min_interval}"
        )

    cycle = 0
    start = time.time()
    while True:
        cycle += 1
        timestamp = iso_now()
        elapsed = time.time() - start

        # Valores fake suaves para simular telemetria realista
        temp = clamp(22.0 + 2.5 * math.sin(elapsed / 90.0) + random.uniform(-0.25, 0.25), -40.0, 85.0)
        hum = clamp(55.0 + 8.0 * math.sin(elapsed / 120.0) + random.uniform(-0.8, 0.8), 0.0, 100.0)
        press = clamp(1012.0 + 4.0 * math.sin(elapsed / 180.0) + random.uniform(-0.4, 0.4), 870.0, 1085.0)

        values = [
            (sensor_ids.temperature, temp, "temp"),
            (sensor_ids.humidity, hum, "hum"),
            (sensor_ids.pressure, press, "press"),
            (sensor_ids.latitude, args.fixed_lat, "lat"),
            (sensor_ids.longitude, args.fixed_lng, "lng"),
        ]

        try:
            if args.dry_run:
                for node_id in node_ids:
                    print(
                        f"[DRY-RUN] ciclo={cycle} node={node_id} ts={timestamp} -> "
                        + ", ".join(f"{name}:{round(v,4)}(sid={sid})" for sid, v, name in values)
                    )
            else:
                for node_id in node_ids:
                    for sid, val, name in values:
                        post_measurement(args.base_url, node_id, sid, val, timestamp)
                        print(
                            f"[OK] ciclo={cycle} node={node_id} ts={timestamp} "
                            f"{name}={round(val,4)} sid={sid}"
                        )
        except Exception as exc:
            print(f"[ERROR] ciclo={cycle}: {exc}")

        if args.cycles > 0 and cycle >= args.cycles:
            print("[INFO] Finalizado.")
            break

        time.sleep(args.interval_sec)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Publica mediciones fake en /measurements con latitud/longitud fijas."
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help=f"Base URL de la API (default: {DEFAULT_BASE_URL})")
    parser.add_argument(
        "--node-ids",
        type=int,
        nargs="+",
        default=None,
        help="Lista de Node IDs destino. Ej: --node-ids 65 66 64",
    )
    parser.add_argument(
        "--node-id",
        type=int,
        default=None,
        help="Node ID destino unico (legacy). Si no se pasa --node-ids, toma este o el primer nodo activo.",
    )
    parser.add_argument("--fixed-lat", type=float, default=-26.8241, help="Latitud fija.")
    parser.add_argument("--fixed-lng", type=float, default=-65.2226, help="Longitud fija.")
    parser.add_argument("--interval-sec", type=int, default=12, help="Segundos entre ciclos (default: 12).")
    parser.add_argument("--cycles", type=int, default=0, help="Cantidad de ciclos. 0 = infinito.")
    parser.add_argument("--dry-run", action="store_true", help="No envia datos, solo imprime payloads.")

    parser.add_argument("--sensor-temp", type=int, default=1, help="sensor_type_id para temperatura.")
    parser.add_argument("--sensor-hum", type=int, default=2, help="sensor_type_id para humedad.")
    parser.add_argument("--sensor-press", type=int, default=3, help="sensor_type_id para presion.")
    parser.add_argument("--sensor-lat", type=int, default=4, help="sensor_type_id para latitud.")
    parser.add_argument("--sensor-lng", type=int, default=5, help="sensor_type_id para longitud.")
    return parser


if __name__ == "__main__":
    args = build_parser().parse_args()
    run(args)
