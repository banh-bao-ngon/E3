# Clinical Protocols Calculator

A comprehensive web-based clinical calculator for healthcare professionals with automated monitoring, scheduled notifications, and AI assistance.

## 🚀 Live Demo
[Visit the live website](https://your-vercel-app.vercel.app) *(Replace with your actual Vercel URL)*

## ✨ Features

- **Clinical Protocols**: Heparin and Insulin protocols with automated calculations
- **Real-time Monitoring**: Blood glucose and infusion rate tracking with visual graphs
- **Scheduled Notifications**: Automatic reminders at 11 AM and 3 PM CST
- **AI Assistant**: Clinical question answering with Gemini AI
- **Calculator Tools**: Weight converter and basic calculator
- **Dark Mode**: Professional dark theme option

## 🛠️ Local Development Setup

### Prerequisites
- A Gemini AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Quick Start
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/clinical-protocols-calculator.git
   cd clinical-protocols-calculator
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and add your API key:**
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Open `index.html` in your browser**

## 🚀 Vercel Deployment

### Automatic Deployment (Recommended)
1. **Fork this repository** to your GitHub account

2. **Connect to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

3. **Set Environment Variables:**
   - In Vercel project settings → Environment Variables
   - Add: `VITE_GEMINI_API_KEY` = `your_actual_api_key_here`
   - Environment: All (Production, Preview, Development)

4. **Deploy!**
   - Vercel will automatically deploy on every push to main branch

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable
vercel env add VITE_GEMINI_API_KEY
```

## 🔒 Security Features

- **Environment Variables**: API keys stored securely in Vercel
- **No Keys in Code**: All sensitive data handled via environment variables
- **Auto HTTPS**: Vercel provides automatic SSL certificates
- **Security Headers**: XSS protection and content security policies

## 📱 Usage

### Clinical Protocols
- **Heparin Protocol**: Enter aPTT values for dose calculations
- **Insulin Protocol**: Choose between Non-DKA and DKA/HHS protocols

### Monitoring System
- **Real-time Graphs**: Track blood glucose and infusion rates
- **Automated Flags**: Get alerts for critical values
- **Timer System**: 1-hour countdown for regular monitoring

### AI Assistant
- Ask clinical questions in the "Dat AI Assistant" tab
- Get evidence-based responses for protocols and calculations
- **Important**: Always verify AI responses with clinical judgment

## 🔧 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test locally with your `.env` file
5. Commit: `git commit -m "Add feature"`
6. Push: `git push origin feature-name`
7. Create a Pull Request

## ⚠️ Important Notes

- **Clinical Use**: This tool is for reference only - always use clinical judgment
- **API Key Security**: Never commit your `.env` file to version control
- **Environment Variables**: Use Vercel dashboard to manage production API keys
- **HIPAA Compliance**: No patient data is stored or transmitted

## 📞 Support

- **Issues**: Report bugs via GitHub Issues
- **Questions**: Use GitHub Discussions
- **Security**: Email security@yourproject.com for vulnerabilities

## 📄 License

© 2025 BANH BAO - Developed, tested, and overseen by Banh Bao

---

**Disclaimer**: This tool is for clinical reference only. Always use clinical judgment and verify calculations independently.