CREATE TABLE "D_AccountTypes" (
	"AccountTypeKey"	INTEGER NOT NULL,
	"AccountType"	TEXT NOT NULL,
	"SortOrder"	INTEGER NOT NULL,
	"HideFromBudget"	BOOLEAN DEFAULT 0 COLLATE BINARY,
	PRIMARY KEY("AccountTypeKey" AUTOINCREMENT)
);


CREATE TABLE "D_Budget" (	
	"SubCategory"	TEXT,
	"BudgetAmount"	REAL,
	PRIMARY KEY("SubCategory")
);
CREATE TABLE "D_Category" (
	"SubCategoryKey"	INTEGER NOT NULL UNIQUE,
	"SubCategory"	TEXT UNIQUE,
	"Category"	TEXT,
	PRIMARY KEY("SubCategoryKey" AUTOINCREMENT)
);
CREATE TABLE "D_Category_Rule" (
	"RuleKey"	INTEGER NOT NULL,
	"Default_SubCategory"	TEXT NOT NULL,
	"Rule_Category"	TEXT NOT NULL,
	"Rule_Pattern"	TEXT NOT NULL,
	"Match_Word"	TEXT NOT NULL,
	PRIMARY KEY("RuleKey" AUTOINCREMENT)
);
CREATE TABLE "F_Balance" (
	"AccountKey"	INTEGER,
	"AccountID"	TEXT,
	"AccountName"	TEXT,
	"BalanceDate"	DATE,
	"Balance"	REAL,
	"AvailableBalance"	REAL,
	"OrganizationDomain"	TEXT,
	"OrganizationName"	TEXT,
	"OrganizationSFInURL"	TEXT,
	"DisplayAccountName"	TEXT,
	AccountTypeKey INTEGER,
	PRIMARY KEY("AccountKey" AUTOINCREMENT)
);
CREATE TABLE "F_Balance_History" (
	"Date"	DATE,
	"AccountID"	TEXT,
	"AccountName"	TEXT,
	"BalanceDate"	DATE,
	"Balance"	REAL,
	"AvailableBalance"	REAL,
	"OrganizationDomain"	TEXT,
	"OrganizationName"	TEXT,
	"OrganizationSFInURL"	TEXT,
	"DisplayAccountName"	TEXT,
	AccountTypeKey INTEGER,
	PRIMARY KEY("Date","AccountID")
);
CREATE TABLE "F_Budget" (
	"BudgetMonth"	DATE,
	"SubCategory"	TEXT,
	"BudgetAmount"	REAL,
	PRIMARY KEY("BudgetMonth","SubCategory")
);
CREATE TABLE "F_Transaction" (
	"TransactionKey"	INTEGER,
	"AccountID"	TEXT,
	"AccountName"	TEXT,
	"TransactionID"	TEXT,
	"TransactionPosted"	DATE,
	"TransactionAmount"	REAL,
	"TransactionDescription"	TEXT,
	"TransactionPayee"	TEXT,
	"TransactionMemo"	TEXT,
	"SubCategory"	TEXT,
	"TransactionPending"	TEXT,
	"TransactionAmountNew"	REAL,
	PRIMARY KEY("TransactionKey" AUTOINCREMENT)
);
CREATE TABLE stg_Balance (
    AccountID TEXT,
    AccountName TEXT,
    BalanceDate DATE,
    Balance REAL,
    AvailableBalance REAL,
    OrganizationDomain TEXT,
    OrganizationName TEXT,
    OrganizationSFInURL TEXT
);
CREATE TABLE "stg_Transaction" (
	"AccountID"	TEXT,
	"AccountName"	TEXT,
	"TransactionID"	TEXT,
	"TransactionPosted"	DATE,
	"TransactionAmount"	REAL,
	"TransactionDescription"	TEXT,
	"TransactionPayee"	TEXT,
	"TransactionMemo"	TEXT,
	"TransactionPending"	TEXT
);



CREATE TRIGGER tr_insert_stg_balance
AFTER INSERT ON stg_balance
FOR EACH ROW
BEGIN
    -- Insert or replace record in f_balance
    INSERT OR REPLACE INTO f_balance (
        AccountKey,
        AccountID,
        AccountName,
        BalanceDate,
        Balance,
        AvailableBalance,
        OrganizationDomain,
        OrganizationName,
        OrganizationSFInURL,
		AccountTypeKey,
		DisplayAccountName
    ) VALUES (
        (SELECT AccountKey FROM f_balance WHERE AccountID = NEW.AccountID),  -- Use subquery to get existing AccountKey
        NEW.AccountID,
        NEW.AccountName,
        NEW.BalanceDate,
        NEW.Balance,
        NEW.AvailableBalance,
        NEW.OrganizationDomain,
        NEW.OrganizationName,
        NEW.OrganizationSFInURL,
		(SELECT AccountTypeKey FROM f_balance WHERE AccountID = NEW.AccountID),  -- Use the existing value of AccountType
		(SELECT DisplayAccountName FROM f_balance WHERE AccountID = NEW.AccountID)  -- Use the existing value of DisplayAccountName

    );

    -- Remove the specific record from stg_balance after insert
    DELETE FROM stg_balance WHERE AccountID = NEW.AccountID;
END
;

CREATE TRIGGER tr_insert_stg_transaction
AFTER INSERT ON stg_transaction
FOR EACH ROW
BEGIN
    -- Insert or replace record in f_transaction
    INSERT OR REPLACE INTO f_transaction (
        TransactionKey,
        AccountID,
        AccountName,
        TransactionID,
        TransactionPosted,
        TransactionAmount,
        TransactionDescription,
        TransactionPayee,
        TransactionMemo,
		TransactionPending,
		SubCategory
    ) VALUES (
        (SELECT TransactionKey FROM f_transaction WHERE TransactionID = NEW.TransactionID),
        NEW.AccountID,
        NEW.AccountName,
        NEW.TransactionID,
        NEW.TransactionPosted,
        NEW.TransactionAmount,
        NEW.TransactionDescription,
        NEW.TransactionPayee,
        NEW.TransactionMemo,
		NEW.TransactionPending,
		(SELECT SubCategory FROM f_transaction WHERE TransactionID = NEW.TransactionID)
    );

    -- Remove the specific record from stg_transaction after insert
    DELETE FROM stg_transaction WHERE TransactionID = NEW.TransactionID;
	
	 UPDATE F_Transaction
    SET SubCategory = (
        SELECT DISTINCT a12.Default_SubCategory
        FROM D_Category_Rule a12
        WHERE 
            (LOWER(F_Transaction.TransactionPayee) LIKE '%' || LOWER(a12.Match_Word) || '%'
             OR LOWER(a12.Match_Word) LIKE '%' || LOWER(F_Transaction.TransactionPayee) || '%')
            AND a12.Rule_Category = 'Payee'
            AND a12.Rule_Pattern = 'Contains'
        LIMIT 1
    )
    WHERE EXISTS (
        SELECT 1
        FROM D_Category_Rule a12
        WHERE 
            (LOWER(F_Transaction.TransactionPayee) LIKE '%' || LOWER(a12.Match_Word) || '%'
             OR LOWER(a12.Match_Word) LIKE '%' || LOWER(F_Transaction.TransactionPayee) || '%')
            AND a12.Rule_Category = 'Payee'
            AND a12.Rule_Pattern = 'Contains'
    )
    AND SubCategory IS NULL;
	
END
;