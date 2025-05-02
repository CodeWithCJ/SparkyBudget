import sys
import os
import schedule
import time
import threading
from datetime import datetime
import logging

log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # Logs to the console
    ]
)
logger = logging.getLogger(__name__)

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.insert(0, parent_dir)

from py_utils.monthly_budget_insert import month_budget_update_using_template
from py_utils.daily_balance_history import daily_balance_history_insert
from py_utils.SimpleFinToDB import process_accounts_data

# Global variable for private data path, defined directly
PRIVATE_DATA_PATH_SCHEDULER = '/private'

# Global variable for database path, defined directly
DATABASE_PATH_SCHEDULER = '/private/db/SparkyBudget.db'

def setup_scheduler():
    logger.info(f"Setting up scheduler at {datetime.now()} with timezone {time.tzname}")
    schedule.every().day.at("01:00").do(
        lambda: run_with_error_handling("Monthly Budget Update", lambda: month_budget_update_using_template(DATABASE_PATH_SCHEDULER))
    )
    schedule.every().day.at("23:55").do(
        lambda: run_with_error_handling("Daily Balance History", lambda: daily_balance_history_insert(DATABASE_PATH_SCHEDULER))
    )
    schedule.every(4).hours.do(
        lambda: run_with_error_handling("Account Data Processing", lambda: process_accounts_data(PRIVATE_DATA_PATH_SCHEDULER))
    )
    # Test job for debugging
    #schedule.every(10).seconds.do(
    #    lambda: run_with_error_handling("Test Job", lambda: logger.info("Test job ran!"))
    #)
    #schedule.every(30).seconds.do(
    #    lambda: run_with_error_handling("Account Data Processing", process_accounts_data)
    #)

def run_with_error_handling(task_name, func):
    try:
        logger.info(f"Running {task_name} at {datetime.now()}")
        func()
        logger.info(f"Completed {task_name} successfully")
    except Exception as e:
        logger.error(f"Error in {task_name}: {str(e)}", exc_info=True)

def run_scheduler():
    setup_scheduler()
    logger.info(f"Scheduler started with {len(schedule.jobs)} jobs")
    while True:
        try:
            next_run = schedule.next_run()
            logger.debug(f"Next scheduled task: {next_run}")
            schedule.run_pending()
            time.sleep(10)
        except Exception as e:
            logger.error(f"Scheduler loop error: {str(e)}", exc_info=True)
            time.sleep(60)
            if not schedule.jobs:
                logger.warning("Scheduler jobs lost, reinitializing...")
                setup_scheduler()

def start_scheduler():
    scheduler_thread = threading.Thread(target=run_scheduler, name="SchedulerThread")
    scheduler_thread.daemon = True
    scheduler_thread.start()
    logger.info(f"Scheduler thread started - ID: {scheduler_thread.ident}")
    return scheduler_thread

if __name__ == "__main__":
    logger.info("Starting the scheduler as standalone...")
    start_scheduler()
    while True:
        time.sleep(60)  # Keep the main thread alive