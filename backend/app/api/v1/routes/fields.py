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
def update_field():
    payload = request.get_json(silent=True) or {}
    field_name = (payload.get('field_name') or '').strip()
    if not field_name:
        return jsonify({'success': False, 'message': 'field_name required'}), 400

    # load, upsert, save
    fields = load_fields()
    idx = next((i for i, f in enumerate(fields) if (f.get('field_name') or '') == field_name), None)
    updated = {
        'field_name': field_name,
        'description': (payload.get('description') or ''),
        'required': (payload.get('required') or 'False'),
        'options': (payload.get('options') or ''),
        'group': (payload.get('group') or ''),
        'category_type': (payload.get('category_type') or 'custom_field'),
    }
    if idx is None:
        fields.append(updated)
    else:
        fields[idx] = {**fields[idx], **updated}

    save_fields(fields)
    return jsonify({'success': True}), 200

@fields_bp.route('/delete_field', methods=['POST'])
@fields_bp.route('/api/delete_field', methods=['POST'])
def delete_field():
    payload = request.get_json(silent=True) or {}
    field_name = (payload.get('field_name') or '').strip()
    if not field_name:
        return jsonify({'success': False, 'message': 'field_name required'}), 400

    fields = [f for f in load_fields() if (f.get('field_name') or '') != field_name]
    save_fields(fields)
    return jsonify({'success': True}), 200