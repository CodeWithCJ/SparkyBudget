#py_utils/daily_balance_history.py

import sqlite3
from datetime import datetime


def daily_balance_history_insert(db_name="SparkyBudget.db"):
    print(f"daily_balance_history_insert executed at {datetime.now()}")
    from SparkyBudget import db_lock  # Import the db_lock from your app or shared module
    with db_lock:  # Synchronize database access
        try:
            # Connect to the SQLite database with the 'with' statement to auto-close the connection
            with sqlite3.connect(db_name) as conn:
                cursor = conn.cursor()

                # Insert new records from F_Balance into F_Balance_History
                cursor.execute(
                    """
                    INSERT INTO F_Balance_History (
                        Date, AccountID, AccountName, BalanceDate, Balance, AvailableBalance, 
                        OrganizationDomain, OrganizationName, OrganizationSFInURL, 
                        DisplayAccountName, AccountType
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
                        AccountType
                    FROM F_Balance a11
                    LEFT JOIN D_AccountTypes a12
                    ON a11.AccountTypeKey = a12.AccountTypeKey
                    """
                )

                # Commit the changes to the database (with 'with' statement, this is handled automatically)
                conn.commit()

        except sqlite3.Error as e:
            print(f"An error occurred: {e}")

# Call the function
#daily_balance_history_insert()
