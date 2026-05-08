import re
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
import os
import datetime
import threading
from firebase_admin import auth
import firebase_config
from mongodb_config import db
from bson import ObjectId
import pandas as pd
from io import BytesIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'super_secret_cutm_admin_key_123')

# Security Configs
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB limit
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(minutes=15)

# CSRF
csrf = CSRFProtect(app)

# Rate Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri="memory://"
)

# Talisman Security Headers
csp = {
    'default-src': [
        '\'self\'',
        'https://*.firebaseapp.com',
        'https://*.googleapis.com',
        'https://*.gstatic.com',
        'https://connect.facebook.net',
        'https://www.facebook.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net',
        'https://xsgames.co',
        'https://upload.wikimedia.org',
        'https://img.youtube.com',
        'https://www.youtube.com',
        'https://via.placeholder.com'
    ],
    'script-src': [
        '\'self\'',
        '\'unsafe-inline\'',
        '\'unsafe-eval\'',
        'https://www.gstatic.com',
        'https://connect.facebook.net',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://www.google.com/recaptcha/',
        'https://www.gstatic.com/recaptcha/',
        'https://apis.google.com',
        'https://code.jquery.com',
        'https://cdn.datatables.net'
    ],
    'style-src': [
        '\'self\'',
        '\'unsafe-inline\'',
        'https://fonts.googleapis.com',
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net',
        'https://cdn.datatables.net'
    ],
    'img-src': [
        '\'self\'',
        'data:',
        'https://xsgames.co',
        'https://randomuser.me',
        'https://upload.wikimedia.org',
        'https://img.youtube.com',
        'https://via.placeholder.com',
        'https://www.facebook.com'
    ],
    'frame-src': [
        '\'self\'',
        'https://www.youtube.com',
        'https://*.firebaseapp.com',
        'https://www.google.com/recaptcha/',
        'https://recaptcha.google.com/recaptcha/'
    ]
}

talisman = Talisman(app, content_security_policy=csp, force_https=False)
# We no longer need hardcoded dummy credentials for admin

@app.route('/')
def index():
    """Renders the main registration form."""
    return render_template('index.html')

@app.route('/robots.txt')
def robots():
    return send_file('public/robots.txt')

@app.route('/sitemap.xml')
def sitemap():
    return send_file('public/sitemap.xml')

@app.route('/banner.jpg')
def banner():
    return send_file('public/banner.jpg')

@app.route('/btech-admission')
def btech_admission():
    """Renders the B.Tech Admission landing page."""
    return render_template('btech_admission.html')

@app.route('/api/register', methods=['POST'])
@limiter.limit("5 per minute")
def register_student():
    """Endpoint to save student details to MongoDB."""
    if db is None:
        return jsonify({'success': False, 'message': 'Database not configured. Please add MONGO_URI.'}), 500

    try:
        data = request.json
        # Basic validation for all mandatory fields
        required_fields = ['name', 'mobile', 'gender', 'district', 'class_level', 'course']
        for field in required_fields:
            val = data.get(field)
            if not val or not isinstance(val, str) or len(val) > 150:
                return jsonify({'success': False, 'message': f'Invalid input for {field.replace("_", " ")}.'}), 400
        
        if len(data.get('mobile', '')) != 10 or not data['mobile'].isdigit():
             return jsonify({'success': False, 'message': 'Mobile number must be 10 digits.'}), 400

        student_data = {
            'name': data.get('name'),
            'mobile': data.get('mobile'),
            'district': data.get('district'),
            'class': data.get('class_level'),
            'course': data.get('course'),
            'gender': data.get('gender', 'Not Specified'),
            'status': 'pending',
            'created_at': datetime.datetime.now(datetime.timezone.utc)
        }

        # Run the database save in a background thread for fast response
        def save_to_db(data_to_save):
            try:
                db.students.insert_one(data_to_save)
            except Exception as e:
                print(f"Error saving to database in background: {e}")

        threading.Thread(target=save_to_db, args=(student_data,)).start()
        
        return jsonify({'success': True, 'message': 'Registration successful!'})
    except Exception as e:
        print(f"Error processing registration request: {e}")
        return jsonify({'success': False, 'message': f'Server error: {e}'}), 500

@app.route('/admin')
def admin_redirect():
    return redirect(url_for('admin_login'))

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Admin Authentication Route Handling Firebase ID Token via AJAX"""
    if 'admin_uid' in session:
        if request.method == 'GET':
            return redirect(url_for('admin_dashboard'))
        else:
            return jsonify({'success': True, 'redirect': url_for('admin_dashboard')})

    if request.method == 'POST':
        data = request.get_json()
        id_token = data.get('id_token') if data else None

        if not id_token:
            return jsonify({'success': False, 'message': 'Missing ID token.'}), 400

        try:
            # Verify the Firebase auth token using the Admin SDK
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            
            # Check if the user is the authorized admin
            if uid != 'JrozyvgjyxVtBL2dqbPQAXUYRnv1':
                 return jsonify({'success': False, 'message': 'Unauthorized access: You do not have admin privileges.'}), 403
            
            # Start secure flask session
            session.permanent = True
            session['admin_uid'] = uid
            return jsonify({'success': True, 'redirect': url_for('admin_dashboard')})
        except Exception as e:
            print(f"Auth error: {e}")
            return jsonify({'success': False, 'message': 'Authentication failed or token invalid.'}), 401
            
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_uid', None)
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
def admin_dashboard():
    """Protected Dashboard Route"""
    if 'admin_uid' not in session:
        return redirect(url_for('admin_login'))
    return render_template('dashboard.html')

@app.route('/api/leads', methods=['GET'])
def get_leads():
    """API endpoint to fetch all students data for the dashboard."""
    if 'admin_uid' not in session:
         return jsonify({'success': False, 'message': 'Unauthorized'}), 401
         
    if db is None:
        return jsonify({'success': False, 'message': 'Database disconnected.'}), 500

    try:
        # Sort by created_at descending
        cursor = db.students.find().sort('created_at', -1)
        
        leads = []
        for student in cursor:
            student['id'] = str(student['_id'])
            del student['_id']
            student['status'] = student.get('status', 'pending')
            # Format datetime safely
            if 'created_at' in student and student['created_at']:
                 try:
                    student['created_at_fmt'] = student['created_at'].strftime("%Y-%m-%d %H:%M")
                 except:
                     student['created_at_fmt'] = str(student['created_at'])
                 
                 del student['created_at'] # Prevent JSON serialization error
            else:
                 student['created_at_fmt'] = 'Unknown'
            
            # Cleanup updated_at preventing json serialization error
            if 'updated_at' in student:
                 del student['updated_at']

            leads.append(student)
            
        return jsonify({'success': True, 'data': leads})
    except Exception as e:
         return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/leads/<lead_id>/status', methods=['PUT'])
def update_lead_status(lead_id):
    """Update student lead status."""
    if 'admin_uid' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        data = request.json
        new_status = data.get('status')
        valid_statuses = ['confirm', 'ready for campus', 'not ready', 'pending']
        
        if new_status not in valid_statuses:
            return jsonify({'success': False, 'message': 'Invalid status'}), 400
            
        db.students.update_one(
            {'_id': ObjectId(lead_id)},
            {'$set': {'status': new_status}}
        )
        return jsonify({'success': True, 'message': 'Status updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/leads/<lead_id>', methods=['DELETE'])
def delete_lead(lead_id):
    """Delete a student lead."""
    if 'admin_uid' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    try:
        db.students.delete_one({'_id': ObjectId(lead_id)})
        return jsonify({'success': True, 'message': 'Lead deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/leads/<lead_id>', methods=['PUT'])
def update_lead(lead_id):
    """Update a student lead."""
    if 'admin_uid' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    try:
        data = request.json
        # Server-side validation
        required_fields = ['name', 'mobile', 'gender', 'district', 'class', 'course', 'status']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field.capitalize()} is required.'}), 400

        student_data = {
            'name': data.get('name'),
            'mobile': data.get('mobile'),
            'gender': data.get('gender'),
            'district': data.get('district'),
            'class': data.get('class'),
            'course': data.get('course'),
            'status': data.get('status'),
            'updated_at': datetime.datetime.now(datetime.timezone.utc)
        }
        db.students.update_one(
            {'_id': ObjectId(lead_id)},
            {'$set': student_data}
        )
        return jsonify({'success': True, 'message': 'Lead updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/leads', methods=['POST'])
def add_lead():
    """Manually add a student lead from admin panel."""
    if 'admin_uid' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    try:
        data = request.json
        # Server-side validation
        required_fields = ['name', 'mobile', 'gender', 'district', 'class', 'course']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field.capitalize()} is required.'}), 400

        student_data = {
            'name': data.get('name'),
            'mobile': data.get('mobile'),
            'district': data.get('district'),
            'gender': data.get('gender', 'Not Specified'),
            'class': data.get('class'),
            'course': data.get('course'),
            'status': data.get('status', 'pending'),
            'created_at': datetime.datetime.now(datetime.timezone.utc)
        }
        db.students.insert_one(student_data)
        return jsonify({'success': True, 'message': 'Lead added successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/export', methods=['GET'])
def export_leads():
     """Export leads data to CSV."""
     if 'admin_uid' not in session:
         return redirect(url_for('admin_login'))
         
     if db is None:
         return "Database not configured", 500

     try:
         cursor = db.students.find().sort('created_at', -1)
         
         data = []
         for student in cursor:
             # Standardize datetime
             if 'created_at' in student and student['created_at']:
                  try:
                     student['created_at'] = student['created_at'].strftime("%Y-%m-%d %H:%M:%S")
                  except:
                     pass
             # ensure order
             row = {
                 'Name': student.get('name', ''),
                 'Mobile': student.get('mobile', ''),
                 'District': student.get('district', ''),
                 'Class': student.get('class', ''),
                 'Course': student.get('course', ''),
                 'Status': student.get('status', 'pending'),
                 'Registration Date': student.get('created_at', '')
             }
             data.append(row)
             
         df = pd.DataFrame(data)
         
         # Write to bytes buffer
         output = BytesIO()
         # use to_csv to string and encode into BytesIO
         output.write(df.to_csv(index=False).encode('utf-8'))
         output.seek(0)
         
         return send_file(
             output,
             mimetype='text/csv',
             as_attachment=True,
             download_name=f'cutm_leads_{datetime.datetime.now().strftime("%Y%m%d")}.csv'
         )
     except Exception as e:
         return str(e), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
