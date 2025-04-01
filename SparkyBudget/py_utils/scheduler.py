import schedule
import time
import threading
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from py_utils.monthly_budget_insert import month_budget_update_using_template
from py_utils.daily_balance_history import daily_balance_history_insert
from py_utils.SimpleFinToDB import process_accounts_data

def setup_scheduler():
    logger.info(f"Setting up scheduler at {datetime.now()}")
    # Schedule tasks with error handling
    schedule.every().day.at("01:00").do(
        lambda: run_with_error_handling("Monthly Budget Update", month_budget_update_using_template)
    )
    schedule.every().day.at("23:55").do(
        lambda: run_with_error_handling("Daily Balance History", daily_balance_history_insert)
    )
    schedule.every(4).hours.do(
        lambda: run_with_error_handling("Account Data Processing", process_accounts_data)
    )
    # For testing: Uncomment to check if scheduler runs
    # schedule.every(1).minutes.do(
    #     lambda: run_with_error_handling("Test Job", process_accounts_data)
    # )

def run_with_error_handling(task_name, func):
    """Wrapper to handle errors in scheduled tasks"""
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
            time.sleep(60)  # Wait longer if there's an error

def start_scheduler():
    scheduler_thread = threading.Thread(target=run_scheduler, name="SchedulerThread")
    scheduler_thread.daemon = True
    scheduler_thread.start()
    logger.info(f"Scheduler thread started - ID: {scheduler_thread.ident}")

    # Monitor scheduler health
    def monitor_scheduler():
        while True:
            pending_jobs = len(schedule.jobs)
            logger.info(f"Scheduler status - Alive: {scheduler_thread.is_alive()}, "
                       f"Pending jobs: {pending_jobs}, "
                       f"Next run: {schedule.next_run()}")
            if pending_jobs == 0:
                logger.warning("No jobs in scheduler, resetting...")
                setup_scheduler()
            time.sleep(300)  # Log every 5 minutes

    monitor_thread = threading.Thread(target=monitor_scheduler, daemon=True)
    monitor_thread.start()
    
    return scheduler_thread