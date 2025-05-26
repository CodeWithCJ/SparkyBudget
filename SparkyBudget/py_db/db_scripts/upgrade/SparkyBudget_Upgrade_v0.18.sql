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


update D_DB set DB_VERSION = "v0.18";