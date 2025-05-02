#py_utils/daily_balance_history.py

import sqlite3, os, logging
from datetime import datetime

log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # Logs to the console
    ]
)
logger = logging.getLogger(__name__)


def daily_balance_history_insert(db_path):
    logger.info(f"daily_balance_history_insert executed at {datetime.now()}")
    from SparkyBudget import db_lock  # Import the db_lock from your app or shared module
    with db_lock:  # Synchronize database access
        try:
            # Connect to the SQLite database with the 'with' statement to auto-close the connection
            with sqlite3.connect(db_path) as conn:
                cursor = conn.cursor()

                # Insert new records from F_Balance into F_Balance_History
                cursor.execute(
                    """
                    INSERT INTO F_Balance_History (
                        Date, AccountID, AccountName, BalanceDate, Balance, AvailableBalance, 
                        OrganizationDomain, OrganizationName, OrganizationSFInURL, 
                        DisplayAccountName, AccountTypeKey
                    )
                    SELECT 
                        DATE('now'), -- Current date
                        AccountID, 
                        AccountName, 
                        BalanceDate, 
                        Balance, 
                        AvailableBalance, 
                        OrganizationDomain, 
                        OrganizationName, 
                        OrganizationSFInURL, 
                        DisplayAccountName, 
                        AccountTypeKey
                    FROM F_Balance
                    """
                )

                # Commit the changes to the database (with 'with' statement, this is handled automatically)
                conn.commit()

        except sqlite3.Error as e:
            logger.error(f"An error occurred: {e}")

# Call the function
#daily_balance_history_insert()
