# py_routes/historical_trend.py

from flask import Blueprint, jsonify, request, render_template
from flask_login import login_required
import sqlite3, re
from datetime import datetime,timedelta

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
    print("query:", query_params)
    cursor.execute(custom_report_query, query_params)

    # Fetch the query result
    transaction_data = cursor.fetchall()

    # Close the database connection
    conn.close()

    # Render the template with the fetched data for transaction analysis
    return render_template("historical_trend.html.jinja", transaction_data=transaction_data)

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
        print(f"An error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

@historical_trend_bp.route("/splitTransaction", methods=["POST"])
@login_required
def split_transaction():
    try:
        # Get data from the frontend
        transaction_key = request.form.get("transactionKey")  # transactionKey is passed from the form
        split_amount = float(request.form.get("splitAmount"))
        new_subcategory = request.form.get("newSubcategory")
        
        print("Split Transaction:", transaction_key, split_amount, new_subcategory)
        
        if not transaction_key or not split_amount or not new_subcategory:
            return jsonify({"error": "Invalid data received!"}), 400

        # Connect to the database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Fetch the original transaction details using TransactionKey (since it's the column name)
        cursor.execute(
            "SELECT AccountID,AccountName,TransactionID, TransactionAmount, SubCategory, TransactionPosted, TransactionDescription, TransactionPayee FROM F_Transaction WHERE TransactionKey = ?", 
            (transaction_key,)
        )
        original_transaction = cursor.fetchone()

        if not original_transaction:
            return jsonify({"error": "Transaction not found!"}), 404

        account_id,account_name,original_transaction_id, original_amount, original_subcategory, transaction_date, description, payee = original_transaction

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
            "INSERT INTO F_Transaction (AccountID,AccountName,TransactionID, TransactionAmount, SubCategory, TransactionPosted, TransactionDescription, TransactionPayee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (account_id,account_name,new_transaction_id, split_amount, new_subcategory, transaction_date, description, payee)
        )

        # Update the original transaction amount (subtract the split amount)
        new_original_amount = original_amount - split_amount
        cursor.execute("UPDATE F_Transaction SET TransactionAmountNew = ? WHERE TransactionKey = ?", (new_original_amount, transaction_key))

        # Commit changes and close connection
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Transaction split successfully!"})

    except Exception as e:
        print(f"Error splitting transaction: {str(e)}")
        return jsonify({"error": f"Failed to split transaction! {str(e)}"}), 500