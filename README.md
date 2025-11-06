# EPOP - Enterprise Collaboration Platform

A Microsoft Teams-style collaboration platform built with Next.js 14, featuring real-time chat, project management, file sharing, and more.

## Features

- **Real-time Chat** - WebSocket-powered messaging with threads, reactions, and read receipts
- **Mail-like Compose** - Email-style messaging with folders (Received, Sent, Deleted)
- **Project Management** - Kanban boards, Gantt charts, and task tracking with SVAR components
- **File Management** - Upload, preview, and organize files with context linking
- **Global Search** - Unified search across messages, projects, users, and files
- **Directory** - Admin-managed organizational tree with drag-drop user management
- **Notifications** - In-app notifications and Web Push support
- **PWA Support** - Installable progressive web app with offline capabilities
- **Presence System** - Real-time user status with phone extension badges
- **Responsive Design** - Modern UI with dark/light theme support

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Real-time**: Socket.IO
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Calendar**: React Big Calendar
- **Grid/Gantt**: SVAR DataGrid & Gantt (planned)
- **Rich Text**: TipTap
- **Testing**: Playwright + React Testing Library
- **Storybook**: Component documentation

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EPop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and configure:
   - `JWT_SECRET` - Secret key for JWT tokens
   - `NEXT_PUBLIC_ENABLE_REGISTRATION` - Enable/disable user registration

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

For development/testing:
- **Email**: `admin@epop.com`
- **Password**: `password123`

## Project Structure

```
EPop/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (shell)/             # Main app shell
│   │   ├── dashboard/       # Dashboard
│   │   ├── chat/            # Chat feature
│   │   ├── mail/            # Mail/Compose feature
│   │   ├── projects/        # Projects & Planner
│   │   ├── files/           # File management
│   │   └── directory/       # Org directory (admin)
│   ├── api/                 # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── chats/           # Chat endpoints
│   │   ├── mail/            # Mail endpoints
│   │   ├── projects/        # Project endpoints
│   │   └── files/           # File endpoints
│   ├── globals.css          # Global styles
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── shell/               # App shell components
│   ├── ui/                  # shadcn/ui components
│   └── providers/           # Context providers
├── features/                # Feature modules
│   ├── chat/                # Chat feature
│   ├── compose/             # Compose/Mail feature
│   ├── projects/            # Projects feature
│   ├── files/               # Files feature
│   ├── directory/           # Directory feature
│   └── notifications/       # Notifications feature
├── lib/                     # Utilities and libraries
│   ├── api/                 # API client and hooks
│   ├── stores/              # Zustand stores
│   ├── socket/              # Socket.IO client
│   ├── db/                  # Mock database
│   ├── utils.ts             # Utility functions
│   └── constants.ts         # Constants
├── types/                   # TypeScript type definitions
├── public/                  # Static assets
├── docs/                    # Documentation
├── e2e/                     # Playwright E2E tests
├── server.js                # Custom server with Socket.IO
└── package.json             # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server with Socket.IO
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run Jest tests
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run storybook` - Start Storybook
- `npm run build-storybook` - Build Storybook

## Architecture

### Authentication Flow

1. User submits credentials via login form
2. API validates credentials and generates JWT tokens
3. Tokens stored in httpOnly cookies
4. Middleware validates tokens on protected routes
5. Socket.IO connection authenticated with JWT

### Real-time Communication

- Socket.IO server runs alongside Next.js
- Clients join rooms per chat/project
- Events broadcast to room members
- Optimistic UI updates with server reconciliation

### State Management

- **Zustand** for global state (auth, chat, projects, UI)
- **TanStack Query** for server state and caching
- **Immer** middleware for immutable updates

### File Upload Flow (Future MinIO)

1. Client requests pre-signed upload URL
2. Client uploads directly to MinIO
3. Client confirms upload with file metadata
4. File appears in Files area with context

## Features Documentation

Detailed documentation for each feature:

- [Shell Architecture](docs/frontend/SHELL.md)
- [Chat Feature](docs/frontend/CHAT.md)
- [Compose/Mail Feature](docs/frontend/COMPOSE.md)
- [Projects & Planner](docs/frontend/PROJECTS.md)
- [File Management](docs/frontend/FILES.md)
- [Global Search](docs/frontend/SEARCH.md)
- [Directory Management](docs/frontend/DIRECTORY.md)
- [Notifications](docs/frontend/NOTIFICATIONS.md)

## Keyboard Shortcuts

- `Ctrl+K` - Open global search
- `Ctrl+N` - New chat
- `Ctrl+1` - Navigate to Activity/Dashboard
- `Ctrl+2` - Navigate to Chat
- `Ctrl+3` - Navigate to Projects
- `Ctrl+4` - Navigate to Files
- `Ctrl+5` - Navigate to Directory (admin)
- `Ctrl+6` - Navigate to Admin (admin)

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
- Authentication flow
- Real-time chat messaging
- Task drag-and-drop
- File upload
- Search functionality

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

Required for production:
- `JWT_SECRET` - Strong secret key
- `JWT_REFRESH_SECRET` - Refresh token secret
- `NEXT_PUBLIC_APP_URL` - Production URL
- Database connection (when PostgreSQL is integrated)
- MinIO/S3 credentials (for file storage)
- SMTP settings (for email notifications)
- VAPID keys (for Web Push)

## Future Enhancements

- [ ] PostgreSQL database integration
- [ ] MinIO/Synology file storage
- [ ] ZincSearch full-text search
- [ ] Email notifications via SMTP
- [ ] Calendar integration
- [ ] Video/audio calls
- [ ] Mobile apps (React Native)
- [ ] Advanced analytics dashboard
- [ ] Workflow automation
- [ ] Third-party integrations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For support, email bagastyo6@gmail.com or open an issue in the repository.

---

Built with ❤️ by the EPOP Team
