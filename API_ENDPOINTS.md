# Chat API Endpoints Documentation

## Base URL
All endpoints use the base URL from `process.env.BASE_URL` (typically `/api/v1`)

## Authentication
All chat endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Group Endpoints

### 1. Get All Groups
**GET** `/groups`

Get all groups where the authenticated user is a member.

**Response:**
```json
{
  "responseStatusCode": 200,
  "successData": {
    "groups": [
      {
        "id": "1",
        "name": "Project Alpha Team",
        "description": "Main project discussion",
        "owner": "1",
        "inviteKey": "ALPHA123XYZ",
        "members": ["1", "2", "3"],
        "created": "2024-01-01T00:00:00.000Z",
        "lastMessage": "Hey everyone!",
        "lastMessageTime": "2024-01-01T01:00:00.000Z",
        "unreadCount": 2
      }
    ]
  },
  "isError": false,
  "errorData": null
}
```

---

### 2. Create Group
**POST** `/groups`

Create a new group. Only registered users (not guests) can create groups.

**Request Body:**
```json
{
  "reqData": {
    "name": "New Group Name",
    "description": "Group description (optional)"
  }
}
```

**Response:**
```json
{
  "responseStatusCode": 201,
  "successData": {
    "group": {
      "id": "1",
      "name": "New Group Name",
      "description": "Group description",
      "owner": "1",
      "inviteKey": "ABC123XYZ456",
      "members": ["1"],
      "created": "2024-01-01T00:00:00.000Z",
      "unreadCount": 0
    }
  },
  "isError": false,
  "errorData": null
}
```

---

### 3. Generate New Invite Key
**POST** `/groups/:id/invite-key`

Generate a new invite key for a group. Only group owner or SuperAdmin can generate keys.

**Response:**
```json
{
  "responseStatusCode": 200,
  "successData": {
    "inviteKey": "NEWKEY123XYZ",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  },
  "isError": false,
  "errorData": null
}
```

---

### 4. Join Group with Invite Key
**POST** `/groups/join/:inviteKey`

Join a group using an invite key.

**Response:**
```json
{
  "responseStatusCode": 200,
  "successData": {
    "message": "Successfully joined group"
  },
  "isError": false,
  "errorData": null
}
```

---

## Message Endpoints

### 5. Get Messages
**GET** `/messages?groupId=1&skip=0&top=100`

Get messages for a specific group with pagination.

**Query Parameters:**
- `groupId` (required): The group ID
- `skip` (optional, default: 0): Number of messages to skip
- `top` (optional, default: 100): Number of messages to return

**Response:**
```json
{
  "responseStatusCode": 200,
  "successData": {
    "messages": [
      {
        "id": "1",
        "groupId": "1",
        "sender": "1",
        "senderName": "John Doe",
        "type": "text",
        "content": "Hello everyone!",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "fileType": null,
        "fileSize": null,
        "fileName": null,
        "duration": null
      }
    ],
    "totalCount": 50
  },
  "isError": false,
  "errorData": null
}
```

---

### 6. Send Message
**POST** `/messages`

Send a message to a group.

**Request Body:**
```json
{
  "reqData": {
    "groupId": "1",
    "type": "text",
    "content": "Hello everyone!",
    "fileType": null,
    "fileSize": null,
    "fileName": null,
    "duration": null
  }
}
```

**Message Types:**
- `text`: Text message
- `file`: File attachment
- `voice`: Voice message

**Response:**
```json
{
  "responseStatusCode": 201,
  "successData": {
    "message": {
      "id": "1",
      "groupId": "1",
      "sender": "1",
      "senderName": "John Doe",
      "type": "text",
      "content": "Hello everyone!",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  },
  "isError": false,
  "errorData": null
}
```

---

### 7. Search Messages
**POST** `/messages/search`

Search messages across groups or within a specific group.

**Request Body:**
```json
{
  "reqData": {
    "groupId": "1",
    "searchText": "hello"
  }
}
```

**Note:** `groupId` is optional. If not provided, searches across all groups the user is a member of.

**Response:**
```json
{
  "responseStatusCode": 200,
  "successData": {
    "messages": [
      {
        "id": "1",
        "groupId": "1",
        "sender": "1",
        "senderName": "John Doe",
        "type": "text",
        "content": "Hello everyone!",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "isError": false,
  "errorData": null
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "responseStatusCode": 400,
  "isError": true,
  "errorData": {
    "displayMessage": "Error message here",
    "apiErrorType": 1
  }
}
```

---

## Database Models Created

1. **Group** - Stores group information
2. **Message** - Stores messages
3. **GroupMember** - Junction table for group membership (supports both Users and Guests)

---

## Notes

- All endpoints require authentication
- Guest users can only join groups via invite key, not create them
- Group owners can generate new invite keys
- Messages support text, file, and voice types
- Search is case-insensitive and supports partial matching
