import sqlite3

db_path = "opallios_intake.db"
con = sqlite3.connect(db_path)
cur = con.cursor()

# Check current columns
cols = [row[1] for row in cur.execute("PRAGMA table_info(submissions)").fetchall()]
print("Current columns:", cols)

# Add columns if they don't exist
new_cols_added = False
if "has_updates" not in cols:
    cur.execute("ALTER TABLE submissions ADD COLUMN has_updates INTEGER DEFAULT 0")
    print("Added 'has_updates' column.")
    new_cols_added = True

if "was_completed" not in cols:
    cur.execute("ALTER TABLE submissions ADD COLUMN was_completed INTEGER DEFAULT 0")
    print("Added 'was_completed' column.")
    new_cols_added = True

# For existing submissions that are already 'completed', mark them as 'was_completed'
cur.execute("UPDATE submissions SET was_completed = 1 WHERE status = 'completed'")
affected = cur.rowcount
print(f"Set 'was_completed = 1' for {affected} existing completed submissions.")

con.commit()
print("Migration complete.")

con.close()
