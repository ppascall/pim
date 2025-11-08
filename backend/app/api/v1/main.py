import os
import sys
from dotenv import load_dotenv
from flask import Flask

# load .env early so services and routes see SHOP/TOKEN and other vars
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.abspath(os.path.join(BASE_DIR, '..', '..', '..', '..', '.env'))
load_dotenv(_env_path)

def create_app():
    app = Flask(__name__)
    # CORS registration kept in original env if needed
    from flask_cors import CORS
    CORS(app)

    # Import blueprints: prefer package-relative imports but fall back to absolute
    try:
        # works when module is imported as a package
        from .routes.fields import fields_bp
        from .routes.products import products_bp
    except Exception:
        # fallback when running the file directly (python main.py)
        # ensure project root is on sys.path so "backend" package can be imported
        project_root = os.path.abspath(os.path.join(BASE_DIR, '..', '..', '..', '..'))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        try:
            # try absolute package import now that project root is on sys.path
            from backend.app.api.v1.routes.fields import fields_bp
            from backend.app.api.v1.routes.products import products_bp
        except Exception:
            # final fallback: import modules directly from file paths
            import importlib.util
            fields_path = os.path.join(BASE_DIR, 'routes', 'fields.py')
            products_path = os.path.join(BASE_DIR, 'routes', 'products.py')
            spec_f = importlib.util.spec_from_file_location('fields_mod', fields_path)
            fields_mod = importlib.util.module_from_spec(spec_f)
            spec_f.loader.exec_module(fields_mod)

            spec_p = importlib.util.spec_from_file_location('products_mod', products_path)
            products_mod = importlib.util.module_from_spec(spec_p)
            spec_p.loader.exec_module(products_mod)

            fields_bp = getattr(fields_mod, 'fields_bp')
            products_bp = getattr(products_mod, 'products_bp')

    # register blueprints (keep prefix '' to preserve existing routes)
    app.register_blueprint(fields_bp, url_prefix='')
    app.register_blueprint(products_bp, url_prefix='')

    # simple health endpoint
    @app.route('/health', methods=['GET'])
    def health():
        return {'status': 'ok'}

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)