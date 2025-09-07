# Super Admin Credentials

## Production Super Admin Account

**Email:** admin@gmah.org  
**Password:** Admin123!@#

## Important Security Notes

⚠️ **CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!**

### First Login Steps:
1. Login with the credentials above
2. Navigate to Profile/Settings
3. Change your password to a secure one
4. Enable two-factor authentication (2FA)
5. Update your profile information

### Password Requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### To Create Additional Admins:
1. Login as Super Admin
2. Navigate to User Management
3. Create new user with appropriate role
4. Assign permissions as needed

### To Re-run the Seed Script:
```bash
cd apps/api
npm run prisma:seed
```

Note: The seed script will not create duplicate super admins. If the email already exists, it will skip creation.