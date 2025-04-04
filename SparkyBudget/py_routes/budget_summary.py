#py_routes/budget_summary.py

import sqlite3, os, logging
from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required




log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger(__name__)

budget_sumary_bp  = Blueprint('budget_sumary_bp', __name__)



@budget_sumary_bp.route("/budget_summary_pie_chart")
@login_required
def budget_summary_pie_chart():
    try:
        selected_year = request.args.get("year")
        selected_month = request.args.get("month")
        
        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()
        
        # SQL query (unchanged from your original)
        sql_query = """
            SELECT
                CAST(COALESCE(Salary, ProjectedSalary, 0) AS INTEGER) AS Salary,
                CAST(SUM(BudgetAmount) AS INTEGER) AS BudgetAmount,
                CAST(SUM(TotalTransactionAmount) AS INTEGER) AS TotalTransactionAmount
            FROM (
                SELECT
                    ROUND(SUM(
                        CASE
                            WHEN a11.SubCategory IN ('Paycheck') THEN BudgetAmount
                            ELSE NULL
                        END
                    ), 2) AS ProjectedSalary,
                    ROUND(SUM(
                        CASE
                            WHEN a11.SubCategory NOT IN ('CC Payment', 'Money Transfer') 
                            AND a12.Category NOT IN ('Income') THEN BudgetAmount
                            ELSE NULL
                        END
                    ), 2) AS BudgetAmount,
                    NULL AS TotalTransactionAmount,
                    NULL AS Salary
                FROM
                    F_Budget a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                WHERE
                    CAST(strftime('%Y', a11.BudgetMonth) AS TEXT) = ? 
                    AND strftime('%m', a11.BudgetMonth) = ?
                UNION ALL
                SELECT
                    NULL AS ProjectedSalary,
                    NULL AS BudgetAmount,
                    ROUND(COALESCE(a11.TransactionAmountNew, a11.TransactionAmount, 0), 2) AS TotalTransactionAmount,
                    NULL AS Salary
                FROM
                    F_Transaction a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                    LEFT JOIN F_Balance a13 ON (a11.AccountID = a13.AccountID)
                    LEFT JOIN D_AccountTypes a14 ON (a13.AccountTypeKey = a14.AccountTypeKey)
                WHERE
                    HideFromBudget = 0 
                    AND a11.SubCategory NOT IN ('CC Payment', 'Money Transfer') 
                    AND a12.Category NOT IN ('Income') 
                    AND CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) = ? 
                    AND strftime('%m', a11.TransactionPosted) = ?
                UNION ALL
                SELECT
                    NULL AS ProjectedSalary,
                    NULL AS BudgetAmount,
                    NULL AS TotalTransactionAmount,
                    ROUND(COALESCE(a11.TransactionAmountNew, a11.TransactionAmount, 0), 2) AS Salary
                FROM
                    F_Transaction a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                WHERE
                    a12.Category IN ('Income') 
                    AND CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) = ? 
                    AND strftime('%m', a11.TransactionPosted) = ?
            )
        """
        cursor.execute(
            sql_query, 
            (selected_year, selected_month, selected_year, selected_month, selected_year, selected_month)
        )
        result = cursor.fetchone()
        conn.close()

        # Extract data from result
        income = result[0] if result else 0  # Salary
        budget = result[1] if result else 0  # BudgetAmount
        spent = result[2] if result else 0   # TotalTransactionAmount

        # Return JSON response
        return jsonify({
            "income": income,
            "budget": budget,
            "spent": spent
        })
    except Exception as e:
        logger.error(f"An error occurred while fetching budget summary data: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch budget summary data"}), 500
        
        

@budget_sumary_bp.route("/budget_summary_chart")
@login_required
def budget_summary_chart():
    selected_year = request.args.get("year")
    selected_month = request.args.get("month")
    sort_criteria = request.args.get("sort_criteria", "category")  # Default to sorting by category if not provided

    SortAscDesc = request.args.get("SortAscDesc", "True").lower() == "true"

    order_by_index = 0
    if sort_criteria == "category":
        order_by_index = 0
    elif sort_criteria == "subcategory":
        order_by_index = 1
    elif sort_criteria == "budget":
        order_by_index = 2
    elif sort_criteria == "spent":
        order_by_index = 3
    elif sort_criteria == "balance":
        order_by_index = 4
    else:
        order_by_index = 2  # Default to sorting by category if criteria is not recognized

    # Use a context manager to manage the SQLite connection
    with sqlite3.connect("SparkyBudget.db") as conn:
        cursor = conn.cursor()

        # Enable query logging
        cursor.execute("PRAGMA query_only = 1;")

        # Print the SQL query for debugginga
        sql_query = """
            SELECT
                Category,
                SubCategory,            
                SUM(BudgetAmount) AS BudgetAmount,
                ABS(SUM(TotalTransactionAmount)) AS TotalTransactionAmount,
                Round(SUM(BudgetAmount) - ABS(SUM(TotalTransactionAmount)),2) as RemainingBudget
            FROM
                (
                SELECT
                    Coalesce(a12.Category, 'Unknown') as Category,
                    Coalesce(a11.SubCategory,'Unknown') as SubCategory,
                    0 AS TotalTransactionAmount,
                    ROUND(Sum(COALESCE(BudgetAmount,0)),2) AS BudgetAmount
                FROM
                    F_Budget a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                WHERE
                    Coalesce(a11.SubCategory,'Unknown') not in ('CC Payment','Money Transfer') AND
                    CAST(strftime('%Y', a11.BudgetMonth) AS TEXT) = ? AND
                    strftime('%m', a11.BudgetMonth) = ?
                GROUP BY
                    Coalesce(a12.Category, 'Unknown'),
                    Coalesce(a11.SubCategory,'Unknown')
                UNION ALL   
                SELECT
                    Coalesce(a12.Category, 'Unknown') as Category,
                    Coalesce(a11.SubCategory,'Unknown') as SubCategory,
                    ROUND(SUM(Coalesce(a11.TransactionAmountNew,a11.TransactionAmount,0)), 2) AS TotalTransactionAmount,
                    0 AS BudgetAmount
                FROM
                    F_Transaction a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                    LEFT JOIN F_Balance a13 on (a11.AccountID=a13.AccountID)
                    LEFT JOIN D_AccountTypes a14
                    ON a13.AccountTypeKey = a14.AccountTypeKey
                WHERE
                    HideFromBudget=0 AND
                    Coalesce(a11.SubCategory,'Unknown') not in ('CC Payment','Money Transfer') AND                    
                    CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) = ? AND
                    strftime('%m', a11.TransactionPosted) = ?
                GROUP BY
                    Coalesce(a12.Category, 'Unknown'),
                    Coalesce(a11.SubCategory,'Unknown')
                    ) a11
            GROUP BY
                Category,
                SubCategory
            ORDER BY
                CASE WHEN Category = 'Unknown' THEN 1 ELSE 0 END          
        """

        # Fetch data for the third table based on selected filters
        cursor.execute(sql_query, (selected_year, selected_month, selected_year, selected_month))
        budget_summary_chart = cursor.fetchall()
        budget_summary_chart = sorted(
            budget_summary_chart, key=lambda x: x[order_by_index], reverse=SortAscDesc
        )

    # Log debugging information
    logger.debug(
        f"Budget Summary Chart - year: {selected_year}, Month: {selected_month}, "
        f"Sorted by: {sort_criteria}, Descending: {SortAscDesc}"
    )

    # Render the template with the fetched data for the third table
    return render_template("budget_summary_chart.html.jinja", budget_summary_chart=budget_summary_chart)
    
    

# Add this route to handle the inline editing of the budget - I am trying this to update Budget amount from Budget summary page.
@budget_sumary_bp.route("/inline_edit_budget", methods=["POST"])
@login_required
def inline_edit_budget():
    try:
        data = request.get_json()
        selected_year = data["year"]
        selected_month = data["month"]
        subcategory = data["subcategory"]
        new_budget = data["budget"]

        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Update the budget in the database
        budget_inline_update_query = """
            INSERT OR REPLACE INTO F_Budget (BudgetMonth, SubCategory, BudgetAmount)
            VALUES (strftime('%Y-%m-%d', ? || '-' || ? || '-01'), ?, ?);


        """
        budget_inline_update_parameters = (selected_year, selected_month, subcategory, new_budget)
        logger.debug("SQL Query: Inline Budget Edit", budget_inline_update_query , "Paramters: ", budget_inline_update_parameters)

        cursor.execute(budget_inline_update_query, budget_inline_update_parameters)

        # Commit the changes and close the database connection
        conn.commit()
        conn.close()

        # Return a response (optional)
        return jsonify({"success": True, "message": "Budget updated successfully"})
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": f"An error occurred while updating the budget: {str(e)}"})


@budget_sumary_bp.route("/add_budget", methods=["POST"])
@login_required
def add_budget():
    try:
        data = request.get_json()
        budget_month = data["budgetMonth"] + "-01"  # Assuming 'budgetMonth' is in YYYY-MM format
        subCategory = data["subCategory"]
        budget_amount = data["budgetAmount"]

        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Use the INSERT OR REPLACE syntax to update or insert the record
        add_budget_query = "INSERT OR REPLACE INTO F_Budget (BudgetMonth, SubCategory, BudgetAmount) VALUES (?, ?, ?)"
        add_budget_params = (budget_month, subCategory, budget_amount)

        logger.info("SQL Query of Add New budget:", add_budget_query , " paramter" , add_budget_params)

        cursor.execute(add_budget_query, add_budget_params)  # Fix: Correct variable names here

        # Commit the changes and close the database connection
        conn.commit()
        conn.close()

        # Return a response (optional)
        return jsonify({"success": True, "message": "Python:Budget added successfully"})
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": str(e)})


# Add this route to your Flask app
@budget_sumary_bp.route("/delete_budget", methods=["POST"])
@login_required
def delete_budget():
    try:
        data = request.get_json()
        sub_category = data["subCategory"]
        selected_year = data["year"]
        selected_month = data["month"]

        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()
        logger.debug("delete_budget: From Python")
        # Formulate the SQL query to delete the budget
        delete_budget_query = """
            DELETE FROM F_Budget
            WHERE SubCategory = ? AND BudgetMonth = ? || '-' || ? || '-01'
        """
        delete_budget_params = (sub_category, selected_year, selected_month)

        # Print the SQL query and parameters for debugging
        logger.debug("SQL Query of Delete Budget:", delete_budget_query, delete_budget_params)

        # Execute the SQL query
        cursor.execute(delete_budget_query, delete_budget_params)

        # Commit the changes and close the database connection
        conn.commit()
        conn.close()

        # Return a success response
        return jsonify({"success": True, "message": "Budget deleted successfully"})
    except Exception as e:
        # Return an error response
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": str(e)})


# Add this route to your Flask app
@budget_sumary_bp.route("/get_budget_transaction_details")
@login_required
def get_budget_transaction_details():
    selected_year = request.args.get("year")
    selected_month = request.args.get("month")
    selected_subcategory = request.args.get("subcategory")

    # Connect to the SQLite database
    conn = sqlite3.connect("SparkyBudget.db")
    cursor = conn.cursor()

    # Fetch transaction details for the selected subcategory

    sql_query1 = """
        SELECT  
            TransactionKey,
			strftime('%m/%d/%Y', a11.TransactionPosted) as TransactionPosted, 
			a11.AccountName,			              
            a11.TransactionDescription,
            a11.TransactionPayee,
            ROUND(Coalesce(a11.TransactionAmountNew,a11.TransactionAmount,0), 2) AS TransactionAmount	
        FROM
            F_Transaction a11
            left join F_balance a12
            on a11.AccountID=a12.AccountID
            LEFT JOIN D_AccountTypes a13
            ON a12.AccountTypeKey = a13.AccountTypeKey
        WHERE
            AccountType not in ('Retirement','Hide') AND
            CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) = ? AND
            strftime('%m', a11.TransactionPosted) = ?
            AND Coalesce(a11.SubCategory,'Unknown') = ?             
        ORDER BY
            TransactionPosted desc,a11.AccountName,a11.TransactionDescription, a11.TransactionPayee, ROUND(Coalesce(a11.TransactionAmountNew,a11.TransactionAmount,0), 2),TransactionKey
    """
    # Fetch transaction data for the transaction table based on selected filters

    logger.debug("SQL Query:", sql_query1)
    logger.debug("Get Transaction details :", (selected_year, selected_month, selected_subcategory))
    cursor.execute(
        sql_query1,
        (
            selected_year,
            selected_month,
            selected_subcategory,
        ),
    )

    transaction_details = cursor.fetchall()

    # Close the database connection
    conn.close()

    # Render the template with the fetched data for transaction details
    # TODO: is this supposed to be a partial or full html?
    return render_template("budget_transaction_details.html.jinja", transaction_details=transaction_details)


@budget_sumary_bp.route("/get_recurring_budget_details")
@login_required
def get_recurring_budget_details():
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # SQL query to fetch SubCategory and BudgetAmount from D_Budget
        sql_query = """
            SELECT 
                SubCategory, 
                BudgetAmount
            FROM 
                D_Budget
            ORDER BY 
                SubCategory ASC
        """

        # Log the SQL query for debugging
        logger.debug(f"Executing SQL Query: {sql_query}")

        # Execute the query
        cursor.execute(sql_query)
        budget_details = cursor.fetchall()

        # Log the number of rows fetched
        logger.debug(f"Fetched {len(budget_details)} rows from D_Budget")

        # Close the database connection
        conn.close()

        # Format the data for rendering
        formatted_budget_details = [
            {"SubCategory": row[0], "BudgetAmount": row[1]} for row in budget_details
        ]

        # Render the template with the fetched data
        return render_template("recurring_budget_details.html.jinja", data=formatted_budget_details)

    except Exception as e:
        # Log the error and return an error response
        logger.error(f"An error occurred while fetching budget details: {str(e)}", exc_info=True)
        return render_template("recurring_budget_details.html.jinja", data=[], error=str(e))
    

@budget_sumary_bp.route("/delete_recurring_budget", methods=["POST"])
@login_required
def delete_recurring_budget():
    try:
        # Get the SubCategory from the request
        data = request.get_json()
        sub_category = data.get("subCategory")

        if not sub_category:
            return jsonify({"success": False, "message": "SubCategory is required."})

        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Delete the record from the D_Budget table
        delete_query = "DELETE FROM D_Budget WHERE SubCategory = ?"
        cursor.execute(delete_query, (sub_category,))
        conn.commit()

        # Check if a record was deleted
        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "No record found to delete."})

        # Close the database connection
        conn.close()

        return jsonify({"success": True, "message": f"Record for SubCategory '{sub_category}' deleted successfully."})

    except Exception as e:
        logger.error(f"An error occurred while deleting the record: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": "An error occurred while deleting the record."})
    

@budget_sumary_bp.route("/add_recurring_budget", methods=["POST"])
@login_required
def add_recurring_budget():
    try:
        # Get the data from the request
        data = request.get_json()
        sub_category = data.get("subCategory")
        budget_amount = data.get("budgetAmount")

        if not sub_category or budget_amount is None:
            return jsonify({"success": False, "message": "SubCategory and BudgetAmount are required."})

        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Insert or update the record in the D_Budget table
        query = """
            INSERT INTO D_Budget (SubCategory, BudgetAmount)
            VALUES (?, ?)
            ON CONFLICT(SubCategory) DO UPDATE SET BudgetAmount = excluded.BudgetAmount
        """
        cursor.execute(query, (sub_category, budget_amount))
        conn.commit()

        # Close the database connection
        conn.close()

        return jsonify({"success": True, "message": f"Recurring budget for '{sub_category}' added/updated successfully."})

    except Exception as e:
        logger.error(f"An error occurred while adding the recurring budget: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": "An error occurred while adding the recurring budget."})