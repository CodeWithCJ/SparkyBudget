import base64
import csv
import datetime
import json
import os
import sqlite3

import requests


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

    # Create the output folder if it doesn't exist
    output_folder = "output"
    os.makedirs(output_folder, exist_ok=True)

    # Load access URL from file if available
    access_url = get_access_url()

    # Continue only if the access URL is available
    if access_url:
        # Append the start-date parameter to the access URL
        last_12_months = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
        start_date_param = int(last_12_months.timestamp())

        # Append "accounts?" to the URL
        access_url_with_params = f"{access_url}/accounts?start-date={start_date_param}&pending=1"

        # Use the Access URL to get some data
        try:
            response = requests.get(access_url_with_params)
            response.raise_for_status()
            data = response.json()  # Parse the response as JSON

            # SQLite database connection
            conn = sqlite3.connect("SparkyBudget.db")
            cursor = conn.cursor()

            create_temp_table_query = """
            CREATE TEMP TABLE IF NOT EXISTS Temp_F_Transaction_Pending (
                TransactionID INTEGER,
                SubCategory TEXT
            );
            """

            insert_into_temp_table_query = """
            INSERT INTO Temp_F_Transaction_Pending (TransactionID, SubCategory)
            SELECT TransactionID, SubCategory
            FROM F_Transaction
            WHERE TransactionPending = 1 AND SubCategory IS NOT NULL;
            """

            update_F_Transaction_query = """
            UPDATE F_Transaction
            SET SubCategory = (
                SELECT SubCategory
                FROM Temp_F_Transaction_Pending
                WHERE Temp_F_Transaction_Pending.TransactionID = F_Transaction.TransactionID
            )
            WHERE EXISTS (
                SELECT 1
                FROM Temp_F_Transaction_Pending
                WHERE Temp_F_Transaction_Pending.TransactionID = F_Transaction.TransactionID
            );
            """

            cursor.execute(create_temp_table_query)
            cursor.execute(insert_into_temp_table_query)

            # SQL query to delete all transactions where TransactionPending is 'True'
            delete_query = "DELETE FROM F_Transaction WHERE TransactionPending=1"

            # Execute the query
            cursor.execute(delete_query)

            # Commit the changes to the database to ensure that the deletions are saved
            # connection.commit()  # Assuming `connection` is your database connection object

            # Lists to store data for CSV files
            balance_org_data_list = []
            transactions_data_list = []

            # Process each account
            for account in data.get("accounts", []):
                account["balance-date"] = ts_to_datetime(account["balance-date"])

                # Remove asterisks from the account name for filename
                account_name = account["name"].replace("*", "")

                # Extract account information
                account_info = {
                    "Account ID": account["id"],
                    "Account Name": account_name,
                    "Balance Date": account["balance-date"].isoformat(),
                    "Balance": account["balance"],
                    "Available Balance": account["available-balance"],
                }

                # Extract organization data
                organization_data = account.get("org", {})
                # print("Organization Data for Account ID {}: {}".format(account_info['Account ID'], organization_data))
                organization_domain = organization_data.get("domain", "")
                organization_name = organization_data.get("name", "")  # Extract OrganizationName
                organization_sf_in_url = organization_data.get("sfin-url", "")

                # Save balance and organization data to the database
                balance_insert_query = "INSERT INTO stg_Balance (AccountID, AccountName, BalanceDate, Balance, AvailableBalance, OrganizationDomain, OrganizationName, OrganizationSFInURL) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                balance_insert_data = (
                    account_info["Account ID"],
                    account_info["Account Name"],
                    account_info["Balance Date"],
                    account_info["Balance"],
                    account_info["Available Balance"],
                    organization_domain,
                    organization_name,
                    organization_sf_in_url,
                )

                # print("Balance Insert Query:", balance_insert_query)
                # print("Balance Insert Data:", balance_insert_data)

                cursor.execute(balance_insert_query, balance_insert_data)

                # Append data to the lists
                balance_org_data_list.append(account_info)  # Append balance and organization data

                # Save transactions data for the account
                if "transactions" in account and account["transactions"]:
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

                        # Save transaction data to the database
                        transaction_insert_query = "INSERT INTO stg_Transaction (AccountID, AccountName, TransactionID, TransactionPosted, TransactionAmount, TransactionDescription, TransactionPayee, TransactionMemo, TransactionPending) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"

                        transaction_insert_data = (
                            transaction_info["Account ID"],
                            transaction_info["Account Name"],
                            transaction_info.get("Transaction ID", ""),
                            transaction_info["Transaction Posted"],
                            transaction_info.get("Transaction Amount", 0.0),
                            transaction_info.get("Transaction Description", ""),
                            transaction_info.get("Transaction Payee", ""),
                            transaction_info.get("Transaction Memo", ""),
                            transaction_info.get("Transaction Pending", ""),
                        )

                        cursor.execute(transaction_insert_query, transaction_insert_data)

                        # Append data to the lists
                        transactions_data_list.append(transaction_info)  # Append transaction data

            cursor.execute(update_F_Transaction_query)

            # Commit the changes to the database
            conn.commit()

            # Close the database connection
            conn.close()

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

        except ValueError as ve:
            print(f"Error processing access_url: {ve}")
        except requests.exceptions.HTTPError as errh:
            print(f"HTTP Error: {errh}")
        except requests.exceptions.ConnectionError as errc:
            print(f"Error Connecting: {errc}")
        except requests.exceptions.Timeout as errt:
            print(f"Timeout Error: {errt}")
        except requests.exceptions.RequestException as err:
            print(f"OOps: Something went wrong: {err}")


# Call the function if this script is executed directly
if __name__ == "__main__":
    process_accounts_data()
