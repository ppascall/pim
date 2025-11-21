import csv
import os


def _user_csv_path():
    data_dir = os.environ.get("PIM_DATA_DIR")
    if data_dir:
        return os.path.join(data_dir, "users.csv")
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.csv")


USER_CSV = _user_csv_path()

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
    os.makedirs(os.path.dirname(USER_CSV), exist_ok=True)
    file_exists = os.path.isfile(USER_CSV)
    with open(USER_CSV, "a", newline='') as csvfile:
        writer = csv.writer(csvfile)
        # Write header if file is empty
        if not file_exists or os.stat(USER_CSV).st_size == 0:
            writer.writerow(["email", "hashed_password", "role"])
        writer.writerow([email, hashed_password, role])