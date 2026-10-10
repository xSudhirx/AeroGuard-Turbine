"""NASA C-MAPSS FD001 sensor column names, units, and UI aliases.

FD001 is a single operating-condition, single-fault-mode turbofan run-to-failure
set. Column order matches ``data_loader.COLUMNS`` (Saxena / NASA C-MAPSS).
C-MAPSS does not include a dedicated vibration transducer; fan/core speed
channels are the closest high-frequency mechanical proxies in this schema.
"""

from __future__ import annotations

from data_loader import OP_SETTING_COLS, SENSOR_COLS

# sensor_i -> (short name, description, unit)
SENSOR_META: dict[str, tuple[str, str, str]] = {
    "sensor_1": ("T2", "Total temperature at fan inlet", "°R"),
    "sensor_2": ("T24", "Total temperature at LPC outlet", "°R"),
    "sensor_3": ("T30", "Total temperature at HPC outlet", "°R"),
    "sensor_4": ("T50", "Total temperature at LPT outlet", "°R"),
    "sensor_5": ("P2", "Pressure at fan inlet", "psia"),
    "sensor_6": ("P15", "Total pressure in bypass duct", "psia"),
    "sensor_7": ("P30", "Total pressure at HPC outlet", "psia"),
    "sensor_8": ("Nf", "Physical fan speed", "rpm"),
    "sensor_9": ("Nc", "Physical core speed", "rpm"),
    "sensor_10": ("epr", "Engine pressure ratio (P50/P2)", "-"),
    "sensor_11": ("Ps30", "Static pressure at HPC outlet", "psia"),
    "sensor_12": ("phi", "Fuel flow to Ps30 ratio", "pps/psi"),
    "sensor_13": ("NRf", "Corrected fan speed", "rpm"),
    "sensor_14": ("NRc", "Corrected core speed", "rpm"),
    "sensor_15": ("BPR", "Bypass ratio", "-"),
    "sensor_16": ("farB", "Burner fuel-air ratio", "-"),
    "sensor_17": ("htBleed", "Bleed enthalpy", "kJ/kg"),
    "sensor_18": ("Nf_dmd", "Demanded fan speed", "rpm"),
    "sensor_19": ("PCNfR_dmd", "Demanded corrected fan speed", "rpm"),
    "sensor_20": ("W31", "HPT coolant bleed", "lbm/s"),
    "sensor_21": ("W32", "LPT coolant bleed", "lbm/s"),
}

TEMPERATURE_SENSORS = ["sensor_2", "sensor_3", "sensor_4"]
PRESSURE_SENSORS = ["sensor_6", "sensor_7", "sensor_11"]
# Mechanical-speed proxies used for "vibration-like" synthetic faults.
SPEED_PROXY_SENSORS = ["sensor_8", "sensor_9", "sensor_13", "sensor_14"]

UI_ALIAS_TO_SENSOR: dict[str, str] = {
    "t2_fan_inlet_temp": "sensor_1",
    "t24_lpc_temp": "sensor_2",
    "t30_hpc_temp": "sensor_3",
    "t50_lpt_temp": "sensor_4",
    "p2_fan_inlet_press": "sensor_5",
    "p15_bypass_press": "sensor_6",
    "p30_hpc_press": "sensor_7",
    "nf_fan_speed": "sensor_8",
    "nc_core_speed": "sensor_9",
    "ps30_hpc_static_press": "sensor_11",
    "phi_fuel_ratio": "sensor_12",
    "bpr_bypass_ratio": "sensor_15",
    "ht_bleed": "sensor_17",
}


def canonical_sensor_key(name: str) -> str | None:
    """Map a UI alias or sensor_* name to a canonical SENSOR_COLS key."""
    key = str(name).strip()
    if key in SENSOR_COLS:
        return key
    if key in UI_ALIAS_TO_SENSOR:
        return UI_ALIAS_TO_SENSOR[key]
    lower = key.lower()
    for alias, col in UI_ALIAS_TO_SENSOR.items():
        if lower == alias.lower():
            return col
    for col, (short, _desc, _unit) in SENSOR_META.items():
        if lower == short.lower():
            return col
    return None


def feature_columns_for_anomaly(kept_sensors: list[str]) -> list[str]:
    """Operating settings plus kept sensors, matching RUL preprocessing convention."""
    return [c for c in OP_SETTING_COLS + kept_sensors if c in OP_SETTING_COLS or c in kept_sensors]
