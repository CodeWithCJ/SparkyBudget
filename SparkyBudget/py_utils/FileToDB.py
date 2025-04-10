import sqlite3
import logging
import hashlib
import pandas as pd
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_login import login_required

# Get log level from environment, default to INFO if not set
logger = logging.getLogger(__name__)

# Create a Blueprint for the FiletoDB routes
file_to_db_bp = Blueprint('file_to_db', __name__)

# --- New Helper Function: find_date_format ---
def find_date_format(date_series):
    """
    Tries to determine a single consistent date format for a pandas Series.

    Args:
        date_series (pd.Series): The series containing date strings.

    Returns:
        str or None: The detected format string if one is found consistently, otherwise None.
    """
    # Define common formats to check, prioritize more specific ones first
    common_formats = [
        '%Y-%m-%d',  # 2023-10-25
        '%m/%d/%Y',  # 10/25/2023
        '%d/%m/%Y',  # 25/10/2023
        '%m.%d.%Y',  # 10.25.2023
        '%d.%m.%Y',  # 25.10.2023
        '%m/%d/%y',  # 10/25/23
        '%d/%m/%y',  # 25/10/23
        '%m.%d.%y',  # 10.25.23
        '%d.%m.%y',  # 25.10.23
        '%d-%b-%Y',  # 25-Oct-2023 (Case-insensitive month handled by strptime)
        '%Y%m%d',    # 20231025
        # Add other formats if needed, e.g., '%b %d, %Y' -> Oct 25, 2023
    ]

    # Clean the series: convert to string, strip whitespace, handle potential NaNs/empty
    # Fill NaNs/empty strings temporarily to avoid errors during check,
    # but ensure they don't influence format detection if the column isn't entirely empty.
    date_strings = date_series.fillna('').astype(str).str.strip()
    non_empty_dates = date_strings[date_strings != '']

    if non_empty_dates.empty:
        logger.warning("TransactionPosted column contains no date values to determine format.")
        # Cannot determine format, but maybe allow processing if other columns are valid?
        # Or return a specific code indicating no dates found. For now, return None.
        return None # Or potentially a default like '%Y-%m-%d' if you want to assume one

    for fmt in common_formats:
        try:
            # Attempt to parse all non-empty strings with this format
            # Handle potential time part by splitting
            non_empty_dates.apply(lambda d: datetime.strptime(d.split(' ')[0], fmt))
            # If no ValueError was raised for any date, this format works for all
            logger.info(f"Determined consistent date format for upload: {fmt}")  
            return fmt
        except ValueError:
            # This format didn't work for at least one date, try the next
            logger.debug(f"Format '{fmt}' did not match all dates.")
            continue
        except Exception as e:
             # Catch unexpected errors during format checking
             logger.warning(f"Unexpected error checking format {fmt}: {e}")
             continue # Skip this format on unexpected errors

    # If no single format worked for all dates
    logger.error("Could not determine a single consistent date format for the TransactionPosted column.")
    return None
# --- End Helper Function ---


def generate_transaction_id(row, account_id):
    """
    Generate a unique TransactionID by hashing relevant fields including the account ID.
    Uses original string values for consistency.
    """
    unique_string = (
        f"{account_id}"
        f"{str(row['TransactionPosted'])}"
        f"{str(row['TransactionAmount'])}"
        f"{str(row['TransactionDescription'])}"
        f"{str(row['TransactionPayee'])}"
        f"{str(row['TransactionMemo'])}"
    )
    return hashlib.sha256(unique_string.encode()).hexdigest()


def upload_transactions_to_db(file, account_key, db_lock):

    logger.info(f"Starting upload_transactions_to_db for AccountKey {account_key} at {datetime.now()}")

    try:
        # Read the CSV file into a pandas DataFrame
        # Keep types flexible initially, especially TransactionPosted
        df = pd.read_csv(file, dtype={
            'TransactionMemo': str,
            'TransactionDescription': str,
            'TransactionPayee': str
            # Let TransactionAmount be inferred or handle conversion later with error checking
            })
        # Fill NaNs in essential string columns
        df['TransactionMemo'].fillna('', inplace=True)
        df['TransactionDescription'].fillna('', inplace=True)
        df['TransactionPayee'].fillna('', inplace=True)
        # Ensure TransactionPosted is string for format detection/parsing
        df['TransactionPosted'] = df['TransactionPosted'].astype(str)

        logger.debug(f"CSV file read successfully with {len(df)} rows")

        # Validate required columns
        required_columns = ['TransactionPosted', 'TransactionAmount', 'TransactionDescription', 'TransactionPayee', 'TransactionMemo']
        if not all(col in df.columns for col in required_columns):
            missing_cols = [col for col in required_columns if col not in df.columns]
            logger.error(f"Missing required columns in CSV: {missing_cols}")
            return {"success": False, "message": f"CSV file must contain the following columns: {', '.join(required_columns)}"}

        # --- Pre-scan Step: Determine Date Format ---
        determined_format = find_date_format(df['TransactionPosted'])
        if determined_format is None and not df['TransactionPosted'].str.strip().eq('').all():
             # If format is None AND there were non-empty date strings that couldn't be parsed consistently
            logger.error("Failed to determine a consistent date format for the TransactionPosted column.")
            return {"success": False, "message": "Inconsistent or unrecognized date formats found in TransactionPosted column. Please ensure all dates use the same format."}
        # If determined_format is None but all dates were empty, we might proceed or handle as needed.
        # For now, we'll allow proceeding, and parsing will be skipped/fail later if needed.
        # --- End Pre-scan Step ---


        # Ensure that only one thread/process can access the DB at a time
        with db_lock:
            with sqlite3.connect("SparkyBudget.db") as conn:
                cursor = conn.cursor()

                # Get AccountID, AccountName and AccountType from the account_key
                cursor.execute("""
                    SELECT a.AccountID as account_id, a.AccountName as account_name, d.AccountType as account_type
                    FROM F_Balance a
                    LEFT JOIN D_AccountTypes d ON a.AccountTypeKey = d.AccountTypeKey
                    WHERE a.AccountKey = ?
                """, (account_key,))
                result = cursor.fetchone()
                if not result:
                    logger.error(f"Account not found for AccountKey: {account_key}. Ensure the account_key exists in the F_Balance table.")
                    return {"success": False, "message": f"Account not found for AccountKey: {account_key}"}
                account_id, account_name, account_type = result
                logger.debug(f"AccountID retrieved: {account_id}, AccountName: {account_name}, AccountType: {account_type} for AccountKey: {account_key}")

                # Process each row in the CSV
                inserted_count = 0
                skipped_count = 0
                for index, row in df.iterrows(): # Use index for better error reporting
                    # Generate TransactionID using the row data and the retrieved account_id
                    transaction_id = generate_transaction_id(row, account_id)
                    logger.debug(f"Generated TransactionID: {transaction_id} for row index {index} and AccountID: {account_id}")

                    # Check for duplicates
                    cursor.execute("SELECT TransactionID FROM F_Transaction WHERE TransactionID = ?", (transaction_id,))
                    if cursor.fetchone():
                        logger.debug(f"Duplicate transaction skipped: TransactionID {transaction_id}")
                        skipped_count += 1
                        continue

                    # --- Date Parsing using Determined Format ---
                    transaction_posted = None # Initialize
                    transaction_posted_str_cleaned = str(row['TransactionPosted']).strip()

                    if not transaction_posted_str_cleaned:
                        # Handle empty date string - skip row or use default? For now, log and skip.
                        logger.warning(f"Skipping row {index+2} due to empty TransactionPosted date.")
                        continue # Skip this row

                    if determined_format: # Only parse if a format was found
                        try:
                            # Use the format determined by the pre-scan
                            # Split potential time part before parsing
                            transaction_posted = datetime.strptime(transaction_posted_str_cleaned.split(' ')[0], determined_format).date()
                        except ValueError as e:
                            # This *shouldn't* happen if pre-scan worked, but good as a safeguard
                            row_number = index + 2
                            logger.error(f"Date parsing failed at row {row_number} using determined format '{determined_format}': Value '{row['TransactionPosted']}'. Error: {e}")
                            return {"success": False, "message": f"Date parsing failed unexpectedly at row {row_number}: '{row['TransactionPosted']}'"}
                    else:
                        # Should only reach here if all dates were empty and pre-scan returned None
                         logger.warning(f"Skipping row {index+2} as no date format could be determined (column might be empty).")
                         continue # Skip row if no format was determined (likely all empty)

                    # --- END Date Parsing ---


                    # Insert the transaction
                    try:
                        # Ensure TransactionAmount is treated as float
                        try:
                            transaction_amount = float(row['TransactionAmount'])
                        except (ValueError, TypeError):
                            row_number = index + 2
                            logger.error(f"Invalid TransactionAmount at row {row_number}: '{row['TransactionAmount']}'. Must be a number.")
                            return {"success": False, "message": f"Invalid TransactionAmount at row {row_number}: '{row['TransactionAmount']}'. Must be a number."}

                        # Use the pre-cleaned string values
                        description_value = str(row['TransactionDescription'])
                        payee_value = str(row['TransactionPayee'])
                        memo_value = str(row['TransactionMemo'])

                        cursor.execute("""
                            INSERT INTO stg_Transaction (
                                AccountID, AccountName, TransactionID, TransactionPosted, TransactionAmount,
                                TransactionDescription, TransactionPayee, TransactionMemo, TransactionPending
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            account_id,
                            account_name,
                            transaction_id,
                            transaction_posted, # Use the parsed date
                            transaction_amount,
                            description_value,
                            payee_value,
                            memo_value,
                            'No'
                        ))
                        inserted_count += 1
                        logger.debug(f"Inserted transaction with TransactionID: {transaction_id}")
                    except Exception as e: # Catch other potential insertion errors
                        row_number = index + 2
                        logger.error(f"Error inserting transaction {transaction_id} from row {row_number}: {e}", exc_info=True)
                        return {"success": False, "message": f"Error inserting transaction from row {row_number}: {e}"}


                # Commit the changes to the database
                conn.commit()
                logger.info(f"Committed {inserted_count} new transactions to the database. Skipped {skipped_count} duplicates.")

        # Adjust success message based on counts
        if inserted_count == 0 and skipped_count > 0:
            message = f"No new transactions uploaded. Skipped {skipped_count} duplicates."
            logger.info(message)
            return {"success": True, "message": message}
        elif inserted_count > 0:
            message = f"Uploaded {inserted_count} transactions successfully. Skipped {skipped_count} duplicates."
            logger.info(message)
            return {"success": True, "message": message}
        else: # inserted_count == 0 and skipped_count == 0
             message = "No transactions found in the file to upload or process."
             logger.info(message)
             return {"success": True, "message": message}

    except pd.errors.EmptyDataError:
        logger.error("The uploaded CSV file is empty.")
        return {"success": False, "message": "The uploaded CSV file is empty."}
    except FileNotFoundError:
        logger.error("The uploaded file could not be found (it might not have been saved correctly).")
        return {"success": False, "message": "Error processing the uploaded file."}
    except ValueError as e: # Catch potential errors during initial float conversion in read_csv
        logger.error(f"Error reading CSV: {str(e)}. Check TransactionAmount column for non-numeric values.")
        return {"success": False, "message": f"Error reading CSV: {str(e)}. Ensure TransactionAmount contains only numbers."}
    except Exception as e:
        logger.error(f"Error in upload_transactions_to_db: {str(e)}", exc_info=True)
        return {"success": False, "message": f"Error uploading transactions: {str(e)}"}

# Define the /upload_transactions route within the Blueprint
@file_to_db_bp.route("/upload_transactions", methods=["POST"])
@login_required
def upload_transactions():
    """
    Endpoint to handle CSV file uploads for transactions and insert them into the database.
    """
    # Import db_lock here if it's defined in your main app package (__init__.py)
    try:
        from SparkyBudget import db_lock
    except ImportError:
        logger.error("Could not import db_lock. Ensure it's defined and accessible.")
        return jsonify({"success": False, "message": "Internal server configuration error (db_lock missing)."}), 500

    logger.info(f"Received request to /upload_transactions at {datetime.now()}")

    try:
        # Get the uploaded file and account_key from the request
        file = request.files.get('file')
        account_key = request.form.get('account_key')

        # Validate inputs
        if not file or not file.filename:
            logger.error("No file provided in /upload_transactions request")
            return jsonify({"success": False, "message": "No file selected for upload"}), 400
        if not account_key:
            logger.error("Missing account_key in /upload_transactions request")
            return jsonify({"success": False, "message": "Account key is required"}), 400

        # Call the function to process the upload
        result = upload_transactions_to_db(file.stream, account_key, db_lock)
        logger.info(f"/upload_transactions completed: {result}")
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in /upload_transactions endpoint: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": f"An unexpected error occurred: {str(e)}"}), 500

