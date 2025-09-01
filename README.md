# Clippy - AI Content Creator

An intelligent web application that helps users create professional presentations, reports, and web content through natural conversation with Claude AI.

## 🌟 Features

- **Natural Language Interface**: Chat with Claude AI to describe what you want to create
- **Smart HTML Generation**: Automatically generates professional HTML content
- **Design Templates**: Built-in template library with professional designs
- **File Upload Support**: Upload images, documents, and other files for content integration
- **Real-time Preview**: See your content as it's being created
- **Responsive Design**: Works perfectly on desktop and mobile devices

## 🚀 Live Demo

Visit the live application: [Clippy on Vercel](https://your-app-name.vercel.app)

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Python Flask
- **AI Integration**: Claude Sonnet 4 API
- **Deployment**: Vercel
- **Styling**: Custom CSS with modern gradients and animations

## 📋 Local Development

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/clippy-ai-creator.git
   cd clippy-ai-creator
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # On Windows
   # or
   source .venv/bin/activate  # On macOS/Linux
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   python server.py
   ```

5. **Open your browser:**
   ```
   http://localhost:5000
   ```

## 🎯 How to Use

1. **Start Creating**: Type your content requirements in the chat interface
2. **Choose Templates**: Click the 🧬 DNA button to select design templates
3. **Upload Files**: Use the 📎 button to add images or documents
4. **Watch Magic Happen**: See your content generated in real-time
5. **Export Results**: Click "View Content" to open in a new tab

## 📁 Project Structure

```
clippy-ai-creator/
├── server.py              # Flask backend server
├── index.html            # Main application interface
├── script.js             # Frontend JavaScript logic
├── style.css             # Application styling
├── requirements.txt      # Python dependencies
├── vercel.json          # Vercel deployment configuration
├── .gitignore           # Git ignore rules
├── README.md            # Project documentation
└── templates/           # HTML template files
    ├── TemplateAnalysis.html
    ├── TemplateProductOverview.html
    ├── TemplateTable.html
    ├── TemplateChart.html
    └── slide-template-*.html
```

## 🔧 Environment Variables

For production deployment, make sure to configure your API keys securely through your hosting platform's environment variables section.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Claude AI by Anthropic for powering the content generation
- The open-source community for inspiration and tools
- Modern web technologies that make this possible

## 📞 Support

If you have any questions or need help, please open an issue on GitHub or contact the maintainer.

---

Made with ❤️ by [Your Name]

- `index.html` - Main webpage with chat interface
- `style.css` - Styling for the chat interface
- `script.js` - JavaScript for handling chat functionality
- `server.py` - Flask backend server that handles API calls to Claude
- `requirements.txt` - Python dependencies

## Security Note

The API key is securely stored in the backend server (`server.py`) and is not exposed to the frontend, ensuring better security for your API credentials.

## Troubleshooting

If you encounter any issues:

1. Make sure Python is installed and accessible from your command line
2. Ensure all dependencies are installed: `pip install -r requirements.txt`
3. Check that port 5000 is not being used by another application
4. Verify your internet connection for API calls

## Customization

You can customize the appearance by modifying the `style.css` file. The color scheme, fonts, and layout can all be adjusted to your preferences.
