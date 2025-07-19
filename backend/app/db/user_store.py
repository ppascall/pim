import csv
import os

USER_CSV = "app/db/users.csv"

def get_user_by_email(email: str):
    if not os.path.isfile(USER_CSV):
        return None
    with open(USER_CSV, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if row['email'] == email:
                return row
    return None

def add_user(email: str, hashed_password: str, role: str = "user"):
    file_exists = os.path.isfile(USER_CSV)
    with open(USER_CSV, "a", newline='') as csvfile:
        writer = csv.writer(csvfile)
        # Write header if file is empty
        if os.stat(USER_CSV).st_size == 0:
            writer.writerow(["email", "hashed_password", "role"])
        writer.writerow([email, hashed_password, role])