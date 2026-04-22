import sqlite3

db_path = "opallios_intake.db"
con = sqlite3.connect(db_path)
cur = con.cursor()

# Check current columns
cols = [row[1] for row in cur.execute("PRAGMA table_info(users)").fetchall()]
print("Current columns:", cols)

if "role" not in cols:
    cur.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'csm'")
    print("Migration complete: added role column, all users defaulted to csm.")
else:
    # Column already exists — ensure all existing users are set to csm
    cur.execute("UPDATE users SET role = 'csm'")
    print(f"Updated {cur.rowcount} existing user(s) to role='csm'.")

con.commit()

# Show result
rows = cur.execute("SELECT id, name, email, role FROM users").fetchall()
print("\nCurrent users:")
for row in rows:
    print(f"  ID={row[0]}, Name={row[1]}, Email={row[2]}, Role={row[3]}")

con.close()
