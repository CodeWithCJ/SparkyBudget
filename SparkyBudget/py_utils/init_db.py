import sqlite3
import logging
import os

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize the SparkyBudget database with all required tables."""
    try:
        conn = sqlite3.connect("SparkyBudget.db")
        cursor = conn.cursor()

        # Create D_AccountTypes table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS D_AccountTypes (
            AccountTypeKey INTEGER PRIMARY KEY AUTOINCREMENT,
            AccountType TEXT UNIQUE NOT NULL,
            HideFromBudget INTEGER DEFAULT 0,
            SortOrder INTEGER DEFAULT 0
        )
        """)

        # Create D_Category table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS D_Category (
            SubCategoryKey INTEGER PRIMARY KEY AUTOINCREMENT,
            SubCategory TEXT NOT NULL,
            Category TEXT NOT NULL,
            UNIQUE(SubCategory, Category)
        )
        """)

        # Create D_Category_Rule table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS D_Category_Rule (
            RuleKey INTEGER PRIMARY KEY AUTOINCREMENT,
            Default_SubCategory TEXT NOT NULL,
            Rule_Category TEXT NOT NULL,
            Rule_Pattern TEXT NOT NULL,
            Match_Word TEXT NOT NULL,
            FOREIGN KEY (Default_SubCategory) REFERENCES D_Category(SubCategory)
        )
        """)

        # Create D_Budget table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS D_Budget (
            BudgetKey INTEGER PRIMARY KEY AUTOINCREMENT,
            SubCategory TEXT NOT NULL,
            BudgetAmount REAL NOT NULL,
            FOREIGN KEY (SubCategory) REFERENCES D_Category(SubCategory)
        )
        """)

        # Create F_Balance table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS F_Balance (
            BalanceKey INTEGER PRIMARY KEY AUTOINCREMENT,
            AccountID TEXT NOT NULL,
            AccountName TEXT NOT NULL,
            AccountKey TEXT UNIQUE NOT NULL,
            BalanceDate TEXT NOT NULL,
            Balance REAL NOT NULL,
            AvailableBalance REAL NOT NULL,
            OrganizationDomain TEXT,
            OrganizationName TEXT,
            OrganizationSFInURL TEXT,
            DisplayAccountName TEXT,
            AccountTypeKey INTEGER,
            FOREIGN KEY (AccountTypeKey) REFERENCES D_AccountTypes(AccountTypeKey)
        )
        """)

        # Create F_Balance_History table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS F_Balance_History (
            HistoryKey INTEGER PRIMARY KEY AUTOINCREMENT,
            Date TEXT NOT NULL,
            AccountID TEXT NOT NULL,
            AccountName TEXT NOT NULL,
            BalanceDate TEXT NOT NULL,
            Balance REAL NOT NULL,
            AvailableBalance REAL NOT NULL,
            OrganizationDomain TEXT,
            OrganizationName TEXT,
            OrganizationSFInURL TEXT,
            DisplayAccountName TEXT,
            AccountTypeKey INTEGER,
            FOREIGN KEY (AccountTypeKey) REFERENCES D_AccountTypes(AccountTypeKey)
        )
        """)

        # Create F_Budget table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS F_Budget (
            BudgetKey INTEGER PRIMARY KEY AUTOINCREMENT,
            BudgetMonth TEXT NOT NULL,
            SubCategory TEXT NOT NULL,
            BudgetAmount REAL NOT NULL,
            FOREIGN KEY (SubCategory) REFERENCES D_Category(SubCategory)
        )
        """)

        # Create F_Transaction table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS F_Transaction (
            TransactionKey INTEGER PRIMARY KEY AUTOINCREMENT,
            AccountID TEXT NOT NULL,
            AccountName TEXT NOT NULL,
            TransactionID TEXT UNIQUE NOT NULL,
            TransactionPosted TEXT NOT NULL,
            TransactionAmount REAL NOT NULL,
            TransactionDescription TEXT,
            TransactionPayee TEXT,
            TransactionMemo TEXT,
            TransactionPending TEXT DEFAULT 'No',
            SubCategory TEXT,
            TransactionAmountNew REAL,
            FOREIGN KEY (SubCategory) REFERENCES D_Category(SubCategory)
        )
        """)

        # Create stg_Transaction table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS stg_Transaction (
            TransactionKey INTEGER PRIMARY KEY AUTOINCREMENT,
            AccountID TEXT NOT NULL,
            AccountName TEXT NOT NULL,
            TransactionID TEXT UNIQUE NOT NULL,
            TransactionPosted TEXT NOT NULL,
            TransactionAmount REAL NOT NULL,
            TransactionDescription TEXT,
            TransactionPayee TEXT,
            TransactionMemo TEXT,
            TransactionPending TEXT DEFAULT 'No'
        )
        """)

        # Create stg_Balance table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS stg_Balance (
            BalanceKey INTEGER PRIMARY KEY AUTOINCREMENT,
            AccountID TEXT NOT NULL,
            AccountName TEXT NOT NULL,
            BalanceDate TEXT NOT NULL,
            Balance REAL NOT NULL,
            AvailableBalance REAL NOT NULL,
            OrganizationDomain TEXT,
            OrganizationName TEXT,
            OrganizationSFInURL TEXT
        )
        """)

        # Insert default account types if they don't exist
        default_account_types = [
            ("Checking", 0, 1),
            ("Savings", 0, 2),
            ("Credit Card", 0, 3),
            ("Investment", 1, 4),
            ("Loan", 1, 5),
            ("Other", 1, 6)
        ]
        
        cursor.executemany("""
            INSERT OR IGNORE INTO D_AccountTypes (AccountType, HideFromBudget, SortOrder)
            VALUES (?, ?, ?)
        """, default_account_types)

        # Insert default categories if they don't exist
        default_categories = [
            ("Housing", "Rent/Mortgage"),
            ("Housing", "Utilities"),
            ("Transportation", "Gas"),
            ("Transportation", "Public Transit"),
            ("Food", "Groceries"),
            ("Food", "Dining Out"),
            ("Healthcare", "Insurance"),
            ("Healthcare", "Medical Expenses"),
            ("Entertainment", "Movies"),
            ("Entertainment", "Games"),
            ("Shopping", "Clothing"),
            ("Shopping", "Electronics"),
            ("Income", "Salary"),
            ("Income", "Investments"),
            ("Other", "Miscellaneous")
        ]
        
        cursor.executemany("""
            INSERT OR IGNORE INTO D_Category (Category, SubCategory)
            VALUES (?, ?)
        """, default_categories)

        conn.commit()
        logger.info("Database initialized successfully")
        return True

    except sqlite3.Error as e:
        logger.error(f"Database initialization error: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during database initialization: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    init_database() 