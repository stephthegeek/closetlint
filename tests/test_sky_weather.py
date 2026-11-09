"""Forecast and geocoding contracts use synthetic responses only."""
import io
import json
from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'runtime'))
import weather
import places

class SkyWeatherTests(unittest.TestCase):
    def setUp(self):
        weather._forecast.cache_clear()
        places.lookup.cache_clear()
        self.day=datetime.now(timezone.utc).date().isoformat()
    def test_bounded_today_forecast_and_hourly_cache(self):
        payload={'daily':{'time':[self.day],'temperature_2m_max':[63.4],'weather_code':[3]}}
        with patch('weather.urlopen',return_value=io.BytesIO(json.dumps(payload).encode())) as call:
            self.assertEqual(weather.forecast(37.7,-122.4,self.day),{'date':self.day,'high':63.4,'code':3})
            weather.forecast(37.7,-122.4,self.day)
            self.assertEqual(call.call_count,1)
            self.assertTrue(call.call_args.args[0].startswith('https://api.open-meteo.com/v1/forecast?'))
            self.assertIn('temperature_unit=fahrenheit',call.call_args.args[0])
    def test_invalid_requests_do_not_reach_network(self):
        with patch('weather.urlopen') as call:
            for lat,lon,day in [(91,0,self.day),(0,'nan',self.day),(0,0,'2020-01-01'),(0,0,'bad')]:
                with self.assertRaises((ValueError,TypeError)):
                    weather.forecast(lat,lon,day)
            call.assert_not_called()
    def test_missing_forecast_is_not_fabricated(self):
        for high in [None,'warm',float('nan'),999,True]:
            payload={'daily':{'time':[self.day],'temperature_2m_max':[high],'weather_code':[0]}}
            with patch('weather.urlopen',return_value=io.BytesIO(json.dumps(payload).encode())):
                with self.assertRaises(ValueError):weather.forecast(37,-122,self.day)
    def test_selected_city_includes_valid_timezone_only(self):
        payload={'results':[{'name':'Test city','latitude':37.7,'longitude':-122.4,'timezone':'America/Los_Angeles'}]}
        with patch('places.urlopen',return_value=io.BytesIO(json.dumps(payload).encode())):
            self.assertEqual(places.lookup('Test city')['places'][0]['timezone'],'America/Los_Angeles')
        places.lookup.cache_clear();payload['results'][0]['timezone']='not-a-zone'
        with patch('places.urlopen',return_value=io.BytesIO(json.dumps(payload).encode())):
            self.assertNotIn('timezone',places.lookup('Test city')['places'][0])
