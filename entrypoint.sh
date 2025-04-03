#!/bin/bash
python py_utils/scheduler.py &
exec gunicorn -b :5000 --timeout 120 --workers 4 --threads 4 SparkyBudget:app