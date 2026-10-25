#!/usr/bin/env python3
"""Compatibility command: set up the shared photo environment and background removal."""
import sys
from setup_photos import main

if __name__ == '__main__':
    sys.exit(main([*sys.argv[1:], '--background']))
