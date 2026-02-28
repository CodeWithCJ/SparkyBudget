-- SparkyBudget_Upgrade_v0.20.sql

-- Add AccountName column to D_Category_Rule

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
            -- Specific Account, Exact Match (Highest Priority)
            SELECT Default_SubCategory, D_Category_Rule.AccountName, D_Category_Rule.Rule_Pattern, 0 AS Priority
            FROM D_Category_Rule
            WHERE
                LOWER(NEW.TransactionPayee) = LOWER(D_Category_Rule.Match_Word)
                AND D_Category_Rule.Rule_Category = 'Payee'
                AND D_Category_Rule.Rule_Pattern = 'Exact'
                AND D_Category_Rule.AccountName = NEW.AccountName
            UNION ALL
            -- Specific Account, Contains Match
            SELECT Default_SubCategory, D_Category_Rule.AccountName, D_Category_Rule.Rule_Pattern, 1 AS Priority
            FROM D_Category_Rule
            WHERE
                (LOWER(NEW.TransactionPayee) LIKE '%' || LOWER(D_Category_Rule.Match_Word) || '%'
                 OR LOWER(D_Category_Rule.Match_Word) LIKE '%' || LOWER(NEW.TransactionPayee) || '%')
                AND D_Category_Rule.Rule_Category = 'Payee'
                AND D_Category_Rule.Rule_Pattern = 'Contains'
                AND D_Category_Rule.AccountName = NEW.AccountName
            UNION ALL
            -- ALL Accounts, Exact Match
            SELECT Default_SubCategory, D_Category_Rule.AccountName, D_Category_Rule.Rule_Pattern, 2 AS Priority
            FROM D_Category_Rule
            WHERE
                LOWER(NEW.TransactionPayee) = LOWER(D_Category_Rule.Match_Word)
                AND D_Category_Rule.Rule_Category = 'Payee'
                AND D_Category_Rule.Rule_Pattern = 'Exact'
                AND D_Category_Rule.AccountName = 'ALL'
            UNION ALL
            -- ALL Accounts, Contains Match (Lowest Priority)
            SELECT Default_SubCategory, D_Category_Rule.AccountName, D_Category_Rule.Rule_Pattern, 3 AS Priority
            FROM D_Category_Rule
            WHERE
                (LOWER(NEW.TransactionPayee) LIKE '%' || LOWER(D_Category_Rule.Match_Word) || '%'
                 OR LOWER(D_Category_Rule.Match_Word) LIKE '%' || LOWER(NEW.TransactionPayee) || '%')
                AND D_Category_Rule.Rule_Category = 'Payee'
                AND D_Category_Rule.Rule_Pattern = 'Contains'
                AND D_Category_Rule.AccountName = 'ALL'
        ) AS SubQueryWithPattern
        ORDER BY
            SubQueryWithPattern.Priority ASC
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
UPDATE SchemaVersion SET Version = 'v0.20';
