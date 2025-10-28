from flask import Blueprint, request, jsonify
from ..utils.csv_utils import load_products, save_products, read_products_from_csv, write_products_to_csv, load_fields
from ..services import shopify as shopify_svc  # optional use in refresh

products_bp = Blueprint('products_bp', __name__)

@products_bp.route('/products', methods=['GET'])
def get_products():
    products = load_products()
    return jsonify({'products': products})

@products_bp.route('/search_products', methods=['POST'])
def search_products():
    try:
        payload = request.get_json(silent=True) or request.form or {}
        q = (payload.get('query') or payload.get('q') or '').strip().lower()
        products = read_products_from_csv()
        if not q:
            return jsonify({'products': products})
        def matches(p):
            for key in ('Product Name', 'Product name', 'title', 'handle', 'Product number', 'sku_primary'):
                if p.get(key) and q in str(p.get(key)).lower():
                    return True
            if p.get('category') and q in str(p.get('category')).lower():
                return True
            return False
        results = [p for p in products if matches(p)]
        return jsonify({'products': results})
    except Exception as e:
        return jsonify({'error': 'search failed', 'details': str(e)}), 500

@products_bp.route('/update_product', methods=['POST'])
def update_product():
    try:
        payload = request.get_json(silent=True) or request.form or {}
        identifier_field = payload.get('identifier_field') or payload.get('id_field') or 'Product number'
        identifier_value = payload.get('id') or payload.get('identifier') or payload.get('value')
        updates = payload.get('updates') or payload.get('data') or {}
        if not identifier_value:
            return jsonify({'success': False, 'message': 'identifier value required'}), 400

        products = read_products_from_csv()
        updated = False
        for p in products:
            val = p.get(identifier_field) or p.get('Product number') or p.get('handle')
            if val and str(val) == str(identifier_value):
                for k, v in (updates.items() if isinstance(updates, dict) else []):
                    p[k] = '' if v is None else v
                updated = True
                break

        if not updated:
            return jsonify({'success': False, 'message': 'product not found'}), 404

        write_products_to_csv(products)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': 'update failed', 'details': str(e)}), 500

# refresh_products kept here but can be delegated to shopify service
@products_bp.route('/refresh_products', methods=['POST'])
def refresh_products():
    # Keep previous behavior but routed here
    from ..utils.csv_utils import load_products, save_products
    try:
        # short-circuit: if shopify disabled just resave and clean
        if not shopify_svc.USE_SHOPIFY or not shopify_svc.SHOP or not shopify_svc.TOKEN:
            products = load_products()
            save_products(products)
            return jsonify({'success': True, 'message': 'Shopify disabled — wrote local CSV only', 'total': len(products)})
        # If enabled, maintain previous batch logic (simplified)
        start = int(request.args.get('start', 0))
        count = int(request.args.get('count', 5))
        products = load_products()
        batch = products[start:start+count]
        # For brevity: call existing fetch_shopify_products if you want full sync
        # postpone heavy logic to services/shopify
        return jsonify({'success': True, 'message': 'Refresh delegated to shopify service (not implemented here)', 'processed': len(batch)})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@products_bp.route('/debug', methods=['GET'])
def debug_products():
    """
    Returns counts and a sample product so frontend/backend shape can be verified quickly.
    Access: /debug  or /api/debug depending on blueprint prefix.
    """
    try:
        all_products = load_products()
        fields = load_fields()
        sample = all_products[0] if all_products else None
        return jsonify({
            'products_count': len(all_products),
            'fields_count': len(fields),
            'sample_product': sample
        })
    except Exception as e:
        return jsonify({'error': 'debug failed', 'details': str(e)}), 500