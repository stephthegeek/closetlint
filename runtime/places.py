"""City suggestions send only the typed destination, never wardrobe data."""
from functools import lru_cache
import json
import math
from urllib.parse import urlencode
from urllib.request import urlopen


@lru_cache(maxsize=128)
def lookup(name):
    name = ' '.join(name.split())
    if not 3 <= len(name) <= 100:
        raise ValueError('Enter between 3 and 100 characters')
    url = 'https://geocoding-api.open-meteo.com/v1/search?' + urlencode({'name': name, 'count': 5, 'language': 'en'})
    with urlopen(url, timeout=5) as response:
        data = response.read(256 * 1024 + 1)
    if len(data) > 256 * 1024:
        raise ValueError('City response is too large')
    results = json.loads(data).get('results', [])
    places = []
    for result in results[:5]:
        parts = []
        for key in ('name', 'admin1', 'country'):
            value = result.get(key)
            if isinstance(value, str) and value and value not in parts:
                parts.append(value[:150])
        if parts:
            label = ', '.join(parts)
            if not any(p['label'] == label for p in places):
                place = {'label': label}
                lat, lon = result.get('latitude'), result.get('longitude')
                if (isinstance(lat, (int, float)) and isinstance(lon, (int, float))
                        and math.isfinite(lat) and math.isfinite(lon)
                        and -90 <= lat <= 90 and -180 <= lon <= 180):
                    place.update(latitude=lat, longitude=lon)
                places.append(place)
    return {'places': places}
