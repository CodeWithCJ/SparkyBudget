#py_routes/home.py

import sqlite3
from flask import Blueprint, render_template, jsonify, request 
from flask_login import login_required
from datetime import datetime, timezone

home_bp = Blueprint('home', __name__)

@home_bp.route('/')
@login_required
def index():
    # Connect to the SQLite database
    conn = sqlite3.connect(
        "SparkyBudget.db", detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
    )  # Replace with the actual name of your SQLite database file
    cursor = conn.cursor()
    # Fetch data for the first table: OrganizationName, sum(Balance), sum(AvailableBalance)
    cursor.execute(
        """
        SELECT AccountType,TotalBalance,TotalAvailableBalance FROM (
            SELECT
                AccountType,
                SortOrder,
                ROUND(SUM(Balance), 2) AS TotalBalance,
                ROUND(SUM(AvailableBalance), 2) AS TotalAvailableBalance
            FROM
                F_Balance a11
                LEFT JOIN D_AccountTypes a12
                ON a11.AccountTypeKey = a12.AccountTypeKey             
            GROUP BY
                AccountType,
                SortOrder

            UNION ALL

            SELECT
                'Net Cash' AS AccountType,
                -1 AS SortOrder,
                ROUND(SUM(Balance), 2) AS TotalBalance,
                ROUND(SUM(AvailableBalance), 2) AS TotalAvailableBalance
            FROM
                F_Balance a11
            LEFT JOIN D_AccountTypes a12
            ON a11.AccountTypeKey = a12.AccountTypeKey
            WHERE AccountType IN ('Checking', 'Savings', 'Credit Card')

            UNION ALL

            SELECT
                'Net Worth' AS AccountType,
                1000 AS SortOrder,
                ROUND(SUM(Balance), 2) AS TotalBalance,
                ROUND(SUM(AvailableBalance), 2) AS TotalAvailableBalance
            FROM
                F_Balance a11
            LEFT JOIN D_AccountTypes a12
            ON a11.AccountTypeKey = a12.AccountTypeKey            
        )
        ORDER BY
            SortOrder;
        """
    )
    account_type_data = cursor.fetchall()
    labels = list(zip(*account_type_data))[0]
    balances = list(zip(*account_type_data))[1]
    cursor.execute(
        """
        SELECT
            AccountType,
            Coalesce(DisplayAccountName, AccountName) as AccountName,
            ROUND(SUM(Balance), 2) AS TotalBalance,
            ROUND(SUM(AvailableBalance), 2) AS TotalAvailableBalance,
            ABS(SUM(Balance)) + ABS(SUM(AvailableBalance)) as Dummy
        FROM
            F_Balance a11
            LEFT JOIN D_AccountTypes a12
            ON a11.AccountTypeKey = a12.AccountTypeKey
        WHERE AccountType not in ('Hide')
        GROUP BY
            AccountType,
            Coalesce(DisplayAccountName, AccountName)
        ORDER BY
            SortOrder,
            5 desc
        """
    )
    account_type_banak_data = cursor.fetchall()
    # Fetch data for the second table: OrganizationName, AccountName, FormattedBalanceDate, Balance, AvailableBalance
    cursor.execute(
        """
        SELECT AccountKey,
                COALESCE(AccountType,'UNKNOWN'),
                OrganizationName,
                Coalesce(DisplayAccountName,AccountName) as AccountName,
                DATE(BalanceDate) AS "[date]",
                ROUND(Balance, 2) AS Balance,
                ROUND(AvailableBalance, 2) AS AvailableBalance
        FROM F_Balance a11
             LEFT JOIN D_AccountTypes a12
             ON a11.AccountTypeKey = a12.AccountTypeKey        
        ORDER BY COALESCE(SortOrder,999),OrganizationName, Coalesce(DisplayAccountName, AccountName)
    """
    )
    bank_account_name_balance_details = cursor.fetchall()
    # Fetch distinct Transaction Years and Months for filters
    cursor.execute(
        'SELECT DISTINCT CAST(strftime("%Y", TransactionPosted) AS INTEGER) AS Year FROM F_Transaction ORDER BY Year DESC'
    )
    transaction_years = [row[0] for row in cursor.fetchall()]
    cursor.execute('SELECT DISTINCT strftime("%m", TransactionPosted) AS Month FROM F_Transaction ORDER BY Month DESC')
    transaction_months = [row[0] for row in cursor.fetchall()]
    # Query for daily balance data (the one you need to display)
    daily_balance_query = """
        SELECT
            AccountType,
            COALESCE(DisplayAccountName, AccountName) AS AccountName,
            Date,
            ROUND(SUM(CASE WHEN COALESCE(AvailableBalance, 0) <> 0 THEN AvailableBalance ELSE Balance END), 0) AS DailyBalance
        FROM
            F_Balance_History a11
            LEFT JOIN D_AccountTypes a12
            ON a11.AccountTypeKey = a12.AccountTypeKey
        WHERE
            (COALESCE(AvailableBalance, 0) <> 0 OR COALESCE(Balance, 0) <> 0)
        GROUP BY
            AccountType, COALESCE(DisplayAccountName, AccountName), Date
        ORDER BY
            Date, AccountType, COALESCE(DisplayAccountName, AccountName) ASC
    """
    # Execute the daily balance query
    cursor.execute(daily_balance_query)
    daily_balance_data = cursor.fetchall()
    # Close the database connection
    conn.close()
    # Render the template with the fetched data and filters, including transaction_years
    return render_template(
        "index.html.jinja",
        account_type_data=account_type_data,
        account_type_banak_data=account_type_banak_data,
        bank_account_name_balance_details=bank_account_name_balance_details,
        transaction_years=transaction_years,
        transaction_months=transaction_months,
        now=datetime.now(timezone.utc),
        labels=labels,
        balances=balances,
        daily_balance_data=daily_balance_data  # Add the new daily balance data
    )
    
    
# In app.py

# Route to fetch all AccountTypes for the dropdown (unchanged)
@home_bp.route("/get_account_types", methods=["GET"])
@login_required
def get_account_types():
    try:
        conn = sqlite3.connect("SparkyBudget.db", detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
        cursor = conn.cursor()
        cursor.execute("SELECT AccountTypeKey, AccountType FROM D_AccountTypes ORDER BY AccountType")
        account_types = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "account_types": [{"key": row[0], "type": row[1]} for row in account_types]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

# Route to update DisplayAccountName (updated to use AccountKey)
@home_bp.route("/update_display_account_name", methods=["POST"])
@login_required
def update_display_account_name():
    try:
        # Log the incoming request data
        data = request.get_json()
        print("Received data for update_display_account_name:", data)
        
        # Validate input
        account_key = data.get("account_key")
        new_display_name = data.get("display_account_name")
        if account_key is None:
            raise ValueError("account_key must be provided")
        if new_display_name is None or not isinstance(new_display_name, str):
            raise ValueError("display_account_name must be a string")

        # Convert empty string to None to set NULL in the database
        if new_display_name.strip() == '':
            new_display_name = None
            print("Converted empty string to None for DisplayAccountName")

        # Ensure account_key is the correct type (assuming it's an integer in the database)
        try:
            account_key = int(account_key)
        except (ValueError, TypeError):
            raise ValueError("account_key must be a valid integer")

        # Connect to the database
        conn = sqlite3.connect("SparkyBudget.db", detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
        cursor = conn.cursor()
        
        # Execute the update
        cursor.execute(
            """
            UPDATE F_Balance
            SET DisplayAccountName = ?
            WHERE AccountKey = ?
            """,
            (new_display_name, account_key)
        )
        
        # Log the number of affected rows
        print(f"Rows updated: {cursor.rowcount}")
        
        # Commit the transaction
        conn.commit()
        
        # Close the connection
        conn.close()
        
        return jsonify({"success": True, "message": "DisplayAccountName updated successfully."})
    
    except Exception as e:
        # Log the error for debugging
        print(f"Error in update_display_account_name: {str(e)}")
        # Ensure the connection is closed even in case of an error
        if 'conn' in locals():
            conn.close()
        return jsonify({"success": False, "message": str(e)}), 400

# Route to update AccountTypeKey (updated to use AccountKey)
@home_bp.route("/update_account_type", methods=["POST"])
@login_required
def update_account_type():
    try:
        data = request.get_json()
        account_key = data.get("account_key")  # Use AccountKey to identify the row
        new_account_type_key = data.get("account_type_key")

        conn = sqlite3.connect("SparkyBudget.db", detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE F_Balance
            SET AccountTypeKey = ?
            WHERE AccountKey = ?
            """,
            (new_account_type_key, account_key)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "AccountType updated successfully."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})