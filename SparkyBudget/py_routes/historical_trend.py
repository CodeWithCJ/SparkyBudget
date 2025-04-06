# py_routes/historical_trend.py

from flask import Blueprint, jsonify, request, render_template  
from flask_login import login_required
import sqlite3, re
from datetime import datetime,timedelta, date
from flask import request, jsonify
import os, logging
import hashlib


log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger(__name__)

historical_trend_bp = Blueprint('historical_trend', __name__)

@historical_trend_bp.route("/historical_trend")
@login_required
def historical_trend():
    # Connect to the SQLite database
    conn = sqlite3.connect("SparkyBudget.db")  # Replace with the actual name of your SQLite database file
    cursor = conn.cursor()

    # Default parameters
    current_date = datetime.now()

    # Calculate default start date (first day of the current month)
    default_start_date = (current_date - timedelta(days=current_date.day - 1)).strftime("%m/%d/%Y")

    # Calculate default end date (current date)
    default_end_date = current_date.strftime("%m/%d/%Y")

    # Retrieve start and end dates from the request or use default values
    start_date_param = request.args.get("start_date", default_start_date)
    end_date_param = request.args.get("end_date", default_end_date)

    # Convert start_date_param and end_date_param to Y-M-D format
    start_date = datetime.strptime(start_date_param, "%m/%d/%Y").strftime("%Y-%m-%d")
    end_date = datetime.strptime(end_date_param, "%m/%d/%Y").strftime("%Y-%m-%d")

    # Execute the SQL query for analyzing transactions
    custom_report_query = """
        SELECT  
            CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) as TransactionYear,
            strftime('%m', a11.TransactionPosted) as TransactionMonth,
            CASE strftime('%m', TransactionPosted) 
                WHEN '01' THEN 'Jan'
                WHEN '02' THEN 'Feb'
                WHEN '03' THEN 'Mar'
                WHEN '04' THEN 'Apr'
                WHEN '05' THEN 'May'
                WHEN '06' THEN 'Jun'
                WHEN '07' THEN 'Jul'
                WHEN '08' THEN 'Aug'
                WHEN '09' THEN 'Sep'
                WHEN '10' THEN 'Oct'
                WHEN '11' THEN 'Nov'
                WHEN '12' THEN 'Dec'
                ELSE NULL
            END as FormattedTransactionMonth,
            strftime('%m/%d/%Y', a11.TransactionPosted) as TransactionPosted,               
            a11.TransactionDescription,
            a11.TransactionPayee,
            Coalesce(a11.SubCategory,'Unknown') as SubCategory,
            TransactionKey,
            ROUND(SUM(Coalesce(a11.TransactionAmountNew,a11.TransactionAmount,0)), 2) AS TransactionAmount
        FROM
            F_Transaction a11
        WHERE
            TransactionPosted BETWEEN ? AND ?
        GROUP BY
            CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) ,
            strftime('%b', a11.TransactionPosted) ,
            CASE strftime('%m', TransactionPosted) 
                WHEN '01' THEN 'Jan'
                WHEN '02' THEN 'Feb'
                WHEN '03' THEN 'Mar'
                WHEN '04' THEN 'Apr'
                WHEN '05' THEN 'May'
                WHEN '06' THEN 'Jun'
                WHEN '07' THEN 'Jul'
                WHEN '08' THEN 'Aug'
                WHEN '09' THEN 'Sep'
                WHEN '10' THEN 'Oct'
                WHEN '11' THEN 'Nov'
                WHEN '12' THEN 'Dec'
                ELSE NULL
            END ,
            strftime('%m/%d/%Y', a11.TransactionPosted),               
            a11.TransactionDescription,
            a11.TransactionPayee,
            Coalesce(a11.SubCategory,'Unknown'),
            TransactionKey
        ORDER BY a11.TransactionPosted DESC
    """

    # Add the selected payees to the parameter list
    query_params = [start_date, end_date]

    # Execute the SQL query
    logger.debug("query:", query_params)
    cursor.execute(custom_report_query, query_params)

    # Fetch the query result
    transaction_data = cursor.fetchall()

    # Close the database connection
    conn.close()

    # Render the template with the fetched data for transaction analysis
    return render_template("historical_trend.html.jinja", transaction_data=transaction_data)


@historical_trend_bp.route("/get_transaction_data", methods=["POST"])
@login_required
def get_transaction_data():
    try:
        # Get JSON data from the request
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        start_date_param = data.get("start_date")
        end_date_param = data.get("end_date")

        if not start_date_param or not end_date_param:
            return jsonify({"error": "Start date and end date are required"}), 400

        # Convert dates to Y-M-D format for SQLite
        start_date = datetime.strptime(start_date_param, "%m/%d/%Y").strftime("%Y-%m-%d")
        end_date = datetime.strptime(end_date_param, "%m/%d/%Y").strftime("%Y-%m-%d")

        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Same query as in historical_trend
        custom_report_query = """
            SELECT  
                CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) as TransactionYear,
                strftime('%m', a11.TransactionPosted) as TransactionMonth,
                CASE strftime('%m', TransactionPosted) 
                    WHEN '01' THEN 'Jan'
                    WHEN '02' THEN 'Feb'
                    WHEN '03' THEN 'Mar'
                    WHEN '04' THEN 'Apr'
                    WHEN '05' THEN 'May'
                    WHEN '06' THEN 'Jun'
                    WHEN '07' THEN 'Jul'
                    WHEN '08' THEN 'Aug'
                    WHEN '09' THEN 'Sep'
                    WHEN '10' THEN 'Oct'
                    WHEN '11' THEN 'Nov'
                    WHEN '12' THEN 'Dec'
                    ELSE NULL
                END as FormattedTransactionMonth,
                strftime('%m/%d/%Y', a11.TransactionPosted) as TransactionPosted,               
                a11.TransactionDescription,
                a11.TransactionPayee,
                Coalesce(a11.SubCategory,'Unknown') as SubCategory,
                TransactionKey,
                ROUND(SUM(Coalesce(a11.TransactionAmountNew,a11.TransactionAmount,0)), 2) AS TransactionAmount
            FROM
                F_Transaction a11
            WHERE
                TransactionPosted BETWEEN ? AND ?
            GROUP BY
                CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) ,
                strftime('%b', a11.TransactionPosted) ,
                CASE strftime('%m', TransactionPosted) 
                    WHEN '01' THEN 'Jan'
                    WHEN '02' THEN 'Feb'
                    WHEN '03' THEN 'Mar'
                    WHEN '04' THEN 'Apr'
                    WHEN '05' THEN 'May'
                    WHEN '06' THEN 'Jun'
                    WHEN '07' THEN 'Jul'
                    WHEN '08' THEN 'Aug'
                    WHEN '09' THEN 'Sep'
                    WHEN '10' THEN 'Oct'
                    WHEN '11' THEN 'Nov'
                    WHEN '12' THEN 'Dec'
                    ELSE NULL
                END ,
                strftime('%m/%d/%Y', a11.TransactionPosted),               
                a11.TransactionDescription,
                a11.TransactionPayee,
                Coalesce(a11.SubCategory,'Unknown'),
                TransactionKey
            ORDER BY a11.TransactionPosted DESC
        """

        query_params = [start_date, end_date]
        cursor.execute(custom_report_query, query_params)
        transaction_data = cursor.fetchall()

        conn.close()

        # Return the data as JSON
        return jsonify({"transaction_data": transaction_data})

    except Exception as e:
        logger.error(f"Error fetching transaction data: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@historical_trend_bp.route("/salary_chart_data", methods=["GET"])
@login_required
def salary_chart_data():
#def chart_data():
    try:
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Your SQL query for line chart data
        salary_chart_data_query = """
            SELECT
                strftime('%Y-%m', TransactionPosted) AS SalaryMonth,
                ROUND(SUM(Coalesce(a11.TransactionAmountNew,a11.TransactionAmount,0)), 2) as Salary
            FROM
                F_Transaction a11
            WHERE
                SubCategory='Paycheck'
                AND strftime('%Y-%m', TransactionPosted) >= strftime('%Y-%m', 'now', '-6 months')
            GROUP BY
                strftime('%Y-%m', TransactionPosted)
            ORDER BY
                SalaryMonth ASC
        """

        cursor.execute(salary_chart_data_query)
        salary_chart_data = cursor.fetchall()

        conn.close()

        # Return the line chart data as JSON
        return jsonify(salary_chart_data)

    except Exception as e:
        # Print the exception details
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@historical_trend_bp.route("/splitTransaction", methods=["POST"])
@login_required
def split_transaction():
    try:
        # Get JSON data from the request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received!"}), 400

        # Extract fields from JSON
        transaction_key = data.get("transactionKey")
        split_amount = data.get("splitAmount")
        new_subcategory = data.get("newSubcategory")
        
        logger.debug("Split Transaction:", transaction_key, split_amount, new_subcategory)
        
        # Validate inputs
        if not transaction_key or split_amount is None or not new_subcategory:
            return jsonify({"error": "Invalid data received!"}), 400

        # Convert split_amount to float and handle potential issues
        try:
            split_amount = float(split_amount)
        except (ValueError, TypeError):
            return jsonify({"error": "Split amount must be a valid number!"}), 400

        # Connect to the database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Fetch the original transaction details using TransactionKey
        cursor.execute(
            "SELECT AccountID, AccountName, TransactionID, TransactionAmount, SubCategory, TransactionPosted, TransactionDescription, TransactionPayee FROM F_Transaction WHERE TransactionKey = ?", 
            (transaction_key,)
        )
        original_transaction = cursor.fetchone()

        if not original_transaction:
            return jsonify({"error": "Transaction not found!"}), 404

        account_id, account_name, original_transaction_id, original_amount, original_subcategory, transaction_date, description, payee = original_transaction

        # Ensure the split amount has the correct sign
        if (original_amount < 0 and split_amount > 0) or (original_amount > 0 and split_amount < 0):
            split_amount = -split_amount  # Convert the split amount to match the original transaction sign

        # Validate that split amount is not greater than the original amount (absolute value comparison)
        if abs(split_amount) >= abs(original_amount) or abs(split_amount) <= 0:
            return jsonify({"error": "Invalid split amount!"}), 400

        # Check if the TransactionID ends with a _digit
        match = re.match(r"(.+?)_(\d+)$", original_transaction_id)
        if match:
            base_id = match.group(1)  # Extract base part (before the last underscore)
            max_suffix = int(match.group(2))  # Get the current suffix number
            new_transaction_id = f"{base_id}_{max_suffix + 1}"  # Increment suffix
        else:
            base_id = original_transaction_id  # No suffix, so it's the first split
            new_transaction_id = f"{base_id}_1"  # Create the first split transaction

        # Insert the new transaction for the split amount
        cursor.execute(
            "INSERT INTO F_Transaction (AccountID, AccountName, TransactionID, TransactionAmount, SubCategory, TransactionPosted, TransactionDescription, TransactionPayee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (account_id, account_name, new_transaction_id, split_amount, new_subcategory, transaction_date, description, payee)
        )

        # Update the original transaction amount (subtract the split amount)
        new_original_amount = original_amount - split_amount
        cursor.execute("UPDATE F_Transaction SET TransactionAmountNew = ? WHERE TransactionKey = ?", (new_original_amount, transaction_key))

        # Commit changes and close connection
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Transaction split successfully!"})

    except Exception as e:
        logger.error(f"Error splitting transaction: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to split transaction! {str(e)}"}), 500
    


@historical_trend_bp.route("/getAccounts", methods=["GET"])
@login_required
def get_accounts():
    try:
        # Connect to the database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Query to fetch DisplayAccountName or AccountName
        query = """
            SELECT 
                AccountID, 
                CASE 
                    WHEN DisplayAccountName IS NOT NULL AND DisplayAccountName != '' THEN DisplayAccountName 
                    ELSE AccountName 
                END AS AccountDisplayName
            FROM F_Balance
        """
        cursor.execute(query)
        accounts = cursor.fetchall()

        # Close the database connection
        conn.close()

        # Format the data for select2
        account_list = [{"id": account[0], "text": account[1]} for account in accounts]

        # Log the retrieved accounts
        logger.info(f"Retrieved {len(account_list)} accounts for select2 dropdown.")

        # Return the data as JSON
        return jsonify(account_list)

    except Exception as e:
        logger.error(f"Error retrieving accounts: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to retrieve accounts! {str(e)}"}), 500
    


@historical_trend_bp.route("/addTransaction", methods=["POST"])
@login_required
def add_transaction():
    try:
        # Parse the JSON data from the request
        data = request.json

        # Generate a unique TransactionID based on the provided data
        transaction_id = hashlib.md5(
            f"{data['accountID']}{data['payee']}{data['description']}{data['transactionDate']}{data['amount']}".encode()
        ).hexdigest()

        # SQL query to insert the new transaction
        query = """
            INSERT INTO F_Transaction (
                AccountID, AccountName, TransactionID, TransactionPosted,
                TransactionAmount, TransactionDescription, TransactionPayee,
                TransactionMemo, SubCategory
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        values = (
            data['accountID'], data['accountName'], transaction_id, data['transactionDate'],
            data['amount'], data['description'], data['payee'], data['memo'], data['subcategory']
        )

        # Connect to the database and execute the query
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()
        cursor.execute(query, values)
        conn.commit()
        conn.close()

        # Log the successful addition of the transaction
        logger.info(f"Transaction added successfully: {transaction_id}")

        return jsonify({'success': True, 'message': 'Transaction added successfully!'})

    except Exception as e:
        # Log the error and return a failure response
        logger.error(f"Error adding new transaction: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': f"Failed to add transaction: {str(e)}"}), 500
    



@historical_trend_bp.route("/income_expense_chart", methods=["POST"])
@login_required
def income_expense_chart():
    try:
        # Get JSON data from the request
        data = request.get_json()
        if not data:
            logger.warning("No data provided in request.")
            return jsonify({"error": "No data provided"}), 400

        start_date_param = data.get("start_date")
        end_date_param = data.get("end_date")

        # Handle missing date parameters: Default to last 6 months
        if not start_date_param or not end_date_param:
            end_date = date.today()
            start_date = end_date - timedelta(days=6 * 30)  # Approximate 6 months
            start_date_str = start_date.strftime("%Y-%m-%d")
            end_date_str = end_date.strftime("%Y-%m-%d")
            logger.info(f"Using default date range: {start_date_str} to {end_date_str}")
        else:
            # Convert dates to YYYY-MM-DD format for SQLite (consistent with your DB)
            try:
                start_date = datetime.strptime(start_date_param, "%m/%d/%Y").strftime("%Y-%m-%d")
                end_date = datetime.strptime(end_date_param, "%m/%d/%Y").strftime("%Y-%m-%d")
                logger.info(f"Using provided date range: {start_date} to {end_date}")
            except ValueError as e:
                logger.error(f"Invalid date format provided: {str(e)}")
                return jsonify({"error": "Invalid date format. Use MM/DD/YYYY."}), 400

        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # SQL query (using parameterized queries to prevent SQL injection)
        query = """
            SELECT
                YearMonth,
                CAST(SUM(Case WHEN Salary <>0 and NOT NULL then Salary else ProjectedSalary end ) as INTEGER) AS Income,                
                Sum(CAST(COALESCE(ExpenseAmount, 0) AS INTEGER)) AS ExpenseAmount,
                Sum(CAST(COALESCE(BudgetAmount, 0) AS INTEGER)) AS BudgetAmount
            FROM (
                SELECT
                    strftime('%Y-%m', a11.BudgetMonth) AS YearMonth,
                    ROUND(SUM(
                        CASE
                            WHEN a11.SubCategory IN ('Paycheck') THEN BudgetAmount
                            ELSE NULL
                        END
                    ), 2) AS ProjectedSalary,
                    ROUND(SUM(
                        CASE
                            WHEN a11.SubCategory NOT IN ('CC Payment', 'Money Transfer','Paycheck')
                            THEN BudgetAmount
                            ELSE NULL
                        END
                    ), 2) AS BudgetAmount,
                    NULL AS ExpenseAmount,
                    NULL AS Salary
                FROM
                    F_Budget a11
                WHERE a11.BudgetMonth BETWEEN ? AND ?                    
                GROUP BY strftime('%Y-%m', a11.BudgetMonth)
                UNION ALL
                SELECT
                    strftime('%Y-%m', a11.TransactionPosted) AS YearMonth,
                    NULL AS ProjectedSalary,
                    NULL AS BudgetAmount,
                    ABS(ROUND(SUM(COALESCE(a11.TransactionAmountNew, a11.TransactionAmount, 0)), 2)) AS ExpenseAmount,
                    NULL AS Salary
                FROM
                    F_Transaction a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                    LEFT JOIN F_Balance a13 on (a11.AccountID=a13.AccountID)
                    LEFT JOIN D_AccountTypes a14
                    ON a13.AccountTypeKey = a14.AccountTypeKey
                WHERE
                    HideFromBudget=0 AND                                   
                   Coalesce(a11.SubCategory,'Unknown') NOT IN ('CC Payment', 'Money Transfer','Paycheck')
                    AND a11.TransactionPosted BETWEEN ? AND ?
                GROUP BY strftime('%Y-%m', a11.TransactionPosted)
                UNION ALL
                SELECT
                    strftime('%Y-%m', a11.TransactionPosted) AS YearMonth,
                    NULL AS ProjectedSalary,
                    NULL AS BudgetAmount,
                    NULL AS ExpenseAmount,
                    ROUND(SUM(COALESCE(a11.TransactionAmountNew, a11.TransactionAmount, 0)), 2) AS Salary
                FROM
                    F_Transaction a11
                WHERE
                    a11.SubCategory IN ('Paycheck')  -- Replace 'Paycheck' with your income subcategories
                    AND a11.TransactionPosted BETWEEN ? AND ?
                GROUP BY strftime('%Y-%m', a11.TransactionPosted)
            )
            GROUP BY YearMonth
            ORDER BY YearMonth ASC;
        """
        # Execute the query with the date range parameters (6 times for the 3 UNION ALL parts)
        params = [start_date, end_date] * 3
        cursor.execute(query, params)
        results = cursor.fetchall()
        conn.close()

        # Format the results as a list of dictionaries
        formatted_results = []
        for row in results:
            formatted_results.append({
                "YearMonth": row[0],
                "Income": row[1],
                "ExpenseAmount": row[2],
                "BudgetAmount": row[3]
            })

        # Return the data as JSON
        return jsonify({"data": formatted_results})

    except sqlite3.Error as e:
        logger.error(f"SQLite error: {str(e)}", exc_info=True)
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"An unexpected error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    
