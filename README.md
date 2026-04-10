# Smart Alumni-Student Connect Platform

A production-ready MERN stack application connecting students with verified alumni for mentorship and referral opportunities.

## 🌟 Features

### Authentication & Roles
- Separate login/register for Students and Alumni
- JWT-based authentication with secure password hashing (bcrypt)
- Role-based access control (Student, Alumni, Admin)
- Protected routes and session management

### Profile System
- **Student Profile**: Name, College, Branch, Graduation Year, Skills, Career Interests, Resume, LinkedIn
- **Alumni Profile**: Company, Designation, Experience, Domains, Skills, Availability

### AI-Powered Matching
- Jaccard similarity for skill matching
- Domain match weight calculation
- Experience and career interest alignment
- Top 5 mentors sorted by compatibility score

### Mentorship Workflow
- Send/respond to mentorship requests
- Session scheduling with date/time
- Status tracking: Pending → Approved → Completed
- Feedback and ratings system

### Referral System
- Company-specific referral requests
- Status tracking: Requested → Under Review → Referred/Rejected
- Timeline tracking

### Real-time Chat
- Socket.io powered messaging
- Typing indicators
- Read receipts
- Only for approved mentorship relationships

### Admin Panel
- User management and analytics
- Alumni verification system
- Platform statistics dashboard

## 🏗️ Architecture

```
career-bridge-platform/
├── backend/                    # Node.js + Express.js API
│   ├── config/                # Database configuration
│   ├── controllers/           # Route handlers
│   ├── middleware/            # Auth, error handling, uploads
│   ├── models/               # MongoDB schemas
│   ├── routes/               # API endpoints
│   ├── utils/                # Helper functions
│   └── server.js             # Entry point with Socket.io
├── frontend/                  # React + Vite application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand state management
│   │   ├── services/        # API & Socket services
│   │   └── App.jsx          # Main app with routing
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 6+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Configure your environment variables
# - MongoDB URI
# - JWT Secret
# - Email credentials (for notifications)

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

**Backend (.env):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/career_bridge
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:5173
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Students
- `GET /api/students/profile` - Get student profile
- `PUT /api/students/profile` - Update profile
- `PUT /api/students/resume` - Upload resume

### Alumni
- `GET /api/alumni/profile` - Get alumni profile
- `PUT /api/alumni/profile` - Update profile
- `GET /api/alumni` - List all alumni

### Matching
- `GET /api/match/mentors` - Get matched mentors (AI-powered)
- `GET /api/match/score/:alumniId` - Get match score
- `GET /api/match/search` - Search mentors

### Mentorship
- `POST /api/mentorship/request` - Send request
- `GET /api/mentorship/requests` - List requests
- `PUT /api/mentorship/:id/respond` - Approve/Reject
- `POST /api/mentorship/:id/session` - Schedule session

### Referrals
- `POST /api/referral/request` - Send referral request
- `GET /api/referral/requests` - List requests
- `PUT /api/referral/:id` - Update status

### Chat
- `GET /api/chat/conversations` - List conversations
- `GET /api/chat/messages/:id` - Get messages
- `POST /api/chat/send` - Send message

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List users
- `PUT /api/admin/alumni/:id/verify` - Verify alumni

## 🎯 AI Matching Algorithm

The matching score is calculated using:

```javascript
// Skill Similarity (Jaccard) - 35%
score += jaccardSimilarity(student.skills, alumni.skills) * 35

// Domain Match - 30%
score += domainMatch(student.interests, alumni.domains) * 30

// Experience Weight - 20%
score += (experience / 20) * 20

// Career Alignment - 15%
score += careerAlignment(interests, domains) * 15

// Bonus Points
if (alumni.availableForMentorship) score += 2
if (alumni.availableForReferrals) score += 2
if (alumni.rating >= 4) score += 1
```

## ☁️ Deployment Guide

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your repository
3. Build Command: `cd backend && npm install`
4. Start Command: `npm start`
5. Add environment variables in Render dashboard
6. Deploy

### Frontend (Vercel)

1. Create a new project on Vercel
2. Connect your repository
3. Framework Preset: Vite
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add environment variables
7. Deploy

### MongoDB Atlas

1. Create a free cluster on MongoDB Atlas
2. Create database user
3. Whitelist IP (0.0.0.0/0 for development)
4. Get connection string
5. Add to backend environment variables

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS configuration
- Rate limiting (add in production)
- Helmet.js security headers

## 📱 Responsive Design

Built with Tailwind CSS for mobile-first responsive design:
- Mobile-friendly navigation
- Touch-optimized interactions
- Adaptive layouts

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm run test
```

## 🔧 Future Scalability

1. **Caching**: Implement Redis for API caching
2. **File Storage**: Integrate Cloudinary/S3 for uploads
3. **Email Service**: Add Nodemailer for notifications
4. **Calendar Integration**: Google Calendar API for sessions
5. **Search**: ElasticSearch for advanced filtering
6. **Microservices**: Split into independent services
7. **CDN**: Cloudflare for static assets
8. **Load Balancing**: Horizontal scaling support

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ for the hackathon community!
