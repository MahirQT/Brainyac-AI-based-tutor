# AI Hackathon Project 🚀

A ready-to-use AI project template built with Flask, TensorFlow, PyTorch, and other powerful AI/ML libraries.

## 🎯 What's Included

- **Flask Web Framework** - Lightweight and fast
- **AI/ML Libraries** - TensorFlow, PyTorch, scikit-learn, OpenCV, NLTK, spaCy
- **Database Ready** - Supabase integration
- **API Integration** - OpenAI GPT API support
- **Web Interfaces** - Streamlit and Gradio for quick demos
- **Pre-built Utilities** - Common AI functions ready to use

## 🚀 Quick Start

### 1. Activate Virtual Environment
```bash
# Windows
venv\Scripts\Activate.ps1

# Linux/Mac
source venv/bin/activate
```

### 2. Set Environment Variables
Create a `.env` file with your API keys:
```bash
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Application
```bash
python app.py
```

Your API will be available at `http://localhost:5000`

## 📁 Project Structure

```
kurkshetra/
├── app.py              # Main Flask application
├── ai_utils.py         # AI utility functions
├── config.py           # Configuration settings
├── requirements.txt    # Python dependencies
├── README.md          # This file
├── venv/              # Virtual environment
├── models/            # AI models (create this folder)
└── uploads/           # File uploads (create this folder)
```

## 🔧 Available Endpoints

- `GET /` - API information
- `GET /api/health` - Health check
- `POST /api/predict` - Generic prediction endpoint
- `POST /api/analyze` - Generic analysis endpoint

## 🤖 AI Features Ready to Use

### Text Analysis
- Word count, unique words, average word length
- Sentiment analysis
- Text summarization

### Image Analysis
- Image dimensions and statistics
- Brightness and contrast analysis
- Image classification (placeholder)

### OpenAI Integration
- GPT text completion
- Customizable prompts

## 🎨 Customization Guide

### 1. Modify AI Logic
Edit `ai_utils.py` to implement your specific AI functionality.

### 2. Add New Endpoints
Add new routes in `app.py` for your project requirements.

### 3. Database Integration
Use the Supabase configuration in `config.py` to connect to your database.

### 4. Model Training
Use the TensorFlow/PyTorch setup to train custom models.

## 🚀 Deployment Options

### Local Development
```bash
python app.py
```

### Production (with Gunicorn)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Streamlit Interface
```bash
streamlit run streamlit_app.py
```

## 📚 Common AI Project Types

This template is ready for:
- **Chatbots** - Use OpenAI API + Flask
- **Image Recognition** - Use OpenCV + TensorFlow
- **Text Analysis** - Use NLTK + spaCy
- **Recommendation Systems** - Use scikit-learn
- **Sentiment Analysis** - Use transformers + Flask
- **Object Detection** - Use OpenCV + PyTorch

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Optional |
| `SUPABASE_URL` | Supabase project URL | Optional |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Optional |
| `PORT` | Flask port (default: 5000) | Optional |

## 🆘 Troubleshooting

### Common Issues

1. **TensorFlow Import Error**: Ensure you're using Python 3.10
2. **Package Not Found**: Run `pip install -r requirements.txt`
3. **API Key Errors**: Check your `.env` file configuration

### Getting Help

- Check the Flask debug output for detailed error messages
- Verify all packages are installed: `pip list`
- Ensure virtual environment is activated: `(venv)` should appear in terminal

## 🎉 Ready for Hackathon!

You're all set! When you get your problem statement tomorrow:

1. **Understand the requirements** - Read carefully!
2. **Choose the right AI approach** - Use the utilities in `ai_utils.py`
3. **Customize the endpoints** - Modify `app.py` for your specific needs
4. **Test quickly** - Use the built-in health check endpoints
5. **Deploy fast** - Everything is ready to go!

Good luck with your hackathon! 🚀 