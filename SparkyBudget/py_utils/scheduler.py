import schedule
import time
import threading
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from py_utils.monthly_budget_insert import month_budget_update_using_template
from py_utils.daily_balance_history import daily_balance_history_insert
from py_utils.SimpleFinToDB import process_accounts_data

def setup_scheduler():
    logger.info(f"Setting up scheduler at {datetime.now()}")
    schedule.every().day.at("01:00").do(lambda: logger.info(f"Running monthly budget update at {datetime.now()}") or month_budget_update_using_template())
    schedule.every().day.at("23:55").do(lambda: logger.info(f"Running daily balance history at {datetime.now()}") or daily_balance_history_insert())
    schedule.every(4).hours.do(lambda: logger.info(f"Running account data processing at {datetime.now()}") or process_accounts_data())
    #schedule.every(1).minutes.do(lambda: logger.info(f"Running account data processing at {datetime.now()}") or process_accounts_data())

def run_scheduler():
    setup_scheduler()
    while True:
        next_run = schedule.next_run()
        #logger.info(f"Next scheduled task: {next_run}")
        schedule.run_pending()
        time.sleep(10)

def start_scheduler():
    scheduler_thread = threading.Thread(target=run_scheduler)
    scheduler_thread.daemon = True
    scheduler_thread.start()
    logger.info("Scheduler thread started")
    return scheduler_thread