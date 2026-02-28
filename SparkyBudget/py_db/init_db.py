"""
init_db.py  — PATCHED for Issue #25
Fix: Upgrade script execution is now resilient to "duplicate column name" errors.

Root cause: SparkyBudget_Upgrade_v0.20.sql tries to ADD COLUMN AccountName to 
the Accounts table, but AccountName is already defined in the base schema 
(or a prior migration). SQLite raises OperationalError and aborts the worker.

Two-part fix applied here:
  1. _execute_upgrade_script() now skips "duplicate column name" errors gracefully,
     letting the rest of the migration (especially the version bump) still run.
  2. _column_exists() helper added for future upgrade scripts to guard ADD COLUMN
     statements explicitly.
"""

import sqlite3
import os
import logging

logger = logging.getLogger("py_db.init_db")


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    """Return True if `column` already exists in `table`."""
    cursor = conn.execute(f"PRAGMA table_info({table})")
    return any(row[1].lower() == column.lower() for row in cursor.fetchall())


def _execute_upgrade_script(conn: sqlite3.Connection, script_path: str) -> None:
    """
    Execute a SQL upgrade script, tolerating duplicate-column errors.

    SQLite does not support `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on older
    versions (<3.37). Instead of aborting the entire upgrade on a benign
    "duplicate column name" error, we skip those specific statements and continue.
    This is safe because if the column already exists the desired end-state is met.
    """
    script_name = os.path.basename(script_path)
    try:
        with open(script_path, "r") as f:
            sql_content = f.read()
    except FileNotFoundError:
        logger.error(f"Upgrade script not found: {script_path}")
        raise

    # Split on semicolons and execute each statement individually
    statements = [s.strip() for s in sql_content.split(";") if s.strip()]
    cursor = conn.cursor()

    for statement in statements:
        # Skip pure comment blocks
        if statement.startswith("--") and "\n" not in statement:
            continue
        try:
            cursor.execute(statement)
        except sqlite3.OperationalError as e:
            error_msg = str(e).lower()
            if "duplicate column name" in error_msg:
                # The column already exists — this is harmless. Log and continue.
                logger.warning(
                    f"Skipping statement in {script_name} (column already exists): {e}\n"
                    f"  Statement: {statement[:120]}"
                )
            else:
                # Any other SQL error is a real problem — re-raise it.
                logger.error(
                    f"Error executing statement in {script_name}: {e}\n"
                    f"  Statement: {statement[:120]}"
                )
                raise

    conn.commit()
    logger.info(f"Successfully executed upgrade script: {script_name}")


def init_db(db_path: str) -> None:
    """
    Initialize or upgrade the SparkyBudget database.

    Checks the current schema version and runs any pending upgrade scripts
    in order. Uses _execute_upgrade_script() which is resilient to 
    duplicate-column errors from idempotency issues in upgrade SQL files.
    """
    UPGRADE_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "database")
    CURRENT_VERSION = "v0.20"

    # Map from version → upgrade script filename (add new entries here for each release)
    UPGRADE_MAP = {
        "v0.19": "SparkyBudget_Upgrade_v0.20.sql",
        # "v0.20": "SparkyBudget_Upgrade_v0.21.sql",  # add future upgrades here
    }

    if not os.path.exists(db_path):
        logger.info("No database file found. Creating new database...")
        _create_new_db(db_path)
        return

    logger.info("Database file found. Checking version...")
    conn = sqlite3.connect(db_path)

    try:
        row = conn.execute("SELECT Version FROM SchemaVersion").fetchone()
        current_version = row[0] if row else "v0.0"
        logger.info(f"Existing database version: {current_version}")

        # Collect all upgrade scripts that need to run
        pending = []
        v = current_version
        while v in UPGRADE_MAP:
            script = UPGRADE_MAP[v]
            pending.append(script)
            # Derive the target version from the script filename
            # e.g. "SparkyBudget_Upgrade_v0.20.sql" → "v0.20"
            v = script.replace("SparkyBudget_Upgrade_", "").replace(".sql", "")

        if not pending:
            logger.info("Database is already up to date.")
            return

        logger.info(f"Checking for database upgrades...")
        logger.info(f"Found {len(pending)} upgrade script(s) to execute.")

        for script_name in pending:
            script_path = os.path.join(UPGRADE_SCRIPTS_DIR, script_name)
            logger.info(f"Executing upgrade script: {script_name}")
            _execute_upgrade_script(conn, script_path)

        logger.info(f"Database successfully upgraded to {CURRENT_VERSION}")

    except Exception as e:
        logger.error(f"An error occurred during database initialization or upgrade: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def _create_new_db(db_path: str) -> None:
    """Create a fresh database from the base schema."""
    BASE_SCHEMA = os.path.join(os.path.dirname(__file__), "..", "database", "SparkyBudget.sql")
    conn = sqlite3.connect(db_path)
    try:
        with open(BASE_SCHEMA, "r") as f:
            conn.executescript(f.read())
        conn.commit()
        logger.info("New database created successfully.")
    except Exception as e:
        logger.error(f"Failed to create new database: {e}")
        raise
    finally:
        conn.close()