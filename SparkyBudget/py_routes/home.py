#py_routes/home.py

import sqlite3, os, logging
from flask import Blueprint, render_template, jsonify, request, current_app
from flask_login import login_required
from datetime import datetime


log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger(__name__)

home_bp = Blueprint('home', __name__)

@home_bp.route('/')
@login_required
def index():
    # Connect to the SQLite database
    conn = sqlite3.connect(
        current_app.config['DATABASE_PATH'], detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
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
        #now=datetime.now(timezone.utc),
        now = datetime.now(),
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
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'], detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
        cursor = conn.cursor()
        cursor.execute("SELECT AccountTypeKey, AccountType FROM D_AccountTypes ORDER BY AccountType")
        account_types = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "account_types": [{"key": row[0], "type": row[1]} for row in account_types]})
    except Exception as e:
        logger.error(f"Error fetching account types: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": str(e)})



@home_bp.route("/addAccount", methods=["POST"])
@login_required
def add_account():
    try:
        data = request.get_json()
        logger.info(f"Adding new account: {data}")

        query = """
            INSERT INTO F_Balance (
                AccountName, Balance, AvailableBalance, OrganizationDomain,
                OrganizationName, OrganizationSFInURL, BalanceDate, AccountTypeKey
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        values = (
            data['accountName'],
            data['balance'],
            data['availableBalance'],
            data['organizationDomain'],
            data['organizationName'],
            None,  # OrganizationSFInURL is not provided
            data['balanceDate'],
            data['accountTypeKey']
        )

        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()
        cursor.execute(query, values)
        conn.commit()
        conn.close()

        logger.info("Account added successfully.")
        return jsonify({"success": True, "message": "Account added successfully."})

    except Exception as e:
        logger.error(f"Error adding account: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 400
    



# Consolidated route to update all fields for an account
@home_bp.route("/update_account", methods=["POST"])
@login_required
def update_account():
    try:
        data = request.get_json()
        logger.debug("Received data for update_account:", data)

        account_key = data.get("account_key")
        account_type_key = data.get("account_type_key")
        display_account_name = data.get("display_account_name")
        balance_date = data.get("balance_date")
        balance = data.get("balance")
        available_balance = data.get("available_balance")

        # Validate required fields
        if account_key is None:
            raise ValueError("account_key must be provided")
        if account_type_key is None:
            raise ValueError("account_type_key must be provided")

        # Convert account_key to integer
        try:
            account_key = int(account_key)
        except (ValueError, TypeError):
            logger.error("Invalid account_key type:", account_key, exc_info=True)
            raise ValueError("account_key must be a valid integer")

        # Handle display_account_name: convert empty string to None
        if display_account_name is not None and display_account_name.strip() == '':
            display_account_name = None
            logger.debug("Converted empty string to None for DisplayAccountName")

        # Validate and convert numeric fields
        balance = float(balance) if balance is not None else 0.0
        available_balance = float(available_balance) if available_balance is not None else 0.0

        # Validate balance_date format (YYYY-MM-DD) if provided
        if balance_date:
            try:
                datetime.strptime(balance_date, '%Y-%m-%d')
            except ValueError:
                raise ValueError("balance_date must be in YYYY-MM-DD format")

        conn = sqlite3.connect(current_app.config['DATABASE_PATH'], detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
        cursor = conn.cursor()

        # Update all fields in a single query
        cursor.execute(
            """
            UPDATE F_Balance
            SET AccountTypeKey = ?,
                DisplayAccountName = ?,
                BalanceDate = ?,
                Balance = ?,
                AvailableBalance = ?
            WHERE AccountKey = ?
            """,
            (account_type_key, display_account_name, balance_date, balance, available_balance, account_key)
        )

        logger.debug(f"Rows updated: {cursor.rowcount}")

        # Fetch the updated row to return to the frontend
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
            WHERE AccountKey = ?
            """,
            (account_key,)
        )
        updated_row = cursor.fetchone()

        conn.commit()
        conn.close()

        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "No rows updated. AccountKey not found."}), 400

        return jsonify({
            "success": True,
            "message": "Account updated successfully.",
            "updated_row": updated_row
        })

    except Exception as e:
        logger.error(f"Error in update_account: {str(e)}", exc_info=True)
        if 'conn' in locals():
            conn.close()
        return jsonify({"success": False, "message": str(e)}), 400