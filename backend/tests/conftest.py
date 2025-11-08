import os
import csv
import pytest

from backend.app.api.v1.main import create_app


@pytest.fixture(scope="session")
def test_data_dir(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("pim_data")
    # categories.csv minimal headers used by csv_utils
    categories_csv = tmp / "categories.csv"
    with categories_csv.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["category_type", "value", "description", "required", "options", "group"])
        writer.writerow(["custom_field", "Color", "Product color", "False", "red|green|blue", "General"])
        writer.writerow(["custom_field", "Size", "Product size", "False", "S|M|L", "General"])

    # products.csv minimal headers used across endpoints
    products_csv = tmp / "products.csv"
    with products_csv.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "handle",
                "title",
                "vendor",
                "product_type",
                "tags",
                "status",
                "id",
                "sku_primary",
                "Product number",
                "category",
            ],
        )
        writer.writeheader()
        writer.writerow({
            "handle": "test-bottle",
            "title": "Test Bottle",
            "vendor": "Acme",
            "product_type": "Bottle",
            "tags": "drink,water",
            "status": "active",
            "id": "",
            "sku_primary": "TB-001",
            "Product number": "TB-001",
            "category": "Bottle",
        })

    return tmp


@pytest.fixture(autouse=True)
def _env_isolated(monkeypatch, test_data_dir):
    # ensure we don't touch real project CSVs
    monkeypatch.setenv("PIM_DATA_DIR", str(test_data_dir))
    # ensure Shopify creds absent unless explicitly provided in env
    for key in [
        "SHOP",
        "TOKEN",
        "SHOPIFY_STORE",
        "SHOPIFY_API_KEY",
        "SHOPIFY_API_PASSWORD",
        "SHOPIFY_ACCESS_TOKEN",
        "SHOPIFY_SHOP",
        "SHOP_DOMAIN",
        "SHOP_URL",
    ]:
        if key in os.environ:
            monkeypatch.delenv(key, raising=False)
    yield


@pytest.fixture()
def app():
    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture()
def client(app):
    return app.test_client()
