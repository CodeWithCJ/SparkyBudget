-- SparkyBudget_Upgrade_v0.20.sql

-- Add AccountName column to D_Category_Rule
ALTER TABLE D_Category_Rule ADD COLUMN AccountName TEXT;

-- Add TransactionAmount column to D_Category_Rule
ALTER TABLE D_Category_Rule ADD COLUMN TransactionAmount REAL;

-- Add TransactionDate column to D_Category_Rule
ALTER TABLE D_Category_Rule ADD COLUMN TransactionDate DATE;

-- Set default values for existing rows
UPDATE D_Category_Rule SET AccountName = 'ALL' WHERE AccountName IS NULL;
-- Rule_Pattern already exists and defaults to 'Contains' for existing rules, so no change needed here.


DROP TRIGGER IF EXISTS tr_insert_stg_transaction;

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
        SELECT Default_SubCategory FROM (
            SELECT Default_SubCategory, D_Category_Rule.AccountName
            FROM D_Category_Rule
            WHERE
                (LOWER(NEW.TransactionPayee) LIKE '%' || LOWER(D_Category_Rule.Match_Word) || '%'
                 OR LOWER(D_Category_Rule.Match_Word) LIKE '%' || LOWER(NEW.TransactionPayee) || '%')
                AND D_Category_Rule.Rule_Category = 'Payee'
                AND D_Category_Rule.Rule_Pattern = 'Contains'
                AND D_Category_Rule.AccountName = NEW.AccountName
            UNION ALL
            SELECT Default_SubCategory, D_Category_Rule.AccountName
            FROM D_Category_Rule
            WHERE
                (LOWER(NEW.TransactionPayee) LIKE '%' || LOWER(D_Category_Rule.Match_Word) || '%'
                 OR LOWER(D_Category_Rule.Match_Word) LIKE '%' || LOWER(NEW.TransactionPayee) || '%')
                AND D_Category_Rule.Rule_Category = 'Payee'
                AND D_Category_Rule.Rule_Pattern = 'Contains'
                AND D_Category_Rule.AccountName = 'ALL'
        )
        ORDER BY
            CASE WHEN AccountName = NEW.AccountName THEN 0 ELSE 1 END,
            CASE WHEN Rule_Pattern = 'Exact' THEN 0 ELSE 1 END
        LIMIT 1
    )
    WHERE F_Transaction.TransactionID = NEW.TransactionID
    AND SubCategory IS NULL
    AND EXISTS (
        SELECT 1
        FROM D_Category_Rule
        WHERE
            (LOWER(NEW.TransactionPayee) LIKE '%' || LOWER(D_Category_Rule.Match_Word) || '%'
             OR LOWER(D_Category_Rule.Match_Word) LIKE '%' || LOWER(NEW.TransactionPayee) || '%')
            AND D_Category_Rule.Rule_Category = 'Payee'
            AND (D_Category_Rule.Rule_Pattern = 'Contains' OR D_Category_Rule.Rule_Pattern = 'Exact')
            AND (D_Category_Rule.AccountName = NEW.AccountName OR D_Category_Rule.AccountName = 'ALL')
    );
	
END
;

-- Update DB_VERSION

-- Update DB_VERSION
UPDATE D_DB SET DB_VERSION = "v0.20";