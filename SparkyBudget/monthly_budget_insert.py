import sqlite3
from datetime import datetime


def month_budget_update_using_template():
    print(f"month_budget_update_using_template executed at {datetime.now()}")
    from app import db_lock  # Import the db_lock from your app or shared module
    # Ensure that only one thread/process can access the DB at a time
    with db_lock:
        # Use the `with` statement to manage the SQLite connection and cursor
        with sqlite3.connect("SparkyBudget.db") as conn:
            cursor = conn.cursor()

            # Check if it's the first day of the month
            if datetime.now().day == 1:
                # Insert new records from D_Budget into F_Budget
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO F_Budget ("BudgetMonth", "SubCategory", "BudgetAmount")
                    SELECT DATE('now', 'start of month') AS "BudgetMonth", "SubCategory", "BudgetAmount"
                    FROM D_Budget
                    """
                )

                # Uncomment and update this section if needed
                # Update existing records in F_Budget if SubCategory already exists for the current month
                # cursor.execute("""
                #    UPDATE F_Budget
                #    SET "BudgetAmount" = (SELECT "BudgetAmount" FROM D_Budget WHERE F_Budget."SubCategory" = D_Budget."SubCategory"),
                #        "BudgetMonth" = DATE('now', 'start of month')
                #    WHERE EXISTS (
                #        SELECT 1
                #        FROM D_Budget
                #        WHERE F_Budget."SubCategory" = D_Budget."SubCategory"
                #    ) AND "BudgetMonth" = DATE('now', 'start of month')
                # """)

                # Commit the changes to the database
                conn.commit()

            # The connection and cursor are automatically closed at the end of the `with` block
