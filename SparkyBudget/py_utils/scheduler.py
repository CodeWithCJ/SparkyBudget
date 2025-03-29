#py_utils/scheduler.py

import schedule
import time
import threading
from datetime import datetime

# Import the functions that need to be scheduled
from py_utils.monthly_budget_insert import month_budget_update_using_template
from py_utils.daily_balance_history import daily_balance_history_insert
from py_utils.SimpleFinToDB import process_accounts_data

# Schedule the tasks
def setup_scheduler():
    # Schedule monthly budget update
    schedule.every().day.at("01:00").do(month_budget_update_using_template)
    
    # Schedule daily balance history insert
    schedule.every().day.at("23:55").do(daily_balance_history_insert)
    
    # Schedule account data processing
    schedule.every(4).hours.do(process_accounts_data)

# Run the scheduler in a background thread
def run_scheduler():
    setup_scheduler()
    while True:
        schedule.run_pending()
        time.sleep(10)

# Function to start the scheduler in a separate thread
def start_scheduler():
    scheduler_thread = threading.Thread(target=run_scheduler)
    scheduler_thread.daemon = True  # Set as daemon so it will exit when the main program exits
    scheduler_thread.start()
    return scheduler_thread