import sqlite3
from datetime import datetime

def update_budget():
    # Connect to the SQLite database
    conn = sqlite3.connect('SparkyBudget.db')
    cursor = conn.cursor()

    # Check if it's the first day of the month
    if datetime.now().day == 1:
        # Insert new records from D_Budget into F_Budget
        cursor.execute("""
            INSERT OR IGNORE INTO F_Budget ("BudgetMonth", "SubCategory", "BudgetAmount")
            SELECT DATE('now', 'start of month') AS "BudgetMonth", "SubCategory", "BudgetAmount"
            FROM D_Budget
        """)

        # Update existing records in F_Budget if SubCategory already exists for the current month
        #cursor.execute("""
        #    UPDATE F_Budget
        #    SET "BudgetAmount" = (SELECT "BudgetAmount" FROM D_Budget WHERE F_Budget."SubCategory" = D_Budget."SubCategory"),
        #        "BudgetMonth" = DATE('now', 'start of month')
        #    WHERE EXISTS (
        #        SELECT 1 
        #        FROM D_Budget 
        #        WHERE F_Budget."SubCategory" = D_Budget."SubCategory"
        #    ) AND "BudgetMonth" = DATE('now', 'start of month')
        #""")

        # Commit the changes to the database
        conn.commit()

    # Close the database connection
    conn.close()
