from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from SimpleFinToDB import process_accounts_data
import sqlite3
import locale
import secrets
from datetime import datetime, timedelta
from flask_login import login_user, login_required, current_user
import os
from monthly_budget_insert import update_budget
import schedule
import time


app = Flask(__name__)
app.jinja_env.add_extension('jinja2.ext.loopcontrols')  # Add this line to enable loop controls

app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)
app.config['SESSION_COOKIE_SECURE'] = bool(int(os.getenv('USE_INTERNAL_HTTPS', 0))) or bool(int(os.getenv('USE_SECURE_SESSION_COOKIE', 1)))
app.config['SESSION_COOKIE_HTTPONLY'] = True

app.secret_key = secrets.token_hex(16)
login_manager = LoginManager(app)

# Simple hardcoded user class (replace with your user model if you have one)
class User(UserMixin):
    def __init__(self, user_id):
        self.id = user_id

sparky_username = os.getenv('SPARKY_USER', 'Sparky')
sparky_password = os.getenv('SPARKY_PASS', 'Sparky')


## Define a function to schedule the task
#def schedule_update_budget():
#    print("Monthly Budget App in progress...")
#    # Check if it's 2 am
#    if datetime.now().hour == 2 and datetime.now().minute == 0:
#    #if datetime.now().hour == 18 and datetime.now().minute == 34:
#        # Check if it's the first day of the month
#        if datetime.now().day == 1:
#            update_budget()
#
## Schedule the task to run daily at 2 am
#schedule.every().day.at("02:00").do(schedule_update_budget)
#
#
#
#def schedule_process_accounts_data():
#    # Schedule the task to run every 6 hours
#    print("Bank balance & Transaction update in progress...")
#    schedule.every(6).hours.do(process_accounts_data)
#
#
#
#def run_scheduler():
#    while True:
#        schedule.run_pending()
#        time.sleep(1)
#
#
#

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)

@app.route('/login', methods=['GET', 'POST'])
def login():
    print("Login route reached.")
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        if username == sparky_username and password == sparky_password:
            user = User(username)
            login_user(user)
            session['user'] = sparky_username
            session.permanent = True  # Make the session permanent
            print(f"User {username} successfully logged in.")

            return redirect(url_for('index'))

    return render_template('login.html')

@app.route('/logout', methods=['GET', 'POST'])
@login_required    
def logout():
    logout_user()
    return redirect(url_for('login'))


@app.before_request
def before_request():
    session.permanent = True
    app.permanent_session_lifetime = timedelta(days=1)
    if current_user.is_authenticated:
        session['user'] = current_user.id

@login_manager.unauthorized_handler
def unauthorized():
    # Redirect the user to the login page when unauthorized
    return redirect(url_for('login'))




def format_currency(value):
    # Convert value to float
    value = float(value)

    # Check if the value is negative
    is_negative = value < 0

    # Format the value as currency without parentheses
    formatted_value = locale.currency(abs(value), grouping=True)

    # Add the negative sign if necessary
    if is_negative:
        formatted_value = '-' + formatted_value

    return formatted_value
    
@app.route('/')
@login_required 
def index():
    # Connect to the SQLite database
    conn = sqlite3.connect('SparkyBudget.db')  # Replace with the actual name of your SQLite database file
    cursor = conn.cursor()

    # Fetch data for the first table: OrganizationName, sum(Balance), sum(AvailableBalance)
    cursor.execute('''
        SELECT
            AccountType,            
            ROUND(SUM(Balance), 2) AS TotalBalance,
            ROUND(SUM(AvailableBalance), 2) AS TotalAvailableBalance
        FROM
            F_Balance
        WHERE AccountType not in ('Hide')
        GROUP BY
            AccountType            
        ORDER BY
            CASE
                WHEN AccountType = 'Checking' THEN 1
                WHEN AccountType = 'Savings' THEN 2
                WHEN AccountType = 'Credit Card' THEN 3
                WHEN AccountType = 'Loan' THEN 4
                ELSE 5  -- For the rest
            END            
        '''
    )

    account_type_data = cursor.fetchall()
    locale.setlocale(locale.LC_ALL, '')
    #account_type_data = [
    #    (
    #        account_type,
    #        format_currency(total_balance),
    #        format_currency(total_available_balance)
    #    )
    #    for account_type, total_balance, total_available_balance in account_type_data
    #]
    
    
    cursor.execute('''
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
        '''
    )

    account_type_banak_data = cursor.fetchall()
    
    
    


    # Fetch data for the second table: OrganizationName, AccountName, FormattedBalanceDate, Balance, AvailableBalance
    cursor.execute('''
        SELECT OrganizationName,
                Coalesce(DisplayAccountName,
                AccountName) as AccountName,
                strftime("%Y-%m-%d", BalanceDate) AS FormattedBalanceDate,
                ROUND(Balance, 2) AS Balance,
                ROUND(AvailableBalance, 2) AS AvailableBalance
        FROM F_Balance 
        WHERE AccountType not in ('Hide') 
        ORDER BY OrganizationName, Coalesce(DisplayAccountName, AccountName)
    ''')
    bank_account_name_balance_details = cursor.fetchall()

    # Fetch distinct Transaction Years and Months for filters
    cursor.execute('SELECT DISTINCT CAST(strftime("%Y", TransactionPosted) AS INTEGER) AS Year FROM F_Transaction ORDER BY Year DESC')
    transaction_years = [row[0] for row in cursor.fetchall()]

    cursor.execute('SELECT DISTINCT strftime("%m", TransactionPosted) AS Month FROM F_Transaction ORDER BY Month DESC')
    transaction_months = [row[0] for row in cursor.fetchall()]

    # Close the database connection
    conn.close()

    # Render the template with the fetched data and filters, including transaction_years
    return render_template('index.html', account_type_data=account_type_data, account_type_banak_data=account_type_banak_data, bank_account_name_balance_details=bank_account_name_balance_details, transaction_years=transaction_years, transaction_months=transaction_months)





@app.route('/budget_summary_kpi_boxes')
@login_required 
def budget_summary_kpi_boxes():
    try:
        selected_year = request.args.get('year')
        selected_month = request.args.get('month')

        # Connect to the SQLite database
        conn = sqlite3.connect('SparkyBudget.db')  # Replace with the actual name of your SQLite database file
        cursor = conn.cursor()
        
        # Enable query logging
        cursor.execute('PRAGMA query_only = 1;')
        
        # Print the SQL query for debugging
        sql_query = '''
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
                    ROUND(SUM(COALESCE(a11.TransactionAmount, 0)), 2) AS TotalTransactionAmount,
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
                    ROUND(SUM(COALESCE(a11.TransactionAmount, 0)), 2) AS Salary
                FROM
                    F_Transaction a11
                    LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
                WHERE
                    a12.Category IN ('Income') AND
                    CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) = ? AND
                    strftime('%m', a11.TransactionPosted) = ?
                    
                
            )
        '''
        
        # Fetch data for the third table based on selected filters
        cursor.execute(sql_query, (selected_year, selected_month,selected_year, selected_month,selected_year, selected_month))
        budget_summary_kpi_boxes_data = cursor.fetchall()
        

        # Close the database connection
        conn.close()
        print("Debug: budget_summary_kpi_boxes_data =", budget_summary_kpi_boxes_data)
        app.logger.debug("Debug: budget_summary_kpi_boxes_data = %s", budget_summary_kpi_boxes_data)
        # Render the template with the fetched data for the third table
       
        return render_template('budget_kpi_boxes.html', budget_summary_kpi_boxes_data=budget_summary_kpi_boxes_data)

    
    except Exception as e:
        # Print the exception details
        print(f"An error occurred while fetching distinct subcategories: {str(e)}")
       
        return jsonify({'error': 'Failed to fetch distinct subcategories'}), 500


@app.route('/update_transaction_table')
@login_required 
def update_transaction_table():
    selected_year = request.args.get('year')
    selected_month = request.args.get('month')

    # Connect to the SQLite database
    conn = sqlite3.connect('SparkyBudget.db')  # Replace with the actual name of your SQLite database file
    cursor = conn.cursor()
    
    # Enable query logging
    cursor.execute('PRAGMA query_only = 1;')
    
    # Print the SQL query for debugging
    sql_query = '''
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
                a11.SubCategory not in ('CC Payment','Money Transfer') AND
                CAST(strftime('%Y', a11.BudgetMonth) AS TEXT) = ? AND
                strftime('%m', a11.BudgetMonth) = ?
            GROUP BY
                Coalesce(a12.Category, 'Unknown'),  -- Include Coalesce here
                Coalesce(a11.SubCategory,'Unknown')
            UNION ALL   
            SELECT
                Coalesce(a12.Category, 'Unknown') as Category,
                Coalesce(a11.SubCategory,'Unknown') as SubCategory,
                ROUND(SUM(Coalesce(a11.TransactionAmount,0)), 2) AS TotalTransactionAmount,
                0 AS BudgetAmount
            FROM
                F_Transaction a11
                LEFT JOIN D_Category a12 ON (a11.SubCategory = a12.SubCategory)
            WHERE
                a11.SubCategory not in ('CC Payment','Money Transfer') AND
                CAST(strftime('%Y', a11.TransactionPosted) AS TEXT) = ? AND
                strftime('%m', a11.TransactionPosted) = ?
            GROUP BY
                Coalesce(a12.Category, 'Unknown'),  -- Include Coalesce here
                Coalesce(a11.SubCategory,'Unknown')
                ) a11
        
        GROUP BY
            Category,
            SubCategory
        ORDER BY
            3 asc,CASE WHEN Category = 'Unknown' THEN 1 ELSE 0 END desc,
            1, 2
    '''
    
    # Fetch data for the third table based on selected filters
    cursor.execute(sql_query, (selected_year, selected_month,selected_year, selected_month))
    transaction_data = cursor.fetchall()
    

    # Close the database connection
    conn.close()

    # Render the template with the fetched data for the third table
    return render_template('budget_summary.html', transaction_data=transaction_data)
    
    
    
@app.route('/budget_summary_chart')
@login_required 
def budget_summary_chart():
    selected_year = request.args.get('year')
    selected_month = request.args.get('month')
    sort_criteria = request.args.get('sort_criteria', 'category')  # Default to sorting by category if not provided
    
    #SortAscDesc = request.args.get('SortAscDesc', 'True').lower() == 'true'
    SortAscDesc = request.args.get('SortAscDesc', 'True').lower() == 'true'
    


    order_by_index = 0
    if sort_criteria == 'category':
        order_by_index = 0
    elif sort_criteria == 'subcategory':
        order_by_index = 1
    elif sort_criteria == 'budget':
        order_by_index = 2
    elif sort_criteria == 'spent':
        order_by_index = 3
    elif sort_criteria == 'balance':
        order_by_index = 4
    else:
        order_by_index = 2  # Default to sorting by category if criteria is not recognized
    
    
    # Connect to the SQLite database
    conn = sqlite3.connect('SparkyBudget.db')  # Replace with the actual name of your SQLite database file
    cursor = conn.cursor()
    
    # Enable query logging
    cursor.execute('PRAGMA query_only = 1;')
    
    # Print the SQL query for debugging
    sql_query = '''
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
                Coalesce(a12.Category, 'Unknown'),  -- Include Coalesce here
                Coalesce(a11.SubCategory,'Unknown')
            UNION ALL   
            SELECT
                Coalesce(a12.Category, 'Unknown') as Category,
                Coalesce(a11.SubCategory,'Unknown') as SubCategory,
                ROUND(SUM(Coalesce(a11.TransactionAmount,0)), 2) AS TotalTransactionAmount,
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
                Coalesce(a12.Category, 'Unknown'),  -- Include Coalesce here
                Coalesce(a11.SubCategory,'Unknown')
                ) a11
       
        GROUP BY
            Category,
            SubCategory
        ORDER BY
            
            CASE WHEN Category = 'Unknown' THEN 1 ELSE 0 END          
    '''
    
    # Fetch data for the third table based on selected filters
    cursor.execute(sql_query, (selected_year, selected_month,selected_year, selected_month))
    budget_summary_chart = cursor.fetchall()
    budget_summary_chart = sorted(budget_summary_chart, key=lambda x: x[order_by_index], reverse=SortAscDesc)  # Sorting by the third element

    
    print("Budget Summary chat- year: ",selected_year," Month :", selected_month, "Sorted by: ",sort_criteria, "Desc: ",SortAscDesc)
    
    #print("SQL Query:", sql_query)

    #print("Budget Summary Chart Data:", budget_summary_chart)

    # Close the database connection
    conn.close()

    # Render the template with the fetched data for the third table
    return render_template('budget_summary_chart.html', budget_summary_chart=budget_summary_chart)
       
    
    

# Add this route to your Flask app
@app.route('/get_transaction_details')
@login_required 
def get_transaction_details():
    selected_year = request.args.get('year')
    selected_month = request.args.get('month')
    selected_subcategory = request.args.get('subcategory')

    # Connect to the SQLite database
    conn = sqlite3.connect('SparkyBudget.db')
    cursor = conn.cursor()

    # Fetch transaction details for the selected subcategory
    
    sql_query1 = '''
        SELECT  
            TransactionKey,
			strftime('%m/%d/%Y', a11.TransactionPosted) as TransactionPosted, 
			a11.AccountName,			              
            a11.TransactionDescription,
            a11.TransactionPayee,
            ROUND(a11.TransactionAmount, 2) AS TransactionAmount	
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
            TransactionPosted desc,a11.AccountName,a11.TransactionDescription, a11.TransactionPayee, a11.TransactionAmount,TransactionKey
    '''
     # Fetch transaction data for the transaction table based on selected filters
     
    #print("SQL Query:", sql_query1)
    print("Get Transaction details :" ,(selected_year, selected_month, selected_subcategory)) 
    cursor.execute( sql_query1,(selected_year, selected_month, selected_subcategory,))

    transaction_details = cursor.fetchall()

    # Close the database connection
    conn.close()

    # Render the template with the fetched data for transaction details
    return render_template('transaction_details.html', transaction_details=transaction_details)


@app.route('/analyze_transaction')
@login_required 
def analyze_transaction():
    # Connect to the SQLite database
    conn = sqlite3.connect('SparkyBudget.db')  # Replace with the actual name of your SQLite database file
    cursor = conn.cursor()

    # Default parameters
    current_date = datetime.now()

    # Calculate default start date (first day of the current month)
    default_start_date = (current_date - timedelta(days=current_date.day - 1)).strftime('%m/%d/%Y')

    # Calculate default end date (current date)
    default_end_date = current_date.strftime('%m/%d/%Y')

    # Retrieve start and end dates from the request or use default values
    start_date_param = request.args.get('start_date', default_start_date)
    end_date_param = request.args.get('end_date', default_end_date)

    # Convert start_date_param and end_date_param to Y-M-D format
    start_date = datetime.strptime(start_date_param, '%m/%d/%Y').strftime('%Y-%m-%d')
    end_date = datetime.strptime(end_date_param, '%m/%d/%Y').strftime('%Y-%m-%d')

    # Execute the SQL query for analyzing transactions
    custom_report_query = '''
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
            ROUND(a11.TransactionAmount, 2) AS TransactionAmount
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
    '''

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
    return render_template('transaction_edit.html', transaction_data=transaction_data)


    

@app.route('/getDistinctSubcategories', methods=['GET'])
@login_required 
def get_distinct_subcategories():
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect('SparkyBudget.db')  # Replace with the actual name of your SQLite database file
        cursor = conn.cursor()

        # Fetch distinct Subcategories
        cursor.execute('SELECT DISTINCT SubCategory FROM D_Category ORDER BY SubCategory')
        distinct_subcategories = [row[0] for row in cursor.fetchall()]

        # Close the database connection
        conn.close()

        return jsonify(distinct_subcategories)

    except Exception as e:
        # Print the exception details
        print(f"An error occurred while fetching distinct subcategories: {str(e)}")
       
        return jsonify({'error': 'Failed to fetch distinct subcategories'}), 500


# Add this route to your Flask app
@app.route('/updateSubcategory', methods=['POST'])
@login_required 
def update_subcategory():
    transaction_key = request.form.get('transactionId')
    new_subcategory = request.form.get('updatedSubcategory')

    # Connect to the SQLite database
    conn = sqlite3.connect('SparkyBudget.db')  # Replace with the actual name of your SQLite database file
    cursor = conn.cursor()

    # Update the Subcategory in the database
    #cursor.execute('UPDATE F_Transaction SET SubCategory = ? WHERE TransactionKey = ?', (new_subcategory, transaction_key))
    subcategory_update_query = 'UPDATE F_Transaction SET SubCategory = ? WHERE TransactionKey = ?'
    subcategory_update_parameters = (new_subcategory, transaction_key)
    
    print("SQL Query of updateSubcategory:", subcategory_update_query ," Paramters:",subcategory_update_parameters)
   
    
    cursor.execute(subcategory_update_query, subcategory_update_parameters)


    # Commit the changes
    conn.commit()
    

    # Close the database connection
    conn.close()
    
    print("Subcategory updated successfully")

    return jsonify({'status': 'success'})


@app.route('/download_data', methods=['POST'])
@login_required 
def download_data():
    try:
        # Call the SimpleFinToDB function to download data and save to SQLite
        process_accounts_data()
        return jsonify({'success': True, 'message': 'Sync with Bank Successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})




# Add this route to handle the inline editing of the budget - I am trying this to update Budget amount from Budget summary page.
@app.route('/inline_edit_budget', methods=['POST'])
@login_required 
def inline_edit_budget():
    try:
        data = request.get_json()
        selected_year = data['year']
        selected_month = data['month']
        subcategory = data['subcategory']
        new_budget = data['budget']

        # Connect to the SQLite database
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()

        # Update the budget in the database
        budget_inline_update_query = '''
            INSERT OR REPLACE INTO F_Budget (BudgetMonth, SubCategory, BudgetAmount)
            VALUES (strftime('%Y-%m-%d', ? || '-' || ? || '-01'), ?, ?);


        '''
        budget_inline_update_parameters = (selected_year, selected_month, subcategory,new_budget)
        #print("SQL Query: Inline Budget Edit", budget_inline_update_query , "Paramters: ", budget_inline_update_parameters)
        
        cursor.execute(budget_inline_update_query, budget_inline_update_parameters)

        # Commit the changes and close the database connection
        conn.commit()
        conn.close()

        # Return a response (optional)
        return jsonify({'success': True, 'message': 'Budget updated successfully'})
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'success': False, 'message': f'An error occurred while updating the budget: {str(e)}'})
@app.route('/add_budget', methods=['POST'])
@login_required 
def add_budget():
    try:
        data = request.get_json()
        budget_month = data['budgetMonth'] + '-01'  # Assuming 'budgetMonth' is in YYYY-MM format
        subCategory = data['subCategory']
        budget_amount = data['budgetAmount']
        
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()

        # Use the INSERT OR REPLACE syntax to update or insert the record
        add_budget_query = "INSERT OR REPLACE INTO F_Budget (BudgetMonth, SubCategory, BudgetAmount) VALUES (?, ?, ?)"
        add_budget_params = (budget_month, subCategory, budget_amount)

        #print("SQL Query of Add New budget:", add_budget_query , " paramter" , add_budget_params)
       

        cursor.execute(add_budget_query, add_budget_params)  # Fix: Correct variable names here

        # Commit the changes and close the database connection
        conn.commit()
        conn.close()

        # Return a response (optional)
        return jsonify({'success': True, 'message': 'Python:Budget added successfully'})
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})



# Add this route to your Flask app
@app.route('/delete_budget', methods=['POST'])
@login_required 
def delete_budget():
    try:
        data = request.get_json()
        sub_category = data['subCategory']
        selected_year = data['year']
        selected_month = data['month']       

        # Connect to the SQLite database
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()
        print("delete_budget: From Python")
        # Formulate the SQL query to delete the budget
        delete_budget_query = '''
            DELETE FROM F_Budget
            WHERE SubCategory = ? AND BudgetMonth = ? || '-' || ? || '-01'
        '''
        delete_budget_params = (sub_category, selected_year, selected_month)

        # Print the SQL query and parameters for debugging
        print("SQL Query of Delete Budget:", delete_budget_query , delete_budget_params)

        # Execute the SQL query
        cursor.execute(delete_budget_query, delete_budget_params)

        # Commit the changes and close the database connection
        conn.commit()
        conn.close()

        # Return a success response
        return jsonify({'success': True, 'message': 'Budget deleted successfully'})
    except Exception as e:
        # Return an error response
        print(f"An error occurred: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/salary_chart_data')
@login_required 
def chart_data():
    try:
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()

        # Your SQL query for line chart data
        salary_chart_data_query = '''
            SELECT
                strftime('%Y-%m', TransactionPosted) AS SalaryMonth,
                ROUND(sum(TransactionAmount)) as Salary
            FROM
                F_Transaction
            WHERE
                SubCategory='Paycheck'
                AND strftime('%Y-%m', TransactionPosted) >= strftime('%Y-%m', 'now', '-6 months')
            GROUP BY
                strftime('%Y-%m', TransactionPosted)
            ORDER BY
                SalaryMonth DESC
        '''

        cursor.execute(salary_chart_data_query)
        salary_chart_data = cursor.fetchall()

        conn.close()

        # Return the line chart data as JSON
        return jsonify(salary_chart_data)

    except Exception as e:
        # Print the exception details
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/manage_categories')
@login_required
def manage_categories():
    return render_template('category_mgmt.html')

@app.route('/getCategorySubCategory')
@login_required 
def category_subcategory_data():
    try:
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()
        category_subcategory_query = '''
            SELECT                
                SubCategoryKey,
                SubCategory,
                Category
            FROM
                D_Category            
            ORDER BY
                SubCategory, Category ASC
        '''
        cursor.execute(category_subcategory_query)
        category_subcategory_data = cursor.fetchall()
        conn.close()        
        
        # Format the data for DataTables
        formatted_data = [{'SubCategoryKey': row[0], 'SubCategory': row[1], 'Category': row[2]} for row in category_subcategory_data]
        #print(formatted_data)  # Debug print
        return jsonify({'data': formatted_data})

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500

        
        
@app.route('/getCategory')
@login_required 
def category_data():
    try:
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()

        # Adjusted SQL query to correctly fetch distinct categories
        category_query = '''
            SELECT DISTINCT                
                Category  
            FROM
                D_Category            
            ORDER BY
                Category ASC 
        '''

        cursor.execute(category_query)
        categories = cursor.fetchall()
        conn.close()

        # Format the fetched data for JSON response
        categories_list = [{'Category': row[0]} for row in categories]  # Assuming 'Category' is the column name in your table

        # Return the categories as JSON
        return jsonify(categories_list)

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/addSubCategory', methods=['POST'])
@login_required
def add_subcategory():
    try:
        subcategory = request.form['subcategory']
        category = request.form['category']
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()
        
        print("Adding New Subcategory: From Python", subcategory, "  ",category)
        
        add_category_query = '''
            INSERT INTO D_Category (SubCategory, Category)
            VALUES (?, ?)
        '''
        add_category_data = (subcategory, category)

        cursor.execute(add_category_query, add_category_data)
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Category added successfully'})

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/deleteSubCategory/<int:subcategory_key>', methods=['DELETE'])
@login_required
def delete_subcategory(subcategory_key):
    try:
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()

        delete_category_query = '''
            DELETE FROM D_Category
            WHERE SubCategoryKey = ?
        '''
        delete_category_data = (subcategory_key,)

        cursor.execute(delete_category_query, delete_category_data)
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Category deleted successfully'})

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/updateSubCategoryDIM', methods=['POST'])
@login_required
def update_category():
    try:
        subcategory_key = request.form['subcategory_key']
        new_subcategory_name = request.form['new_subcategory_name']
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()

        update_category_query = '''
            UPDATE D_Category
            SET SubCategory = ?
            WHERE SubCategoryKey = ?
        '''
        update_category_data = (new_subcategory_name, subcategory_key)

        cursor.execute(update_category_query, update_category_data)
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Category updated successfully'})

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500





@app.route('/getSubCategoryRules')
@login_required 
def subcategory_rule_data():
    try:
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()
        subcategory_rule_query = '''
            SELECT                
                RuleKey,
                Default_SubCategory,
                Rule_Category,
                Rule_Pattern,
                Match_Word
            FROM
                D_Category_Rule            
            ORDER BY
                2,3,4,5 ASC
        '''
        cursor.execute(subcategory_rule_query)
        subcategory_rule_data = cursor.fetchall()
        conn.close()        
        
        # Format the data for DataTables        
        formatted_data = [{'RuleKey': row[0], 'Default_SubCategory': row[1], 'Rule_Category': row[2], 'Rule_Pattern': row[3], 'Match_Word': row[4]} for row in subcategory_rule_data]

        #print(formatted_data)  # Debug print
        return jsonify({'data': formatted_data})

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500




@app.route('/updateRule', methods=['POST'])
@login_required
def update_rule():
    try:
        RuleKey = request.form['RuleKey']
        Match_Word = request.form['Match_Word']
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()

        update_rule_query = '''
            UPDATE D_Category_Rule
            SET Match_Word = ?
            WHERE RuleKey = ?
        '''
        update_rule_data = (Match_Word, RuleKey)

        cursor.execute(update_rule_query, update_rule_data)
        conn.commit()
        conn.close()
        print(update_rule_data)  # Debug print
        return jsonify({'success': True, 'message': 'Rule updated successfully'})

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500




@app.route('/deleteRule/<int:RuleKey>', methods=['DELETE'])
@login_required
def delete_rule(RuleKey):
    try:
        conn = sqlite3.connect('SparkyBudget.db')
        cursor = conn.cursor()

        delete_rule_query = '''
            DELETE FROM D_Category_Rule
            WHERE RuleKey = ?
        '''
        delete_rule_data = (RuleKey,)

        cursor.execute(delete_rule_query, delete_rule_data)
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Category deleted successfully'})

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    # Specify the full path to the SSL certificate and key in the "static\SSL" directory

    ssl_context = None
    if bool(int(os.getenv('USE_INTERNAL_HTTPS', 0))):
        ssl_context=(r'certs/cert.pem', r'certs/key.pem')
 

    
    # Run the Flask app with the SSL context
    app.run(host='0.0.0.0', port=5000, ssl_context=ssl_context, debug=True)
    #app.run(host='0.0.0.0', port=5000, debug=True)

#if __name__ == '__main__':
#        
#    # Schedule the process_accounts_data function to run every 6 hours
#    schedule_process_accounts_data()
#    
#    
#    import threading
#    scheduler_thread = threading.Thread(target=run_scheduler)
#    scheduler_thread.start()
#    
#    # Specify the full path to the SSL certificate and key in the "static\SSL" directory
#    
#    ssl_cert_path = '/sparky/ssl/certificate.crt'
#    ssl_key_path = '/sparky/ssl/private.key'
#    
#    # Run the Flask app with the SSL context
#    app.run(host='0.0.0.0', port=5000, ssl_context=(ssl_cert_path, ssl_key_path), debug=True)
#    #app.run(host='0.0.0.0', port=5000, debug=True)
    




    
    
