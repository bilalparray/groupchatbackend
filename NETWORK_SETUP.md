# Network Setup Guide

## Accessing Backend from Other Devices

### 1. Find Your IP Address

**Windows:**
```bash
ipconfig | findstr IPv4
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

Look for your local network IP (usually starts with 192.168.x.x or 10.x.x.x)

### 2. Update Frontend Configuration

Edit `src/environments/environment.ts` and update the `API_HOST` variable:
```typescript
const API_HOST = '192.168.1.7'; // Your IP address
```

### 3. Start Backend Server

The server is configured to listen on all network interfaces (0.0.0.0), so it will be accessible from:
- `http://localhost:8081` (local access)
- `http://YOUR_IP:8081` (network access)

### 4. Firewall Configuration

**Windows:**
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Add Node.js or allow port 8081

**Or via Command Prompt (Admin):**
```bash
netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=8081
```

**Mac:**
System Preferences → Security & Privacy → Firewall → Firewall Options → Add Node.js

**Linux:**
```bash
sudo ufw allow 8081/tcp
```

### 5. Access from Mobile/Other Devices

1. Make sure your device is on the same Wi-Fi network
2. Use the IP address shown in the backend console
3. Example: `http://192.168.1.7:8081/api/v1`

### Troubleshooting

- **Can't connect from other devices:**
  - Check firewall settings
  - Ensure devices are on the same network
  - Verify IP address is correct
  - Check backend console shows "Network: http://YOUR_IP:8081"

- **CORS errors:**
  - Backend is configured with `origin: true` which allows all origins
  - If issues persist, check CORS configuration in `index.js`
