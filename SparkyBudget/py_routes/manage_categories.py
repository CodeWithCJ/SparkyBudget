#py_utils/manage_categories.py

import os, logging
import sqlite3

from flask import jsonify, render_template, request, Blueprint, current_app
from flask_login import login_required



# Get log level from environment, default to INFO if not set
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger(__name__)


manage_categories_bp = Blueprint('manage_categories', __name__)


@manage_categories_bp.route("/category")
@login_required
def manage_categories():
    return render_template("category.html.jinja")


@manage_categories_bp.route("/getCategorySubCategory")
@login_required
def category_subcategory_data():
    try:
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()
        category_subcategory_query = """
            SELECT                
                SubCategoryKey,
                SubCategory,
                Category
            FROM
                D_Category            
            ORDER BY
                SubCategory, Category ASC
        """
        cursor.execute(category_subcategory_query)
        category_subcategory_data = cursor.fetchall()
        conn.close()

        # Format the data for DataTables
        formatted_data = [
            {"SubCategoryKey": row[0], "SubCategory": row[1], "Category": row[2]} for row in category_subcategory_data
        ]
        logger.debug(formatted_data)  # Debug print
        return jsonify({"data": formatted_data})

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@manage_categories_bp.route("/getCategory")
@login_required
def category_data():
    try:
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        # Adjusted SQL query to correctly fetch distinct categories
        category_query = """
            SELECT DISTINCT                
                Category  
            FROM
                D_Category            
            ORDER BY
                Category ASC 
        """

        cursor.execute(category_query)
        categories = cursor.fetchall()
        conn.close()

        # Format the fetched data for JSON response
        categories_list = [
            {"Category": row[0]} for row in categories
        ]  # Assuming 'Category' is the column name in your table

        # Return the categories as JSON
        logger.debug(categories_list)
        return jsonify(categories_list)

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@manage_categories_bp.route("/addSubCategory", methods=["POST"])
@login_required
def add_subcategory():
    try:
        subcategory = request.form["subcategory"]
        category = request.form["category"]
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        logger.debug(f"Adding New Subcategory: {subcategory}, Category: {category}")

        add_category_query = """
            INSERT INTO D_Category (SubCategory, Category)
            VALUES (?, ?)
        """
        add_category_data = (subcategory, category)

        cursor.execute(add_category_query, add_category_data)
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Category added successfully"})

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@manage_categories_bp.route('/addSubCategoryRule', methods=['POST'])
@login_required
def add_subcategory_rule():
    try:
        # Get form data from the request
        default_subcategory = request.form['subcategoryDropDown']
        rule_category = 'Payee'
        rule_pattern = 'Contains'
        match_word = request.form['matchword']

        # Connect to the SQLite database
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        # SQL query to insert the new rule
        insert_query = """
            INSERT INTO D_Category_Rule (Default_SubCategory, Rule_Category, Rule_Pattern, Match_Word)
            VALUES (?, ?, ?, ?)
        """

        # Execute the query with the form data
        cursor.execute(insert_query, (default_subcategory, rule_category, rule_pattern, match_word))
        conn.commit()  # Commit the transaction
        conn.close()

        # Return a success message
        return jsonify({"success": True, "message": "Category rule added successfully"})

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 500
     
     
     
@manage_categories_bp.route("/deleteSubCategory/<int:subcategory_key>", methods=["DELETE"])
@login_required
def delete_subcategory(subcategory_key):
    try:
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        delete_category_query = """
            DELETE FROM D_Category
            WHERE SubCategoryKey = ?
        """
        delete_category_data = (subcategory_key,)

        cursor.execute(delete_category_query, delete_category_data)
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Category deleted successfully"})

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@manage_categories_bp.route("/updateSubCategoryDIM", methods=["POST"])
@login_required
def update_category():
    try:
        subcategory_key = request.form["subcategory_key"]
        new_subcategory_name = request.form["new_subcategory_name"]
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        update_category_query = """
            UPDATE D_Category
            SET SubCategory = ?
            WHERE SubCategoryKey = ?
        """
        update_category_data = (new_subcategory_name, subcategory_key)

        cursor.execute(update_category_query, update_category_data)
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Category updated successfully"})

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500




@manage_categories_bp.route("/getSubCategory")
@login_required
def subcategory_data():
    try:
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        # Adjusted SQL query to correctly fetch distinct categories
        subcategory_query = """
            SELECT DISTINCT                
                SubCategory  
            FROM
                D_Category            
            ORDER BY
                SubCategory ASC 
        """

        cursor.execute(subcategory_query)
        SubCategory = cursor.fetchall()
        conn.close()

        # Format the fetched data for JSON response
        subcategories_list = [
            {"SubCategory": row[0]} for row in SubCategory
        ]  # Assuming 'SubCategory' is the column name in your table

        # Return the SubCategory as JSON
        return jsonify(subcategories_list)

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500




@manage_categories_bp.route("/getSubCategoryRules")
@login_required
def subcategory_rule_data():
    try:
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()
        subcategory_rule_query = """
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
        """
        cursor.execute(subcategory_rule_query)
        subcategory_rule_data = cursor.fetchall()
        conn.close()

        # Format the data for DataTables
        formatted_data = [
            {
                "RuleKey": row[0],
                "Default_SubCategory": row[1],
                "Rule_Category": row[2],
                "Rule_Pattern": row[3],
                "Match_Word": row[4],
            }
            for row in subcategory_rule_data
        ]

        logger.debug(formatted_data)  # Debug print
        return jsonify({"data": formatted_data})

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500
   
        
@manage_categories_bp.route("/updateRule", methods=["POST"])
@login_required
def update_rule():
    try:
        RuleKey = request.form["RuleKey"]
        Match_Word = request.form["Match_Word"]
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        update_rule_query = """
            UPDATE D_Category_Rule
            SET Match_Word = ?
            WHERE RuleKey = ?
        """
        update_rule_data = (Match_Word, RuleKey)

        cursor.execute(update_rule_query, update_rule_data)
        conn.commit()
        conn.close()
        logger.debug(update_rule_data)  # Debug print
        return jsonify({"success": True, "message": "Rule updated successfully"})

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@manage_categories_bp.route("/deleteRule/<int:RuleKey>", methods=["DELETE"])
@login_required
def delete_rule(RuleKey):
    try:
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        delete_rule_query = """
            DELETE FROM D_Category_Rule
            WHERE RuleKey = ?
        """
        delete_rule_data = (RuleKey,)

        cursor.execute(delete_rule_query, delete_rule_data)
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Category deleted successfully"})

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500
        
        
@manage_categories_bp.route('/getAccountTypes')
@login_required
def account_type_data():
    try:
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        # SQL query to fetch account types sorted by SortOrder
        account_type_query = """
            SELECT
                AccountType,
                HideFromBudget,
                SortOrder
            FROM
                D_AccountTypes
            ORDER BY
                SortOrder ASC
        """
        cursor.execute(account_type_query)
        account_types = cursor.fetchall()
        conn.close()

        # Format the fetched data for JSON response
        account_types_list = [           
            {"AccountType": row[0], "HideFromBudget": row[1], "SortOrder": row[2]} for row in account_types
        ]  # Assuming 'AccountType', 'HideFromBudget', 'SortOrder' are column names in your table

        # Return the account types as JSON
        return jsonify({"data": account_types_list})
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@manage_categories_bp.route('/addAccountType', methods=['POST'])
@login_required
def add_account_type():
    try:
        # Get form data from the request
        data = request.get_json()
        account_type = data['AccountType']
        hide_from_budget = data['HideFromBudget']
        sort_order = data['SortOrder']

        # Connect to the SQLite database
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        # SQL query to insert the new account type
        insert_query = """
            INSERT INTO D_AccountTypes (AccountType, HideFromBudget, SortOrder)
            VALUES (?, ?, ?)
        """
        cursor.execute(insert_query, (account_type, hide_from_budget, sort_order))
        conn.commit()
        conn.close()

        # Return success message
        return jsonify({"success": True, "message": "Account type added successfully"})
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@manage_categories_bp.route('/updateAccountTypes', methods=['POST'])
@login_required
def update_account_types():
    try:
        data = request.get_json()
        logger.debug("Received data:", data)  # Already present
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        # Verify table structure
        cursor.execute("PRAGMA table_debug(D_AccountTypes)")
        columns = [col[1] for col in cursor.fetchall()]
        logger.debug("D_AccountTypes columns:", columns)  # Debug table structure

        for item in data:
            account_type = item.get('AccountType')
            hide_from_budget = item.get('HideFromBudget', 0)
            sort_order = item.get('SortOrder')

            # Log the values being updated
            #print(f"Updating AccountType: {account_type}, HideFromBudget: {hide_from_budget}, SortOrder: {sort_order}")

            # Update the row in the D_AccountTypes table
            update_query = """
                UPDATE D_AccountTypes
                SET HideFromBudget = ?, SortOrder = ?
                WHERE AccountType = ?
            """
            cursor.execute(update_query, (hide_from_budget, sort_order, account_type))

            # Verify the update
            cursor.execute("SELECT SortOrder FROM D_AccountTypes WHERE AccountType = ?", (account_type,))
            updated_sort_order = cursor.fetchone()
            logger.debug(f"After update, {account_type} SortOrder: {updated_sort_order}")

        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Account types updated successfully"})
    except sqlite3.Error as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 500
        
        
        
@manage_categories_bp.route('/deleteAccountType/<string:account_type>', methods=['DELETE'])
@login_required
def delete_account_type(account_type):
    try:
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()
        delete_query = """
            DELETE FROM D_AccountTypes
            WHERE AccountType = ?
        """
        cursor.execute(delete_query, (account_type,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Account type deleted successfully"})
    except Exception as e:
        print(f"An error occurred: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500