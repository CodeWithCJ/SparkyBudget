# py_utils/subcategory_mgmt.py

import sqlite3, os, logging
from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required



log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger(__name__)



subcategory_update_bp = Blueprint('subcategory_update', __name__)

@subcategory_update_bp.route("/getDistinctSubcategories", methods=["GET"])
@login_required
def get_distinct_subcategories():
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])  # Replace with the actual name of your SQLite database file
        cursor = conn.cursor()

        # Fetch distinct Subcategories
        cursor.execute("SELECT DISTINCT SubCategory FROM D_Category ORDER BY SubCategory")
        distinct_subcategories = [row[0] for row in cursor.fetchall()]

        # Close the database connection
        conn.close()

        return jsonify(distinct_subcategories)

    except Exception as e:
        # Print the exception details
        logger.error(f"An error occurred while fetching distinct subcategories: {str(e)}")

        return jsonify({"error": "Failed to fetch distinct subcategories"}), 500

@subcategory_update_bp.route("/updateSubcategory", methods=["POST"])
@login_required
def update_subcategory():
    transaction_key = request.form.get("transactionId")
    new_subcategory = request.form.get("updatedSubcategory")

    # Connect to the SQLite database
    conn = sqlite3.connect(current_app.config['DATABASE_PATH'])  # Replace with the actual name of your SQLite database file
    cursor = conn.cursor()

    # Update the Subcategory in the database
    # cursor.execute('UPDATE F_Transaction SET SubCategory = ? WHERE TransactionKey = ?', (new_subcategory, transaction_key))
    subcategory_update_query = "UPDATE F_Transaction SET SubCategory = ? WHERE TransactionKey = ?"
    subcategory_update_parameters = (new_subcategory, transaction_key)

    logger.debug("SQL Query of updateSubcategory:", subcategory_update_query, " Paramters:", subcategory_update_parameters)

    cursor.execute(subcategory_update_query, subcategory_update_parameters)

    # Commit the changes
    conn.commit()

    # Close the database connection
    conn.close()

    logger.debug("Subcategory updated successfully")

    return jsonify({"status": "success"})