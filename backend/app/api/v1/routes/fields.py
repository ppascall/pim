from flask import Blueprint, request, jsonify
# use absolute imports to avoid "attempted relative import" when executed in different contexts
from backend.app.api.v1.utils.csv_utils import load_fields, save_fields

fields_bp = Blueprint('fields', __name__)

@fields_bp.route('/fields', methods=['GET'])
@fields_bp.route('/api/fields', methods=['GET'])
def get_fields():
    try:
        data = load_fields()
        return jsonify({'fields': data, 'count': len(data)}), 200
    except Exception as e:
        return jsonify({'fields': [], 'error': str(e)}), 500

@fields_bp.route('/update_field', methods=['POST'])
@fields_bp.route('/api/update_field', methods=['POST'])
@fields_bp.route('/add_field', methods=['POST'])
@fields_bp.route('/api/add_field', methods=['POST'])
def update_field():
    payload = request.get_json(silent=True) or {}
    field_name = (payload.get('field_name') or '').strip()
    if not field_name:
        return jsonify({'success': False, 'message': 'field_name required'}), 400

    # load, upsert, save
    fields = load_fields()
    idx = next((i for i, f in enumerate(fields) if (f.get('field_name') or '') == field_name), None)
    # Decide category_type:
    # For new fields default to tag if the caller wants Shopify tag creation (as_tag flag, default True).
    # Existing fields preserve their category_type unless explicitly overridden.
    is_new = idx is None
    as_tag = payload.get('as_tag') if 'as_tag' in payload else True  # default True
    incoming_cat_type = (payload.get('category_type') or '').strip()
    if is_new:
        if incoming_cat_type:
            category_type = incoming_cat_type
        else:
            category_type = 'tag' if as_tag else 'custom_field'
    else:
        # preserve existing unless user specifies
        category_type = incoming_cat_type or (fields[idx].get('category_type') or 'custom_field')

    updated = {
        'field_name': field_name,
        'description': (payload.get('description') or ''),
        'required': (payload.get('required') or 'False'),
        'options': (payload.get('options') or ''),
        'group': (payload.get('group') or ('Tags' if category_type == 'tag' else '')),
        'category_type': category_type,
    }
    if is_new:
        fields.append(updated)
    else:
        fields[idx] = {**fields[idx], **updated}

    save_fields(fields)
    resp = {'success': True, 'field_name': field_name, 'category_type': category_type}
    if is_new and category_type == 'tag':
        resp['shopify_tag_candidate'] = True
    return jsonify(resp), 200

@fields_bp.route('/delete_field', methods=['POST'])
@fields_bp.route('/api/delete_field', methods=['POST'])
def delete_field():
    """Delete a field by name or by index.

    Accepts one of:
      JSON {"field_name": "Color"}
      JSON {"index": 3}
      form field_name / index
      query param ?field_name=Color or ?index=3

    Returns 400 if neither a valid field_name nor index is provided.
    """
    payload = request.get_json(silent=True) or request.form or {}
    field_name = (payload.get('field_name') or request.args.get('field_name') or '').strip()
    index_val = payload.get('index') or request.args.get('index')

    fields_all = load_fields()

    # If field_name not supplied, attempt index-based resolution
    if not field_name and index_val is not None:
        try:
            idx = int(index_val)
            if idx < 0 or idx >= len(fields_all):
                return jsonify({'success': False, 'message': 'index out of range'}), 400
            field_name = (fields_all[idx].get('field_name') or '').strip()
        except Exception:
            return jsonify({'success': False, 'message': 'invalid index'}), 400

    if not field_name:
        return jsonify({'success': False, 'message': 'field_name or index required'}), 400

    before_count = len(fields_all)
    fields_new = [f for f in fields_all if (f.get('field_name') or '') != field_name]
    if len(fields_new) == before_count:
        return jsonify({'success': False, 'message': 'field not found'}), 404
    save_fields(fields_new)
    return jsonify({'success': True, 'deleted': field_name}), 200