"""Bounded, key-free seasonal weather data; no wardrobe records leave the app."""
from datetime import date
from functools import lru_cache
import json
import math
from urllib.parse import urlencode
from urllib.request import urlopen


def lookup(latitude, longitude):
    latitude, longitude = float(latitude), float(longitude)
    if not (math.isfinite(latitude) and math.isfinite(longitude)
            and -90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise ValueError('Choose a destination from the city suggestions.')
    # Whole completed years make the seasonal sample reproducible and cacheable.
    return _history(round(latitude, 4), round(longitude, 4), date.today().year - 1)


@lru_cache(maxsize=64)
def _history(latitude, longitude, year):
    query = {'latitude': latitude, 'longitude': longitude,
             'start_date': f'{year - 2}-01-01', 'end_date': f'{year}-12-31',
             'daily': 'temperature_2m_min,temperature_2m_max,precipitation_sum',
             'temperature_unit': 'fahrenheit', 'precipitation_unit': 'mm',
             'timezone': 'auto'}
    url = 'https://archive-api.open-meteo.com/v1/archive?' + urlencode(query)
    with urlopen(url, timeout=10) as response:
        data = response.read(256 * 1024 + 1)
    if len(data) > 256 * 1024:
        raise ValueError('Weather response is too large.')
    payload = json.loads(data)
    fields = ('time', 'temperature_2m_min', 'temperature_2m_max', 'precipitation_sum')
    daily = payload.get('daily')
    if not isinstance(daily, dict) or not all(isinstance(daily.get(k), list) for k in fields):
        raise ValueError('Weather data is unavailable.')
    count = len(daily['time'])
    if not 1 <= count <= 1096 or any(len(daily[k]) != count for k in fields):
        raise ValueError('Weather data is incomplete.')
    return {'daily': {key: daily[key] for key in fields},
            'years': [year - 2, year]}
