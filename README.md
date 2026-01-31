# Sapphire Demo - Login Information

## Demo User Credentials

### Frontend Demo User (No Backend Required)
- **Email**: `andrew.lee@demo.com` or `demo@demo.com`
- **Password**: Any password (not validated)
- **Purpose**: Testing and demonstrations without backend connection

### Backend Users (Requires MongoDB Connection)
- **Email**: `liam.brown@example.com`
- **Password**: `TeenPass1`

- **Email**: `andrewlee@sapphire.com`
- **Password**: `TeenPass1`

## Creating New Accounts

Feel free to create new accounts through the registration form. New users will be:
- Saved to MongoDB database (if backend is online)
- Stored locally in demo mode (if backend is unavailable)

## Authentication Behavior

1. **Demo Mode**: Using `andrew.lee@demo.com` or `demo@demo.com` logs in instantly without backend
2. **Backend Users**: Other emails authenticate against MongoDB at `https://sapphire-2x9z.onrender.com`
3. **Fallback**: If backend is unreachable, users can still access the app in demo mode