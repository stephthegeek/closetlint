"""Synthetic service responses only; no wardrobe or live service dependency."""
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
import weather


class WeatherTests(unittest.TestCase):
    def setUp(self):
        weather._history.cache_clear()

    def test_fixed_endpoint_bounded_history_and_session_cache(self):
        daily = {'time': ['2024-01-01'], 'temperature_2m_min': [30],
                 'temperature_2m_max': [50], 'precipitation_sum': [2]}
        with patch('weather.urlopen', return_value=io.BytesIO(json.dumps({'daily': daily, 'private': 'excluded'}).encode())) as request:
            result = weather.lookup('48.4', '-123.3')
            self.assertEqual(result['daily'], daily)
            self.assertNotIn('private', result)
            self.assertEqual(weather.lookup(48.4, -123.3), result)
            self.assertEqual(request.call_count, 1)
            self.assertTrue(request.call_args.args[0].startswith('https://archive-api.open-meteo.com/v1/archive?'))
            self.assertIn('temperature_unit=fahrenheit', request.call_args.args[0])
            self.assertEqual(request.call_args.kwargs['timeout'], 10)
            self.assertEqual(result['years'][1] - result['years'][0], 2)

    def test_invalid_coordinates_do_not_reach_network(self):
        with patch('weather.urlopen') as request:
            for lat, lon in [('nan', '0'), ('91', '0'), ('0', '-181'), ('0', 'inf'), ('https://example.test', '0')]:
                with self.assertRaises(ValueError):
                    weather.lookup(lat, lon)
            request.assert_not_called()

    def test_oversized_or_incomplete_data_fails_without_caching(self):
        for payload in [b'x' * (256 * 1024 + 1), b'{}', json.dumps({'daily': {'time': [1], 'temperature_2m_min': [], 'temperature_2m_max': [], 'precipitation_sum': []}}).encode()]:
            with patch('weather.urlopen', return_value=io.BytesIO(payload)):
                with self.assertRaises(ValueError):
                    weather.lookup(0, 0)
        self.assertEqual(weather._history.cache_info().currsize, 0)


if __name__ == '__main__':
    unittest.main()
