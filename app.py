from flask import Flask, request, jsonify, render_template, session, redirect, url_for, send_from_directory
from flask_cors import CORS
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import json
import openai
from dotenv import load_dotenv
import time
from werkzeug.security import generate_password_hash, check_password_hash # CORRECTED: Use stronger hashing
from werkzeug.utils import secure_filename
import random
import string

# Configure OpenAI
# It's recommended to use environment variables in production
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = Flask(__name__, static_folder='static')
app.secret_key = 'your-secret-key-here'
CORS(app)

# File upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'questions'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'answers'), exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_file(file, folder):
    """Save uploaded file and return the filename"""
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to make filename unique
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{timestamp}{ext}"
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], folder, unique_filename)
        file.save(file_path)
        return unique_filename
    return None

# ============================================================================
# DATABASE SETUP (SQLAlchemy)
# ============================================================================
DATABASE_URL = "sqlite:///./ai_education.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============================================================================
# DATABASE MODELS
# ============================================================================
class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    grade = Column(String, nullable=True)
    points = Column(Integer, default=0)
    doubts_asked = Column(Integer, default=0)  # Counter for doubts asked
    qna_sessions = Column(Integer, default=0)  # Counter for QnA sessions
    level = Column(String, default='Beginner')
    subject = Column(String, nullable=True)
    experience = Column(Integer, default=0)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LearningTopic(Base):
    __tablename__ = "learning_topics"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("profiles.id"))
    topic = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    video_url = Column(String, nullable=True)
    video_title = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    points_earned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Doubt(Base):
    __tablename__ = "doubts"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("profiles.id"))
    topic = Column(String, nullable=False)
    question = Column(Text, nullable=False)
    question_image = Column(String, nullable=True)  # Path to uploaded question image
    status = Column(String, default='pending')  # pending, answered, resolved
    teacher_id = Column(Integer, ForeignKey("profiles.id"), nullable=True)
    answer = Column(Text, nullable=True)
    answer_image = Column(String, nullable=True)  # Path to uploaded answer image
    answered_at = Column(DateTime, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5 stars
    upvoted = Column(Boolean, default=False)
    downvoted = Column(Boolean, default=False)
    student_comment = Column(Text, nullable=True)
    teacher_reply = Column(Text, nullable=True)
    final_rating = Column(Integer, nullable=True)
    final_upvoted = Column(Boolean, default=False)
    points_awarded = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class QnASession(Base):
    __tablename__ = "qna_sessions"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("profiles.id"))
    topic = Column(String, nullable=False)
    difficulty = Column(String, default='medium')
    correct_answers = Column(Integer, default=0)
    points_earned = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PointsTransaction(Base):
    __tablename__ = "points_transactions"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("profiles.id"))
    amount = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RewardCode(Base):
    __tablename__ = "reward_codes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    code = Column(String, unique=True, nullable=False)
    reward_type = Column(String, nullable=False) # e.g., 'Amazon', 'Gift Shop'
    points_spent = Column(Integer, nullable=False, default=50)
    redeemed_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# ============================================================================
# DATABASE HELPER FUNCTIONS
# ============================================================================
def get_user_by_id(user_id):
    db = SessionLocal()
    user = db.query(Profile).filter(Profile.id == user_id).first()
    db.close()
    return user

def award_points(user_id, points, reason):
    """Award points to a user for completing activities"""
    try:
        db = SessionLocal()
        user = db.query(Profile).filter(Profile.id == user_id).first()
        if user:
            user.points = (user.points or 0) + points
            db.commit()
            db.close()
            return True
        db.close()
        return False
    except Exception as e:
        print(f"Error awarding points: {str(e)}")
        if 'db' in locals():
            db.close()
        return False

def generate_fallback_questions(topic, difficulty):
    """Generate fallback questions if OpenAI fails"""
    fallback_questions = [
        {
            "question": f"What is the basic concept of {topic}?",
            "options": ["A fundamental principle", "A complex theory", "An advanced technique", "A simple method"],
            "correct_answer": 0,
            "explanation": f"This covers the basic concept of {topic}."
        },
        {
            "question": f"Which of the following is related to {topic}?",
            "options": ["Basic understanding", "Advanced application", "Complex analysis", "All of the above"],
            "correct_answer": 3,
            "explanation": f"All these aspects are related to {topic}."
        },
        {
            "question": f"How would you describe {topic} in simple terms?",
            "options": ["A complex system", "A basic framework", "An advanced methodology", "A simple approach"],
            "correct_answer": 1,
            "explanation": f"{topic} can be understood as a basic framework for learning."
        },
        {
            "question": f"What is the primary purpose of studying {topic}?",
            "options": ["To memorize facts", "To understand concepts", "To pass exams", "To impress others"],
            "correct_answer": 1,
            "explanation": f"The main goal is to understand the underlying concepts of {topic}."
        },
        {
            "question": f"Which approach is best for learning {topic}?",
            "options": ["Rote memorization", "Active engagement", "Passive reading", "Avoiding practice"],
            "correct_answer": 1,
            "explanation": f"Active engagement is the most effective way to learn {topic}."
        }
    ]
    return fallback_questions

# ============================================================================
# TEMPLATE RENDERING ROUTES
# ============================================================================
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/auth')
def auth():
    return render_template('auth.html')

@app.route('/demo')
def demo():
    return render_template('demo.html')

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    return render_template('profile.html')

@app.route('/student-dashboard')
def student_dashboard():
    # A simple check to redirect if not logged in
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    return render_template('student-dashboard.html')

@app.route('/teacher-dashboard')
def teacher_dashboard():
    # A simple check to redirect if not logged in
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    if session.get('user_role') != 'teacher':
        return redirect(url_for('student_dashboard'))
    return render_template('teacher-dashboard.html')

@app.route('/dobby')
def dobby():
    # A simple check to redirect if not logged in
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    return render_template('dobby.html')

@app.route('/qna-quiz')
def qna_quiz():
    # A simple check to redirect if not logged in
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    return render_template('qna-quiz.html')

@app.route('/api/dobby/chat', methods=['POST'])
def dobby_chat():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'success': False, 'error': 'Message is required'}), 400
        
        # Create a context-aware prompt for educational assistance
        system_prompt = """You are Dobby, a friendly and knowledgeable AI educational assistant. Your role is to:
        1. Help students understand complex concepts clearly
        2. Provide step-by-step explanations
        3. Give examples when helpful
        4. Be encouraging and supportive
        5. Ask clarifying questions if needed
        6. Use simple language appropriate for students
        
        Always be helpful, patient, and educational in your responses."""
        
        # Create the conversation for OpenAI
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Award points for using Dobby (educational activity)
        user_id = session['user_id']
        award_points(user_id, 2, "Used Dobby AI Assistant")
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'points_earned': 2
        })
        
    except Exception as e:
        print(f"Error in Dobby chat: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'error': f'Error: {str(e)}'
        }), 500
    
    # Add these two routes in app.py

@app.route('/redeem')
def redeem():
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    return render_template('redeem.html')

@app.route('/api/redeem-points', methods=['POST'])
def redeem_points():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    reward_type = data.get('reward_type')
    if not reward_type:
        return jsonify({'success': False, 'error': 'Reward type is required'}), 400

    db = SessionLocal()
    try:
        user = db.query(Profile).filter(Profile.id == session['user_id']).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        if user.points < 50:
            return jsonify({'success': False, 'error': 'Not enough points to redeem.'}), 403

        # Deduct points
        user.points -= 50
        
        # Generate a unique random code
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
            if not db.query(RewardCode).filter_by(code=code).first():
                break # Code is unique

        # Save the new reward code
        new_code = RewardCode(
            user_id=user.id,
            code=code,
            reward_type=reward_type,
            points_spent=50
        )
        db.add(new_code)
        db.commit()

        return jsonify({
            'success': True, 
            'message': 'Points redeemed successfully!',
            'new_points_total': user.points,
            'reward_code': code
        })
    except Exception as e:
        db.rollback()
        print(f"Error redeeming points: {e}")
        return jsonify({'success': False, 'error': 'An internal error occurred.'}), 500
    finally:
        db.close()

# ============================================================================
# AUTHENTICATION API
# ============================================================================
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    db = SessionLocal()
    try:
        if db.query(Profile).filter(Profile.email == data['email']).first():
            db.close()
            return jsonify({'success': False, 'error': 'Email already exists'}), 400
        
        # CORRECTED: Use werkzeug to securely hash the password
        hashed_password = generate_password_hash(data['password'])
        
        new_user = Profile(
            email=data['email'],
            name=data['name'],
            password_hash=hashed_password, # Save the properly hashed password
            role=data['role']
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return jsonify({'success': True, 'message': 'User created successfully'})
    finally:
        db.close()


@app.route('/api/signin', methods=['POST'])
def signin():
    data = request.get_json()
    db = SessionLocal()
    try:
        user = db.query(Profile).filter(Profile.email == data['email']).first()
        # CORRECTED: Use werkzeug to check the password against the stored hash
        if user and check_password_hash(user.password_hash, data['password']):
            session['user_id'] = user.id
            session['user_role'] = user.role
            return jsonify({'success': True, 'role': user.role})
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    finally:
        db.close()

@app.route('/api/logout')
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/user/profile')
def get_profile():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    user = get_user_by_id(session['user_id'])
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    return jsonify({
        'success': True,
        'user': {
            'id': user.id, 'name': user.name, 'email': user.email,
            'role': user.role, 'points': user.points,
            'doubts_asked': user.doubts_asked or 0,
            'qna_sessions': user.qna_sessions or 0
        }
    })

# ============================================================================
# STUDENT DASHBOARD API ENDPOINTS
# ============================================================================

@app.route('/api/learning-topics', methods=['GET', 'POST'])
def learning_topics():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    db = SessionLocal()
    try:
        if request.method == 'GET':
            topics = db.query(LearningTopic).filter(LearningTopic.student_id == session['user_id']).all()
            return jsonify({'success': True, 'topics': [{'id': t.id, 'topic': t.topic, 'description': t.description, 'completed': t.completed, 'points_earned': t.points_earned, 'created_at': t.created_at.isoformat()} for t in topics]})

        if request.method == 'POST':
            data = request.get_json()
            new_topic = LearningTopic(student_id=session['user_id'], topic=data['topic'], description=data.get('description'))
            db.add(new_topic)
            db.commit()
            return jsonify({'success': True, 'message': 'Topic added'})
    finally:
        db.close()

@app.route('/api/doubts', methods=['GET', 'POST'])
def handle_doubts():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    db = SessionLocal()
    try:
        if request.method == 'GET':
            doubts = db.query(Doubt).filter(Doubt.student_id == session['user_id']).all()
            return jsonify({'success': True, 'doubts': [{
                'id': d.id,
                'topic': d.topic, 
                'question': d.question, 
                'question_image': d.question_image,
                'status': d.status, 
                'answer': d.answer, 
                'answer_image': d.answer_image,
                'answered_at': d.answered_at.isoformat() if d.answered_at else None,
                'rating': d.rating,
                'upvoted': d.upvoted,
                'downvoted': d.downvoted,
                'student_comment': d.student_comment,
                'teacher_reply': d.teacher_reply,
                'final_rating': d.final_rating,
                'final_upvoted': d.final_upvoted,
                'points_awarded': d.points_awarded,
                'created_at': d.created_at.isoformat()
            } for d in doubts]})

        if request.method == 'POST':
            topic = request.form.get('topic', '').strip()
            question = request.form.get('question', '').strip()
            question_image = request.files.get('question_image')
            
            if not topic or not question:
                return jsonify({'success': False, 'error': 'Topic and question are required'}), 400
            
            question_image_filename = None
            if question_image:
                question_image_filename = save_uploaded_file(question_image, 'questions')
            
            new_doubt = Doubt(
                student_id=session['user_id'], 
                topic=topic, 
                question=question,
                question_image=question_image_filename
            )
            
            student = db.query(Profile).filter(Profile.id == session['user_id']).first()
            if student:
                student.doubts_asked = (student.doubts_asked or 0) + 1
            
            db.add(new_doubt)
            db.commit()
            return jsonify({'success': True, 'message': 'Doubt submitted'})
    finally:
        db.close()

@app.route('/api/doubtbot/chat', methods=['POST'])
def doubtbot_chat():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    user_message = data.get('message', '')
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are Dobby, a friendly and helpful AI learning assistant."},
                {"role": "user", "content": user_message}
            ]
        )
        ai_response = response.choices[0].message.content
        return jsonify({'success': True, 'response': ai_response})
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return jsonify({'success': False, 'error': 'AI assistant is currently unavailable.'}), 503

@app.route('/api/qna/start', methods=['POST'])
def start_qna():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.get_json()
        topic = data.get('topic', '').strip()
        difficulty = data.get('difficulty', 'medium').strip().lower()
        
        if not topic:
            return jsonify({'success': False, 'error': 'Topic is required'}), 400
        
        if difficulty not in ['easy', 'medium', 'hard']:
            difficulty = 'medium'
        
        questions = generate_simple_questions(topic, difficulty)
        
        db = SessionLocal()
        try:
            student = db.query(Profile).filter(Profile.id == session['user_id']).first()
            if student:
                student.qna_sessions = (student.qna_sessions or 0) + 1
                db.commit()
        finally:
            db.close()
        
        session_id = f"quiz_{int(time.time())}_{session['user_id']}"
        
        return jsonify({
            'success': True,
            'questions': questions,
            'session_id': session_id,
            'difficulty': difficulty
        })
        
    except Exception as e:
        print(f"Error starting QnA: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

def generate_simple_questions(topic, difficulty):
    """Generate simple questions without OpenAI API"""
    base_questions = [
        {
            "question": f"What is the basic concept of {topic}?",
            "options": ["A fundamental principle", "A complex theory", "An advanced technique", "A simple method"],
            "correct_answer": 0,
            "explanation": f"This covers the basic concept of {topic}."
        },
        {
            "question": f"Which of the following is related to {topic}?",
            "options": ["Basic understanding", "Advanced application", "Complex analysis", "All of the above"],
            "correct_answer": 3,
            "explanation": f"All these aspects are related to {topic}."
        },
        {
            "question": f"How would you describe {topic} in simple terms?",
            "options": ["A complex system", "A basic framework", "An advanced methodology", "A simple approach"],
            "correct_answer": 1,
            "explanation": f"{topic} can be understood as a basic framework for learning."
        },
        {
            "question": f"What is the primary purpose of studying {topic}?",
            "options": ["To memorize facts", "To understand concepts", "To pass exams", "To impress others"],
            "correct_answer": 1,
            "explanation": f"The main goal is to understand the underlying concepts of {topic}."
        },
        {
            "question": f"Which approach is best for learning {topic}?",
            "options": ["Rote memorization", "Active engagement", "Passive reading", "Avoiding practice"],
            "correct_answer": 1,
            "explanation": f"Active engagement is the most effective way to learn {topic}."
        }
    ]
    
    if difficulty == 'medium':
        for q in base_questions:
            q['question'] = q['question'].replace('basic', 'intermediate').replace('simple', 'moderate')
    elif difficulty == 'hard':
        for q in base_questions:
            q['question'] = q['question'].replace('basic', 'advanced').replace('simple', 'complex')
    return base_questions

@app.route('/api/qna/submit', methods=['POST'])
def submit_qna_answers():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.get_json()
        session_id = data.get('session_id')
        answers = data.get('answers', {})
        
        if not session_id or not answers:
            return jsonify({'success': False, 'error': 'Session ID and answers are required'}), 400
        
        topic = "General Topic"
        difficulty = "medium"
        questions = generate_simple_questions(topic, difficulty)
        
        correct_answers = 0
        total_questions = len(questions)
        results = []
        points_earned = 0
        
        for i, question in enumerate(questions):
            user_answer = answers.get(str(i), -1)
            correct_answer = question.get('correct_answer', 0)
            is_correct = user_answer == correct_answer
            
            if is_correct:
                correct_answers += 1
                points_earned += 10
            
            explanation = question.get('explanation', 'No explanation available')
            
            results.append({
                'question': question['question'],
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'explanation': explanation,
                'options': question['options']
            })
        
        if points_earned > 0:
            award_points(session['user_id'], points_earned, f"QnA Session: {topic} ({difficulty})")
        
        return jsonify({
            'success': True,
            'results': results,
            'score': correct_answers,
            'total_questions': total_questions,
            'percentage': round((correct_answers / total_questions) * 100, 1),
            'points_earned': points_earned,
            'difficulty': difficulty
        })
        
    except Exception as e:
        print(f"Error submitting QnA answers: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/points/transactions', methods=['GET'])
def get_points_history():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    db = SessionLocal()
    try:
        transactions = db.query(PointsTransaction).filter(PointsTransaction.student_id == session['user_id']).order_by(PointsTransaction.created_at.desc()).all()
        
        formatted_transactions = []
        for t in transactions:
            formatted_transactions.append({
                'reason': t.reason,
                'amount': t.amount,
                'created_at': t.created_at.isoformat(),
                'type': 'earned' if t.amount > 0 else 'spent',
                'icon': get_points_icon(t.reason)
            })
        
        return jsonify({'success': True, 'transactions': formatted_transactions})
    finally:
        db.close()

# ============================================================================
# FILE UPLOAD ROUTES
# ============================================================================
@app.route('/uploads/<folder>/<filename>')
def uploaded_file(folder, filename):
    """Serve uploaded files"""
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], folder), filename)

# ============================================================================
# TEACHER DOUBT MANAGEMENT API
# ============================================================================
@app.route('/api/teacher/doubts', methods=['GET'])
def get_teacher_doubts():
    """Get all doubts for teachers to answer"""
    if 'user_id' not in session or session.get('user_role') != 'teacher':
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    db = SessionLocal()
    try:
        doubts = db.query(Doubt).filter(Doubt.status.in_(['pending', 'answered', 'resolved'])).order_by(Doubt.created_at.desc()).all()
        
        formatted_doubts = []
        for doubt in doubts:
            student = db.query(Profile).filter(Profile.id == doubt.student_id).first()
            formatted_doubts.append({
                'id': doubt.id,
                'topic': doubt.topic,
                'question': doubt.question,
                'question_image': doubt.question_image,
                'status': doubt.status,
                'created_at': doubt.created_at.isoformat(),
                'student_name': student.name if student else 'Unknown',
                'answer': doubt.answer,
                'answer_image': doubt.answer_image,
                'answered_at': doubt.answered_at.isoformat() if doubt.answered_at else None,
                'rating': doubt.rating,
                'upvoted': doubt.upvoted,
                'downvoted': doubt.downvoted,
                'student_comment': doubt.student_comment,
                'teacher_reply': doubt.teacher_reply,
                'final_rating': doubt.final_rating,
                'final_upvoted': doubt.final_upvoted,
                'points_awarded': doubt.points_awarded
            })
        
        return jsonify({'success': True, 'doubts': formatted_doubts})
    finally:
        db.close()

@app.route('/api/teacher/answer-doubt', methods=['POST'])
def answer_doubt():
    """Teacher answers a doubt"""
    if 'user_id' not in session or session.get('user_role') != 'teacher':
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    db = SessionLocal()
    try:
        if request.content_type and 'multipart/form-data' in request.content_type:
            doubt_id = request.form.get('doubt_id')
            answer = request.form.get('answer', '').strip()
            answer_image = request.files.get('answer_image')
        else:
            data = request.get_json()
            doubt_id = data.get('doubt_id')
            answer = data.get('answer', '').strip()
            answer_image = None
        
        if not doubt_id or not answer:
            return jsonify({'success': False, 'error': 'Doubt ID and answer are required'}), 400
        
        doubt = db.query(Doubt).filter(Doubt.id == doubt_id).first()
        if not doubt:
            return jsonify({'success': False, 'error': 'Doubt not found'}), 404
        
        answer_image_filename = None
        if answer_image:
            answer_image_filename = save_uploaded_file(answer_image, 'answers')
        
        doubt.answer = answer
        doubt.answer_image = answer_image_filename
        doubt.teacher_id = session['user_id']
        doubt.status = 'answered'
        doubt.answered_at = datetime.utcnow()
        
        db.commit()
        
        return jsonify({'success': True, 'message': 'Doubt answered successfully'})
    finally:
        db.close()

@app.route('/api/teacher/reply-to-comment', methods=['POST'])
def reply_to_student_comment():
    """Teacher replies to student's comment"""
    if 'user_id' not in session or session.get('user_role') != 'teacher':
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    data = request.get_json()
    doubt_id = data.get('doubt_id')
    reply = data.get('reply', '').strip()
    
    if not doubt_id or not reply:
        return jsonify({'success': False, 'error': 'Doubt ID and reply are required'}), 400
    
    db = SessionLocal()
    try:
        doubt = db.query(Doubt).filter(Doubt.id == doubt_id).first()
        if not doubt:
            return jsonify({'success': False, 'error': 'Doubt not found'}), 404
        
        doubt.teacher_reply = reply
        db.commit()
        
        return jsonify({'success': True, 'message': 'Reply sent successfully'})
    finally:
        db.close()

@app.route('/api/teacher/stats', methods=['GET'])
def get_teacher_stats():
    """Get teacher performance statistics"""
    if 'user_id' not in session or session.get('user_role') != 'teacher':
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    db = SessionLocal()
    try:
        total_doubts_answered = db.query(Doubt).filter(
            Doubt.teacher_id == session['user_id'],
            Doubt.status.in_(['answered', 'resolved'])
        ).count()
        
        total_points_earned = db.query(Doubt).filter(
            Doubt.teacher_id == session['user_id'],
            Doubt.points_awarded > 0
        ).with_entities(func.sum(Doubt.points_awarded)).scalar() or 0
        
        avg_rating = db.query(Doubt).filter(
            Doubt.teacher_id == session['user_id'],
            Doubt.final_rating.isnot(None)
        ).with_entities(func.avg(Doubt.final_rating)).scalar() or 0
        
        return jsonify({
            'success': True,
            'stats': {
                'total_doubts_answered': total_doubts_answered,
                'total_points_earned': total_points_earned,
                'average_rating': round(avg_rating, 1)
            }
        })
    finally:
        db.close()

def get_points_icon(reason):
    """Get appropriate icon for different point earning activities"""
    if 'QnA' in reason:
        return 'fas fa-vial'
    elif 'Dobby' in reason:
        return 'fas fa-robot'
    elif 'Flashcard' in reason:
        return 'fas fa-clone'
    elif 'Doubt' in reason:
        return 'fas fa-question-circle'
    else:
        return 'fas fa-star'

# ============================================================================
# STUDENT DOUBT FEEDBACK API
# ============================================================================
@app.route('/api/student/rate-answer', methods=['POST'])
def rate_teacher_answer():
    """Student rates teacher's answer"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    doubt_id = data.get('doubt_id')
    rating = data.get('rating')  # 1-5 stars
    upvoted = data.get('upvoted', False)
    comment = data.get('comment', '').strip()
    
    if not doubt_id or rating not in [1, 2, 3, 4, 5]:
        return jsonify({'success': False, 'error': 'Doubt ID and valid rating required'}), 400
    
    db = SessionLocal()
    try:
        doubt = db.query(Doubt).filter(Doubt.id == doubt_id, Doubt.student_id == session['user_id']).first()
        if not doubt:
            return jsonify({'success': False, 'error': 'Doubt not found'}), 404
        
        if upvoted:
            doubt.upvoted = True
            doubt.downvoted = False
            doubt.rating = rating
            doubt.student_comment = comment
            
            # Award points to teacher if rating is good (4-5 stars)
            if rating >= 4:
                teacher = db.query(Profile).filter(Profile.id == doubt.teacher_id).first()
                if teacher:
                    teacher.points = (teacher.points or 0) + 10
                    doubt.points_awarded = 10
                    db.commit()
            
            doubt.status = 'resolved'
            
        else:
            doubt.downvoted = True
            doubt.upvoted = False
            doubt.student_comment = comment
            doubt.status = 'answered'  # Allow for further communication
        
        db.commit()
        
        return jsonify({'success': True, 'message': 'Feedback submitted successfully'})
    finally:
        db.close()

@app.route('/api/student/final-rating', methods=['POST'])
def submit_final_rating():
    """Student submits final rating after communication"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    doubt_id = data.get('doubt_id')
    final_rating = data.get('final_rating')  # 1-5 stars
    final_upvoted = data.get('final_upvoted', False)
    
    if not doubt_id or final_rating not in [1, 2, 3, 4, 5]:
        return jsonify({'success': False, 'error': 'Doubt ID and valid rating required'}), 400
    
    db = SessionLocal()
    try:
        doubt = db.query(Doubt).filter(Doubt.id == doubt_id, Doubt.student_id == session['user_id']).first()
        if not doubt:
            return jsonify({'success': False, 'error': 'Doubt not found'}), 404
        
        doubt.final_rating = final_rating
        doubt.final_upvoted = final_upvoted
        
        if final_upvoted and final_rating >= 4:
            # Award points to teacher for final satisfaction
            teacher = db.query(Profile).filter(Profile.id == doubt.teacher_id).first()
            if teacher:
                teacher.points = (teacher.points or 0) + 10
                doubt.points_awarded = 10
                doubt.status = 'resolved'
        
        db.commit()
        
        return jsonify({'success': True, 'message': 'Final rating submitted successfully'})
    finally:
        db.close()


# ============================================================================
# NEW: FLASHCARD GENERATOR API ENDPOINT
# ============================================================================
@app.route('/api/flashcards/generate', methods=['POST'])
def generate_flashcards():
    """Generate summary flashcards for a topic using OpenAI"""
    if 'user_id' not in session or session.get('user_role') != 'student':
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    try:
        data = request.get_json()
        topic = data.get('topic', '').strip()

        if not topic:
            return jsonify({'success': False, 'error': 'Topic is required'}), 400

        prompt = f"""
        Generate 5 concise flashcards for a student on the topic: "{topic}".
        The flashcards should be for last-minute revision.
        Provide the response as a valid JSON array of objects.
        Each object must have two keys: "term" and "definition".
        
        Example format:
        [
          {{"term": "Term 1", "definition": "Definition 1."}},
          {{"term": "Term 2", "definition": "Definition 2."}}
        ]
        
        Do not include any text outside of the JSON array.
        """

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert educational content creator who provides responses in perfect JSON format."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.6
        )

        content = response.choices[0].message.content
        
        try:
            json_start = content.find('[')
            json_end = content.rfind(']') + 1
            if json_start == -1 or json_end == 0:
                raise ValueError("No JSON array found in the AI response.")
            
            json_content = content[json_start:json_end]
            flashcards = json.loads(json_content)
            
            if not isinstance(flashcards, list) or not all("term" in d and "definition" in d for d in flashcards):
                raise ValueError("Invalid flashcard structure received from AI")

            return jsonify({'success': True, 'flashcards': flashcards})

        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing OpenAI response: {e}\nRaw content: {content}")
            return jsonify({'success': False, 'error': 'Failed to get a valid response from the AI. Please try a different topic.'}), 500

    except Exception as e:
        print(f"Flashcard generation error: {e}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred on the server.'}), 500

# ============================================================================
# MAIN EXECUTION
# ============================================================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)