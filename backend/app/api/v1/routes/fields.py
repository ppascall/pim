from flask import Blueprint, request, jsonify
from ..utils.csv_utils import load_fields, save_fields, load_products, save_products

fields_bp = Blueprint('fields_bp', __name__)

def normalize_fields(raw_fields):
    out = []
    if not raw_fields:
        return out
    for f in raw_fields:
        if isinstance(f, dict):
            name = (f.get('field_name') or f.get('name') or f.get('label') or '').strip()
            out.append({
                'field_name': name,
                'required': str(f.get('required', 'False')),
                'description': str(f.get('description', '') or ''),
                'options': str(f.get('options', '') or ''),
                'group': str(f.get('group', '') or '')
            })
        else:
            s = str(f).strip()
            out.append({
                'field_name': s,
                'required': 'False',
                'description': '',
                'options': '',
                'group': ''
            })
    return out

@fields_bp.route('/fields', methods=['GET'])
def get_fields():
    fields = load_fields()
    return jsonify({'fields': fields})

@fields_bp.route('/add_field', methods=['POST'])
def add_field():
    data = request.json or request.form or {}
    field_name = (data.get('field_name') or data.get('name') or '').strip()
    if not field_name:
        return jsonify({'success': False, 'message': 'field_name is required'}), 400

    fields = normalize_fields(load_fields() or [])
    if any(f['field_name'].lower() == field_name.lower() for f in fields if f.get('field_name')):
        return jsonify({'success': False, 'message': 'Field already exists'}), 400

    new_field = {
        'field_name': field_name,
        'required': str(data.get('required', 'False')),
        'description': str(data.get('description', '') or ''),
        'options': str(data.get('options', '') or ''),
        'group': str(data.get('group', '') or '')
    }
    fields.append(new_field)
    save_fields(fields)
    return jsonify({'success': True, 'field': new_field})

@fields_bp.route('/update_field', methods=['POST'])
def update_field():
    data = request.json or {}
    index = data.get('index')
    if index is None:
        return jsonify({'success': False, 'message': 'No index provided'}), 400
    fields = load_fields()
    if not (0 <= index < len(fields)):
        return jsonify({'success': False, 'message': 'Invalid index'}), 400

    old_name = fields[index]['field_name']
    new_name = data.get('field_name', old_name)
    updated_desc = data.get('description', fields[index].get('description', ''))
    updated_required = data.get('required', fields[index].get('required', 'False'))
    updated_options = data.get('options', fields[index].get('options', ''))
    updated_group = data.get('group', fields[index].get('group', ''))

    fields[index] = {
        'field_name': new_name,
        'description': updated_desc,
        'required': updated_required,
        'options': updated_options,
        'group': updated_group
    }
    save_fields(fields)

    if old_name != new_name:
        products = load_products()
        for product in products:
            if old_name in product:
                product[new_name] = product.pop(old_name)
        save_products(products)

    return jsonify({'success': True})

@fields_bp.route('/delete_field', methods=['POST'])
def delete_field():
    data = request.json or {}
    index = data.get('index')
    fields = load_fields()
    if index is None or not (0 <= index < len(fields)):
        return jsonify({'success': False, 'message': 'Invalid index'}), 400
    deleted_field = fields[index]['field_name']
    del fields[index]
    save_fields(fields)

    products = load_products()
    for product in products:
        product.pop(deleted_field, None)
    save_products(products)
    return jsonify({'success': True})