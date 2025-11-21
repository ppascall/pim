from backend.app.api.v1.main import create_app

# WSGI entrypoint for gunicorn
app = create_app()
