import base64
import csv
import datetime
import json
import os
import sqlite3
#from datetime import datetime


import requests
#from app import db_lock
#from threading import Lock
#db_lock = Lock()


# Function to convert timestamp to datetime
def ts_to_datetime(ts):
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)


def get_access_url():
    # Load setup token from file
    token_file_path = "token.txt"

    try:
        with open(token_file_path, "r") as token_file:
            setup_token = token_file.read().strip()
    except FileNotFoundError:
        print(f"Token file '{token_file_path}' not found.")
        return None

    # Load access URL from file if available
    access_url_file = "access_url.txt"

    try:
        with open(access_url_file, "r") as file:
            access_url = file.read().strip()
        print(f"Loaded Access URL: {access_url}")
    except FileNotFoundError:
        print("Access URL not found. Trying to claim a new one.")

        # Claim an Access URL
        # claim_url = setup_token  # Modify this line accordingly if the actual logic differs
        claim_url = base64.b64decode(setup_token).decode("utf-8")

        response = requests.post(claim_url)
        access_url = response.text

        # Save the access URL to file
        with open(access_url_file, "w") as file:
            file.write(access_url)

        print("Access URL is ", access_url)

    return access_url


def process_accounts_data():
    server_local_timestamp = datetime.datetime.now()
    print(f"process_accounts_data executed at {server_local_timestamp}")
    from app import db_lock  # Import inside the function to avoid circular import
    with db_lock:  # Synchronize database access
        # Create the output folder if it doesn't exist
        output_folder = "output"
        os.makedirs(output_folder, exist_ok=True)

        # Load access URL from file if available
        access_url = get_access_url()
        if access_url:
            # Calculate the start date parameter for the last 12 months (or 10 days for testing)
            last_12_months = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=10)
            start_date_param = int(last_12_months.timestamp())

            # Append the parameters to the access URL
            access_url_with_params = f"{access_url}/accounts?start-date={start_date_param}&pending=1"

            try:
                # Fetch data from the API
                response = requests.get(access_url_with_params)
                response.raise_for_status()  # Raise an exception for HTTP errors
                data = response.json()  # Parse the API response as JSON

                # SQLite database connection (use check_same_thread=False for multi-threading safety)
                with sqlite3.connect("SparkyBudget.db", check_same_thread=False) as conn:
                    cursor = conn.cursor()

                    # Create a temporary table for transactions with pending status
                    create_temp_table_query = """
                    CREATE TEMP TABLE IF NOT EXISTS Temp_F_Transaction_Pending (
                        TransactionID INTEGER,
                        SubCategory TEXT,
                        TransactionAmountNew REAL
                    );
                    """
                    cursor.execute(create_temp_table_query)  # Execute the query

                    # Insert data into the temporary table from F_Transaction
                    insert_into_temp_table_query = """
                    INSERT INTO Temp_F_Transaction_Pending (TransactionID, SubCategory,TransactionAmountNew)
                    SELECT TransactionID, SubCategory, TransactionAmountNew
                    FROM F_Transaction
                    WHERE TransactionPending = 1 AND SubCategory IS NOT NULL;
                    """
                    cursor.execute(insert_into_temp_table_query)

                    # Delete transactions where TransactionPending is True
                    delete_query = "DELETE FROM F_Transaction WHERE TransactionPending=1"
                    cursor.execute(delete_query)

                    # Prepare lists to store data for CSV output
                    balance_org_data_list = []  # For balance and organization data
                    transactions_data_list = []  # For transaction data

                    # Process each account returned by the API
                    for account in data.get("accounts", []):
                        # Convert balance-date timestamp to datetime
                        account["balance-date"] = ts_to_datetime(account["balance-date"])

                        # Remove asterisks from the account name for filename purposes
                        account_name = account["name"].replace("*", "")

                        # Extract account information for database insertion
                        balance_insert_query = """
                            INSERT INTO stg_Balance (AccountID, AccountName, BalanceDate, Balance, AvailableBalance, OrganizationDomain, OrganizationName, OrganizationSFInURL)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """
                        balance_insert_data = (
                            account["id"],
                            account_name,
                            account["balance-date"].isoformat(),
                            account["balance"],
                            account["available-balance"],
                            account.get("org", {}).get("domain", ""),
                            account.get("org", {}).get("name", ""),  # Extract OrganizationName
                            account.get("org", {}).get("sfin-url", ""),  # Extract OrganizationSFInURL
                        )

                        # Insert account balance and organization data into the database
                        cursor.execute(balance_insert_query, balance_insert_data)
                        # Append balance and organization data to the list
                        balance_org_data_list.append(account)

                        # Process transaction data for the account, if available
                        if "transactions" in account:
                            for transaction in account["transactions"]:
                                transaction_info = {
                                    "Account ID": account["id"],
                                    "Account Name": account_name,
                                    "Transaction ID": transaction.get("id", ""),
                                    "Transaction Posted": ts_to_datetime(transaction.get("transacted_at", 0)).isoformat(),
                                    "Transaction Amount": transaction.get("amount", 0.0),
                                    "Transaction Description": transaction.get("description", ""),
                                    "Transaction Payee": transaction.get("payee", ""),
                                    "Transaction Memo": transaction.get("memo", ""),
                                    "Transaction Pending": transaction.get("pending", False),
                                }

                                # Insert transaction data into the database
                                transaction_insert_query = """
                                    INSERT INTO stg_Transaction (AccountID, AccountName, TransactionID, TransactionPosted, TransactionAmount, TransactionDescription, TransactionPayee, TransactionMemo, TransactionPending)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """
                                transaction_insert_data = (
                                    transaction_info["Account ID"],
                                    transaction_info["Account Name"],
                                    transaction_info["Transaction ID"],
                                    transaction_info["Transaction Posted"],
                                    transaction_info["Transaction Amount"],
                                    transaction_info["Transaction Description"],
                                    transaction_info["Transaction Payee"],
                                    transaction_info["Transaction Memo"],
                                    transaction_info["Transaction Pending"],
                                )
                                cursor.execute(transaction_insert_query, transaction_insert_data)
                                # Append transaction data to the list
                                transactions_data_list.append(transaction_info)

                    # Update F_Transaction with SubCategory from the temporary table
                    update_F_Transaction_query = """
                    UPDATE F_Transaction
                    SET 
                        SubCategory = (
                            SELECT SubCategory
                            FROM Temp_F_Transaction_Pending
                            WHERE Temp_F_Transaction_Pending.TransactionID = F_Transaction.TransactionID
                        ),
                        TransactionAmountNew = (
                            SELECT TransactionAmountNew
                            FROM Temp_F_Transaction_Pending
                            WHERE Temp_F_Transaction_Pending.TransactionID = F_Transaction.TransactionID
                        )
                    WHERE TransactionID IN (
                        SELECT TransactionID
                        FROM Temp_F_Transaction_Pending
                    );

                    """
                    cursor.execute(update_F_Transaction_query)

                    # Commit changes to the database
                    conn.commit()

                # Indicate successful processing
                print("Data processed and saved to database.")
                
                
                
                
                # Save balance and organization data to CSV file
                balance_org_csv_filename = os.path.join(output_folder, "balance_org_data.csv")
                with open(balance_org_csv_filename, "w", newline="", encoding="utf-8") as csv_file:
                    csv_writer = csv.writer(csv_file)

                    # Write header
                    header = [key.replace("-", " ") for key in balance_org_data_list[0].keys()]
                    csv_writer.writerow(header)

                    # Write data
                    for balance_org_data in balance_org_data_list:
                        csv_writer.writerow([balance_org_data.get(key, "") for key in header])

                print(f"Balance and organization data saved to {balance_org_csv_filename}")

                # Save transactions data to CSV file
                transactions_csv_filename = os.path.join(output_folder, "transactions_data.csv")
                with open(transactions_csv_filename, "w", newline="", encoding="utf-8") as csv_file:
                    csv_writer = csv.writer(csv_file)

                    # Write header
                    header = [key.replace("-", " ") for key in transactions_data_list[0].keys()]
                    csv_writer.writerow(header)

                    # Write data
                    for transaction_data in transactions_data_list:
                        csv_writer.writerow([transaction_data.get(key, "") for key in header])

                print(f"Transactions data saved to {transactions_csv_filename}")

                print("Data saved to the database and CSV files.")


            # Handle potential request exceptions
            except requests.exceptions.RequestException as err:
                print(f"Error during API call: {err}")



# Call the function if this script is executed directly
if __name__ == "__main__":
    process_accounts_data()
