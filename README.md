# Panda Miner — Production-Ready Telegram Mini App

A comprehensive, production-ready Telegram Mini App with MongoDB backend, featuring tap mining, energy system, XP/levels, shop, referrals, tasks, friends, leaderboards, wallet, notifications, and admin panel.

## Features

### Core Game Features
- **Tap Mining**: Earn coins with energy-based tap system
- **Energy System**: Regenerating energy with upgradeable tiers
- **XP & Levels**: Progressive leveling system with rewards
- **Daily Rewards**: Streak-based daily login bonuses
- **Chests & Mystery Boxes**: Time-based reward chests
- **Offline Mining**: Earn coins while away

### Social Features
- **Referral System**: Invite friends and earn passive income
- **Friends System**: Add friends, track online status
- **Leaderboards**: Global, weekly, monthly, friends, and referral rankings
- **Tasks & Missions**: Complete tasks for rewards

### Economy
- **Shop System**: Purchase upgrades, cosmetics, and boosts
- **Wallet System**: Connect TON wallet, withdraw earnings
- **Transaction System**: Track all financial operations

### User Experience
- **Profile System**: Detailed user profiles with achievements
- **Settings System**: Customizable app settings
- **Notification System**: In-app notifications for events
- **Admin Panel**: Full admin dashboard for management

### Security & Performance
- **Production Authentication**: Telegram initData verification
- **Rate Limiting**: Protect against abuse
- **Input Validation**: Sanitize all inputs
- **Error Handling**: Comprehensive error management
- **MongoDB Indexing**: Optimized database queries

## Project Structure

```
panda-miner-fullstack/
├── client/                      # Frontend (served by backend)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── assets/
└── server/
    ├── server.js               # Express app entry point
    ├── package.json
    ├── .env.example
    ├── config/
    │   ├── env.js              # Environment configuration
    │   └── gameConfig.js       # Game constants
    ├── db/
    │   └── mongo.js            # MongoDB connection
    ├── middleware/
    │   ├── verifyTelegram.js   # Telegram auth verification
    │   ├── rateLimit.js        # Rate limiting
    │   ├── validate.js         # Input validation
    │   └── errorHandler.js     # Error handling
    ├── models/                 # Mongoose schemas
    │   ├── User.js
    │   ├── MiningHistory.js
    │   ├── DailyReward.js
    │   ├── Task.js
    │   ├── Mission.js
    │   ├── Boost.js
    │   ├── Wallet.js
    │   ├── Transaction.js
    │   ├── Friend.js
    │   ├── Referral.js
    │   ├── Notification.js
    │   ├── ClaimHistory.js
    │   ├── Settings.js
    │   ├── Admin.js
    │   └── Log.js
    ├── services/               # Business logic
    │   ├── authService.js
    │   ├── gameService.js
    │   ├── shopService.js
    │   ├── referralService.js
    │   ├── taskService.js
    │   ├── friendService.js
    │   ├── leaderboardService.js
    │   ├── walletService.js
    │   ├── notificationService.js
    │   ├── userService.js
    │   ├── settingsService.js
    │   └── adminService.js
    ├── controllers/            # Request handlers
    │   ├── authController.js
    │   ├── gameController.js
    │   ├── shopController.js
    │   ├── referralController.js
    │   ├── taskController.js
    │   ├── friendController.js
    │   ├── leaderboardController.js
    │   ├── walletController.js
    │   ├── notificationController.js
    │   ├── userController.js
    │   ├── settingsController.js
    │   └── adminController.js
    ├── routes/                 # API routes
    │   ├── index.js            # Main router
    │   ├── auth.js
    │   ├── game.js
    │   ├── shop.js
    │   ├── referral.js
    │   ├── tasks.js
    │   ├── friends.js
    │   ├── leaderboard.js
    │   ├── wallet.js
    │   ├── notifications.js
    │   ├── users.js
    │   ├── settings.js
    │   └── admin.js
    └── utils/
        └── helpers.js          # Utility functions
```

## Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Set Up MongoDB
Choose one:

**Local MongoDB:**
```bash
# Install MongoDB Community Edition
# Run MongoDB
# Use: mongodb://localhost:27017/panda-miner
```

**MongoDB Atlas (Recommended):**
1. Create free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create database user + password
3. Network Access → allow your IP (or `0.0.0.0/0` for testing)
4. Copy connection string

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/panda-miner
BOT_TOKEN=123456:ABC-your-bot-token-from-BotFather
PORT=3000
NODE_ENV=development
ALLOW_DEV_AUTH=true
```

Get `BOT_TOKEN` from [@BotFather](https://t.me/BotFather) → `/mybots` → your bot → API Token.

### 4. Run Development Server
```bash
npm start
```

Visit `http://localhost:3000` — dev mode uses a fake "Dev Miner" user for testing.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Telegram initData
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/auth/referral/:code` - Validate referral code
- `GET /api/auth/my-referral` - Get referral info

### Game
- `POST /api/game/mine` - Mine coins
- `GET /api/game/state` - Get game state
- `POST /api/game/chest` - Open chest
- `POST /api/game/mystery-box` - Open mystery box
- `POST /api/game/daily-reward` - Claim daily reward
- `POST /api/game/offline-earnings` - Claim offline earnings
- `GET /api/game/stats` - Get game statistics

### Shop
- `GET /api/shop/items` - Get shop items
- `POST /api/shop/purchase` - Purchase item
- `GET /api/shop/categories` - Get categories
- `GET /api/shop/item/:itemId` - Get specific item

### Referral
- `GET /api/referral/info` - Get referral info
- `GET /api/referral/validate/:code` - Validate code
- `POST /api/referral/create` - Create referral
- `POST /api/referral/complete/:referralId` - Complete referral
- `GET /api/referral/list` - Get referral list
- `GET /api/referral/leaderboard` - Get referral leaderboard

### Tasks
- `GET /api/tasks` - Get available tasks
- `POST /api/tasks/:taskId/complete` - Complete task
- `GET /api/tasks/categories` - Get task categories
- `GET /api/tasks/missions` - Get missions
- `POST /api/tasks/missions` - Create mission (admin)
- `POST /api/tasks/missions/:missionId/progress` - Update progress
- `POST /api/tasks/missions/:missionId/claim` - Claim reward
- `POST /api/tasks/reset-daily` - Reset daily tasks

### Friends
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/accept/:friendId` - Accept request
- `POST /api/friends/reject/:friendId` - Reject request
- `DELETE /api/friends/:friendId` - Remove friend
- `POST /api/friends/block` - Block user
- `POST /api/friends/unblock` - Unblock user
- `GET /api/friends` - Get friend list
- `GET /api/friends/pending` - Get pending requests
- `PUT /api/friends/online` - Update online status
- `GET /api/friends/search` - Search users

### Leaderboard
- `GET /api/leaderboard/global` - Global leaderboard
- `GET /api/leaderboard/weekly` - Weekly leaderboard
- `GET /api/leaderboard/monthly` - Monthly leaderboard
- `GET /api/leaderboard/friends` - Friends leaderboard
- `GET /api/leaderboard/level` - Level leaderboard
- `GET /api/leaderboard/referral` - Referral leaderboard
- `GET /api/leaderboard/rank/:type` - Get user rank
- `GET /api/leaderboard/summary` - Get leaderboard summary

### Wallet
- `POST /api/wallet/connect` - Connect wallet
- `POST /api/wallet/disconnect` - Disconnect wallet
- `POST /api/wallet/verify` - Verify wallet
- `GET /api/wallet` - Get wallet info
- `POST /api/wallet/withdraw` - Create withdrawal
- `POST /api/wallet/deposit` - Create deposit (admin)
- `GET /api/wallet/transactions` - Get transactions
- `GET /api/wallet/transactions/:transactionId` - Get transaction
- `PUT /api/wallet/transactions/:transactionId/status` - Update status (admin)

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:notificationId/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:notificationId` - Delete notification
- `GET /api/notifications/unread-count` - Get unread count

### User Profile
- `GET /api/users/profile` - Get profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/achievements` - Get achievements
- `GET /api/users/activity` - Get activity history
- `GET /api/users/stats` - Get stats summary
- `DELETE /api/users/account` - Delete account

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/reset` - Reset to defaults
- `GET /api/settings/languages` - Get languages
- `GET /api/settings/themes` - Get themes
- `GET /api/settings/export` - Export settings
- `POST /api/settings/import` - Import settings

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - Get user list
- `POST /api/admin/users/ban` - Ban user
- `POST /api/admin/users/unban` - Unban user
- `POST /api/admin/users/coins` - Edit user coins
- `POST /api/admin/users/xp` - Edit user XP
- `POST /api/admin/tasks` - Create task
- `PUT /api/admin/tasks/:taskId` - Update task
- `DELETE /api/admin/tasks/:taskId` - Delete task
- `GET /api/admin/logs` - Get system logs
- `POST /api/admin/notifications` - Send notification
- `POST /api/admin/broadcast` - Send broadcast

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions for Render and Vercel.

### Quick Deployment Steps

1. **Deploy Backend to Render**
   - Connect GitHub repository
   - Configure web service with root directory `server`
   - Set environment variables
   - Deploy

2. **Deploy Frontend to Vercel**
   - Connect GitHub repository
   - Configure project with root directory `client`
   - Deploy

3. **Configure Telegram Bot**
   - Update Mini App URL in BotFather
   - Set webhook if needed

## Testing

See [TESTING.md](TESTING.md) for comprehensive testing procedures.

### Run Tests
```bash
npm test
```

## Security

- Telegram initData verification
- Rate limiting on all endpoints
- Input validation and sanitization
- MongoDB connection encryption
- CORS configuration
- Helmet security headers
- Admin account locking

## Documentation

- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Architecture overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [TESTING.md](TESTING.md) - Testing procedures
- [BUG_FIXES.md](BUG_FIXES.md) - Known issues and fixes

## License

MIT License
