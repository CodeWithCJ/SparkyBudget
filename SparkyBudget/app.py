import locale
import os
import secrets
import sqlite3
import schedule, time
import re
from datetime import datetime, timedelta, timezone
from threading import Lock


from flask import Flask, jsonify, redirect, render_template, request, session, url_for, Blueprint  
from flask_login import LoginManager, UserMixin, current_user, login_required, login_user, logout_user

from monthly_budget_insert import month_budget_update_using_template
from daily_balance_history import daily_balance_history_insert
from SimpleFinToDB import process_accounts_data


app = Flask(__name__)
app.jinja_env.add_extension("jinja2.ext.loopcontrols")  # Add this line to enable loop controls



app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=1)
app.config["SESSION_COOKIE_SECURE"] = bool(int(os.getenv("USE_INTERNAL_HTTPS", 0))) or bool(
    int(os.getenv("USE_SECURE_SESSION_COOKIE", 1))
)
app.config["SESSION_COOKIE_HTTPONLY"] = True

app.secret_key = secrets.token_hex(16)
login_manager = LoginManager(app)



from manage_categories import manage_categories_bp

# Register the Blueprint
app.register_blueprint(manage_categories_bp)

# Simple hardcoded user class (replace with your user model if you have one)
class User(UserMixin):
    def __init__(self, user_id):
        self.id = user_id


sparky_username = os.getenv("SPARKY_USER", "Sparky")
sparky_password = os.getenv("SPARKY_PASS", "Sparky")

db_lock = Lock()

#Define a function to schedule the task
#def monthly_budget_update_schedule():
#   print("Monthly Budget App in progress...")
#   # Check if it's 1 am
#   if datetime.now().hour == 1 and datetime.now().minute == 0:
#   #if datetime.now().hour == 18 and datetime.now().minute == 34:
#       # Check if it's the first day of the month
#       if datetime.now().day == 1:
#           month_budget_update_using_template()
# #Schedule the task to run daily at 1 am
schedule.every().day.at("01:00").do(month_budget_update_using_template)

#def daily_balance_history_insert_schedule():
#   print("Daily Balance History in progress...")
#   # Check if it's 23:55 PM
#   if datetime.now().hour == 23 and datetime.now().minute == 55:
#      daily_balance_history_insert()
# #Schedule the task to run daily at 1:05 am
schedule.every().day.at("23:55").do(daily_balance_history_insert)


schedule.every(4).hours.do(process_accounts_data)

#def schedule_process_accounts_data():
#   # Schedule the task to run every 6 hours
#   print("Bank balance & Transaction update in progress...")
#   #schedule.every(6).hours.do(process_accounts_data)
#   schedule.every(4).hours.do(process_accounts_data)
def run_scheduler():
   while True:
       schedule.run_pending()
       time.sleep(10)

locale.setlocale(locale.LC_ALL, "")


@login_manager.user_loader
def load_user(user_id):
    return User(user_id)


@app.template_filter("tocurrency")
def format_money(number):
    if number is None:
        return "--"
    else:
        rounded_number = round(number,2)  # Round to whole number
        return f"${rounded_number:,}"  # Format without decimals


@app.template_filter("tocurrency_whole")
def format_money_whole(number):
    if number is None:
        return "--"
    else:
        rounded_number = round(number)  # Round to whole number
        return f"${rounded_number:,}"  # Format without decimals


@app.route("/login", methods=["GET", "POST"])
def login():
    print("Login route reached.")
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        if username == sparky_username and password == sparky_password:
            user = User(username)
            login_user(user)
            session["user"] = sparky_username
            session.permanent = True  # Make the session permanent
            print(f"User {username} successfully logged in.")

            return redirect(url_for("index"))

    return render_template("login.html.jinja")


@app.route("/logout", methods=["GET", "POST"])
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))


@app.before_request
def before_request():
    session.permanent = True
    app.permanent_session_lifetime = timedelta(days=1)
    if current_user.is_authenticated:
        session["user"] = current_user.id


@login_manager.unauthorized_handler
def unauthorized():
    # Redirect the user to the login page when unauthorized
    return redirect(url_for("login"))


def format_currency(value):
    # Convert value to float
    value = float(value)

    # Check if the value is negative
    is_negative = value < 0

    # Format the value as currency without parentheses
    formatted_value = locale.currency(abs(value), grouping=True)

    # Add the negative sign if necessary
    if is_negative:
        formatted_value = "-" + formatted_value

    return formatted_value


@app.route("/")
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
        SELECT * FROM (
            SELECT
                AccountType,            
                ROUND(SUM(Balance), 2) AS TotalBalance,
                ROUND(SUM(AvailableBalance), 2) AS TotalAvailableBalance
            FROM
                F_Balance
            WHERE AccountType not in ('Hide')
            GROUP BY
                AccountType
            UNION ALL
            SELECT
                'Net Cash' as AccountType,            
                ROUND(SUM(Balance), 2) AS TotalBalance,
                ROUND(SUM(AvailableBalance), 2) AS TotalAvailableBalance
            FROM
                F_Balance
            WHERE AccountType  in ('Checking','Savings','Credit Card')
            UNION ALL
            SELECT
                'Net Worth' as AccountType,            
                ROUND(SUM(Balance), 2) AS TotalBalance,
                ROUND(SUM(AvailableBalance), 2) AS TotalAvailableBalance
            FROM
                F_Balance
            WHERE AccountType not in ('Hide')
        )
        ORDER BY
            CASE
                WHEN AccountType = 'Net Cash' THEN 0
                WHEN AccountType = 'Checking' THEN 1
                WHEN AccountType = 'Savings' THEN 2
                WHEN AccountType = 'Credit Card' THEN 3
                WHEN AccountType = 'Utilities' THEN 4
                WHEN AccountType = 'Loan' THEN 5
                WHEN AccountType = 'Retirement' THEN 6
                WHEN AccountType = 'Net Worth' THEN 7
                ELSE 999  -- For the rest
            END            
        """
    )

    account_type_data = cursor.fetchall()
    labels = list(zip(*account_type_data))[0]
    balances = list(zip(*account_type_data))[1]
    # account_type_data = [
    #    (
    #        account_type,
    #        format_currency(total_balance),
    #        format_currency(total_available_balance)
    #    )
    #    for account_type, total_balance, total_available_balance in account_type_data
    # ]

    cursor.execute(
        """
        SELECT
            AccountType,
            Coalesce(DisplayAccountName, AccountName) as AccountName,
            ROUND(SUM(Balance), 2) AS TotalBalance,
            ROUND(SUM(AvailableBalance), 2) AS TotalAvailableBalance,
            ABS(SUM(Balance)) + ABS(SUM(AvailableBalance)) as Dummy
        FROM
            F_Balance
        WHERE AccountType not in ('Hide')
        GROUP BY
            AccountType,
            Coalesce(DisplayAccountName, AccountName)
        ORDER BY
            CASE
                WHEN AccountType = 'Checking' THEN 1
                WHEN AccountType = 'Savings' THEN 2
                WHEN AccountType = 'Credit Card' THEN 3
                WHEN AccountType = 'Loan' THEN 4
                ELSE 5  -- For the rest
            END,
            5 desc
        """
    )

    account_type_banak_data = cursor.fetchall()

    # Fetch data for the second table: OrganizationName, AccountName, FormattedBalanceDate, Balance, AvailableBalance
    cursor.execute(
        """
        SELECT OrganizationName,
                Coalesce(DisplayAccountName,
                AccountName) as AccountName,
                DATE(BalanceDate) AS "[date]",
                ROUND(Balance, 2) AS Balance,
                ROUND(AvailableBalance, 2) AS AvailableBalance
        FROM F_Balance 
        WHERE AccountType not in ('Hide') 
        ORDER BY OrganizationName, Coalesce(DisplayAccountName, AccountName)
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
            F_Balance_History 
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


@app.route("/budget_summary_kpi_boxes")
@login_required
def budget_summary_kpi_boxes():
    try:
        selected_year = request.args.get("year")
        selected_month = request.args.get("month")

        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")  # Replace with the actual name of your SQLite database file
        cursor = conn.cursor()

        # Enable query logging
        cursor.execute("PRAGMA query_only = 1;")

        # Print the SQL query for debugging
        sql_query = """
            SELECT 
                CAST(  coalesce(Salary,ProjectedSalary,0)   as INTEGER) as Salary,
                CAST(SUM(BudgetAmount) as INTEGER) as BudgetAmount,
                CAST(SUM(TotalTransactionAmount) as INTEGER) as TotalTransactionAmount,
                CAST(  coalesce(Salary,ProjectedSalary,0)   as INTEGER) - CAST(  coalesce(BudgetAmount,0)   as INTEGER) as Balance,
                CAST(SUM(Salary) + SUm(TotalTransactionAmount) as INTEGER) as ActualBalance
            FROM (
                SELECT
                    ROUND(SUM(
                        CASE 
                            WHEN a11.SubCategory IN ('Paycheck') THEN BudgetAmount 
                            ELSE Null 
                        END
                    ), 2) as ProjectedSalary,
                    ROUND(SUM(
                        CASE 
                            WHEN a11.SubCategory NOT IN ('CC Payment', 'Money Transfer') and a12.Category NOT IN ('Income') THEN BudgetAmount 
                            ELSE Null 
                        END
                    ), 2) AS BudgetAmount,
                    Null as TotalTransactionAmount,
                    Null as Salary
                FROM
                    F_Budget a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                WHERE                   
                    CAST(strftime('%Y', a11.BudgetMonth) AS TEXT) = ? AND
                    strftime('%m', a11.BudgetMonth) = ?  
                    
                UNION ALL
                
                SELECT
                    Null as ProjectedSalary,
                    Null as BudgetAmount,
                    ROUND(COALESCE(a11.TransactionAmountNew,a11.TransactionAmount, 0), 2) AS TotalTransactionAmount,
                    Null as Salary
                FROM
                    F_Transaction a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                WHERE
                    a11.SubCategory NOT IN ('CC Payment', 'Money Transfer') AND
                    a12.Category NOT IN ('Income') AND
                    CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) = ? AND
                    strftime('%m', a11.TransactionPosted) = ?
                
                UNION ALL
                
                SELECT
                    Null as ProjectedSalary,
                    Null as BudgetAmount,
                    Null as TotalTransactionAmount,
                    ROUND(COALESCE(a11.TransactionAmountNew,a11.TransactionAmount, 0), 2) AS Salary
                FROM
                    F_Transaction a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                WHERE
                    a12.Category IN ('Income') AND
                    CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) = ? AND
                    strftime('%m', a11.TransactionPosted) = ?
                    
                
            )
        """

        # Fetch data for the third table based on selected filters
        cursor.execute(
            sql_query, (selected_year, selected_month, selected_year, selected_month, selected_year, selected_month)
        )
        budget_summary_kpi_boxes_data = cursor.fetchall()

        # Close the database connection
        conn.close()
        print("Debug: budget_summary_kpi_boxes_data =", budget_summary_kpi_boxes_data)
        app.logger.debug("Debug: budget_summary_kpi_boxes_data = %s", budget_summary_kpi_boxes_data)
        # Render the template with the fetched data for the third table

        # TODO: is this supposed to be a partial or full html?
        return render_template(
            "budget_kpi_boxes.html.partial.jinja", budget_summary_kpi_boxes_data=budget_summary_kpi_boxes_data
        )

    except Exception as e:
        # Print the exception details
        print(f"An error occurred while fetching distinct subcategories: {str(e)}")

        return jsonify({"error": "Failed to fetch distinct subcategories"}), 500




@app.route("/budget_summary_chart")
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

        # Print the SQL query for debugging
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
                WHERE
                    AccountType not in ('Retirement','Hide') AND
                    Coalesce(a11.SubCategory,'Unknown') not in ('CC Payment','Money Transfer') AND
                    Coalesce(a13.AccountType,'Unknown') not in ('Utilities','Retirement','Hide') AND
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
    print(
        "Budget Summary Chart - year: ",
        selected_year,
        " Month: ",
        selected_month,
        "Sorted by: ",
        sort_criteria,
        "Descending: ",
        SortAscDesc,
    )

    # Render the template with the fetched data for the third table
    return render_template("budget_summary_chart.html.partial.jinja", budget_summary_chart=budget_summary_chart)



# Add this route to your Flask app
@app.route("/get_transaction_details")
@login_required
def get_transaction_details():
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
        WHERE
            a12.AccountType not in ('Retirement','Hide') AND
            CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) = ? AND
            strftime('%m', a11.TransactionPosted) = ?
            AND Coalesce(a11.SubCategory,'Unknown') = ?             
        ORDER BY
            TransactionPosted desc,a11.AccountName,a11.TransactionDescription, a11.TransactionPayee, ROUND(Coalesce(a11.TransactionAmountNew,a11.TransactionAmount,0), 2),TransactionKey
    """
    # Fetch transaction data for the transaction table based on selected filters

    # print("SQL Query:", sql_query1)
    print("Get Transaction details :", (selected_year, selected_month, selected_subcategory))
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
    return render_template("transaction_details.html.partial.jinja", transaction_details=transaction_details)


@app.route("/analyze_transaction")
@login_required
def analyze_transaction():
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
    return render_template("transaction_edit.html.jinja", transaction_data=transaction_data)


@app.route("/getDistinctSubcategories", methods=["GET"])
@login_required
def get_distinct_subcategories():
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect("SparkyBudget.db")  # Replace with the actual name of your SQLite database file
        cursor = conn.cursor()

        # Fetch distinct Subcategories
        cursor.execute("SELECT DISTINCT SubCategory FROM D_Category ORDER BY SubCategory")
        distinct_subcategories = [row[0] for row in cursor.fetchall()]

        # Close the database connection
        conn.close()

        return jsonify(distinct_subcategories)

    except Exception as e:
        # Print the exception details
        print(f"An error occurred while fetching distinct subcategories: {str(e)}")

        return jsonify({"error": "Failed to fetch distinct subcategories"}), 500


# Add this route to your Flask app
@app.route("/updateSubcategory", methods=["POST"])
@login_required
def update_subcategory():
    transaction_key = request.form.get("transactionId")
    new_subcategory = request.form.get("updatedSubcategory")

    # Connect to the SQLite database
    conn = sqlite3.connect("SparkyBudget.db")  # Replace with the actual name of your SQLite database file
    cursor = conn.cursor()

    # Update the Subcategory in the database
    # cursor.execute('UPDATE F_Transaction SET SubCategory = ? WHERE TransactionKey = ?', (new_subcategory, transaction_key))
    subcategory_update_query = "UPDATE F_Transaction SET SubCategory = ? WHERE TransactionKey = ?"
    subcategory_update_parameters = (new_subcategory, transaction_key)

    print("SQL Query of updateSubcategory:", subcategory_update_query, " Paramters:", subcategory_update_parameters)

    cursor.execute(subcategory_update_query, subcategory_update_parameters)

    # Commit the changes
    conn.commit()

    # Close the database connection
    conn.close()

    print("Subcategory updated successfully")

    return jsonify({"status": "success"})


@app.route("/download_data", methods=["POST"])
@login_required
def download_data():
    try:
        # Call the SimpleFinToDB function to download data and save to SQLite
        process_accounts_data()
        return jsonify({"success": True, "message": "Sync with Bank Successfully."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})


# Add this route to handle the inline editing of the budget - I am trying this to update Budget amount from Budget summary page.
@app.route("/inline_edit_budget", methods=["POST"])
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
        # print("SQL Query: Inline Budget Edit", budget_inline_update_query , "Paramters: ", budget_inline_update_parameters)

        cursor.execute(budget_inline_update_query, budget_inline_update_parameters)

        # Commit the changes and close the database connection
        conn.commit()
        conn.close()

        # Return a response (optional)
        return jsonify({"success": True, "message": "Budget updated successfully"})
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred while updating the budget: {str(e)}"})


@app.route("/add_budget", methods=["POST"])
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

        # print("SQL Query of Add New budget:", add_budget_query , " paramter" , add_budget_params)

        cursor.execute(add_budget_query, add_budget_params)  # Fix: Correct variable names here

        # Commit the changes and close the database connection
        conn.commit()
        conn.close()

        # Return a response (optional)
        return jsonify({"success": True, "message": "Python:Budget added successfully"})
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


# Add this route to your Flask app
@app.route("/delete_budget", methods=["POST"])
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
        print("delete_budget: From Python")
        # Formulate the SQL query to delete the budget
        delete_budget_query = """
            DELETE FROM F_Budget
            WHERE SubCategory = ? AND BudgetMonth = ? || '-' || ? || '-01'
        """
        delete_budget_params = (sub_category, selected_year, selected_month)

        # Print the SQL query and parameters for debugging
        print("SQL Query of Delete Budget:", delete_budget_query, delete_budget_params)

        # Execute the SQL query
        cursor.execute(delete_budget_query, delete_budget_params)

        # Commit the changes and close the database connection
        conn.commit()
        conn.close()

        # Return a success response
        return jsonify({"success": True, "message": "Budget deleted successfully"})
    except Exception as e:
        # Return an error response
        print(f"An error occurred: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/salary_chart_data")
@login_required
def chart_data():
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


@app.route("/splitTransaction", methods=["POST"])
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




if __name__ == "__main__":
    # Specify the full path to the SSL certificate and key in the "static\SSL" directory

    ssl_context = None
    if bool(int(os.getenv("USE_INTERNAL_HTTPS", 0))):
        ssl_context = (r"certs/cert.pem", r"certs/key.pem")
    #process_accounts_data()
    # Schedule the process_accounts_data function to run every 6 hours
    #schedule_process_accounts_data()

    import threading
    scheduler_thread = threading.Thread(target=run_scheduler)
    scheduler_thread.start()

    # Run the Flask app with the SSL context
    app.run(host="0.0.0.0", port=5000, ssl_context=ssl_context, debug=True)
    
