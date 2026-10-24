"""City suggestions use a fixed service, bounded responses, and no wardrobe data."""
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from places import lookup


class PlaceTests(unittest.TestCase):
    def setUp(self):
        lookup.cache_clear()

    def test_city_response_and_session_cache(self):
        payload = {'results': [{'name': 'Victoria', 'admin1': 'British Columbia', 'country': 'Canada', 'extra': 'not shared'}]}
        with patch('places.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())) as request:
            result = lookup('Victoria, BC')
            self.assertEqual(result, {'places': [{'label': 'Victoria, British Columbia, Canada'}]})
            self.assertEqual(lookup('Victoria, BC'), result)
            self.assertEqual(request.call_count, 1)
            self.assertTrue(request.call_args.args[0].startswith('https://geocoding-api.open-meteo.com/v1/search?'))
            self.assertIn('name=Victoria%2C+BC', request.call_args.args[0])

    def test_coordinates_follow_the_selected_city(self):
        payload = {'results': [{'name': 'Synthetic', 'country': 'Example', 'latitude': 48.4, 'longitude': -123.3}]}
        with patch('places.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())):
            self.assertEqual(lookup('Synthetic')['places'][0], {'label': 'Synthetic, Example', 'latitude': 48.4, 'longitude': -123.3})

    def test_bad_query_and_oversized_response_are_rejected(self):
        with patch('places.urlopen') as request:
            for value in ('', 'ab', 'x' * 101):
                with self.assertRaises(ValueError):
                    lookup(value)
            request.assert_not_called()
        with patch('places.urlopen', return_value=io.BytesIO(b'x' * (256 * 1024 + 1))):
            with self.assertRaises(ValueError):
                lookup('Synthetic city')


if __name__ == '__main__':
    unittest.main()
