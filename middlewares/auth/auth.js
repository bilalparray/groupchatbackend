import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendError } from '../../Helper/response.helper.js';
import { User, Guest } from '../../db/dbconnection.js';
dotenv.config();

const generateAccessToken=async(user)=>{
    // Build token payload - include name for guests
    const payload = {
      id: user.id,
      role: user.role
    };
    
    // For guests, include name; for users, include username
    if (user.role === "Guest") {
      payload.name = user.name;
    } else {
      payload.username = user.username;
    }
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    return token;
}

const generateRefreshToken=async(user)=>{
    // Build token payload - include name for guests
    const payload = {
      id: user.id,
      role: user.role
    };
    
    // For guests, include name; for users, include username
    if (user.role === "Guest") {
      payload.name = user.name;
    } else {
      payload.username = user.username;
    }
    
    const token = jwt.sign(
      payload,
      process.env.REFRESH_SECRET,
      {
        expiresIn: "7d",
      }
    );
    return token;

}

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return sendError(res, "Authentication token missing", 401);
    }

    jwt.verify(token, process.env.JWT_SECRET, async (error, decoded) => {
      if (error) {
        return sendError(res, "Invalid or expired token", 403);
      }
      // For guests, ensure we have the correct structure with name
      if (decoded.role === "Guest") {
        let guestName = decoded.name;
        
        // If name is not in token (old token), fetch from database
        if (!guestName) {
          try {
            const guestRecord = await Guest.findByPk(decoded.id);
            if (guestRecord && guestRecord.name) {
              guestName = guestRecord.name;
              console.log(`[authenticateToken] Fetched guest name from DB for ID ${decoded.id}: "${guestName}"`);
            }
          } catch (dbError) {
            console.error(`[authenticateToken] Error fetching guest name from DB:`, dbError);
          }
        }
        
        req.user = { 
          id: decoded.id, 
          role: decoded.role,
          name: guestName || null
        };
        console.log(`[authenticateToken] Authenticated guest:`, { id: req.user.id, name: req.user.name, role: req.user.role });
      } else {
        req.user = decoded; // ✅ SET req.user with { id, username/name, role, ... }
        console.log(`[authenticateToken] Authenticated user:`, { id: req.user.id, role: req.user.role });
      }
      next();
    });
  } catch (error) {
    return sendError(res, "Token processing failed", 500);
  }
};
  
export default async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader); // 👈

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token missing', 401);
    }

    const token = authHeader.split(' ')[1];
    console.log('Token:', token); // 👈

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded:', decoded); // 👈

    // Check if it's a guest (role is "Guest") or a regular user
    if (decoded.role === "Guest") {
      // For guests, use the decoded info directly (they're in Guest table, not User table)
      // Include name from token payload if available
      req.user = { 
        id: decoded.id, 
        role: decoded.role,
        name: decoded.name || null // Include name for guests (will be fetched from DB if missing)
      };
    } else {
      // For regular users, look them up in User table
      const user = await User.findByPk(decoded.id);
      if (!user) return sendError(res, 'User not found', 404);
      req.user = { id: user.id, role: user.role };
    }
    
    next();
  } catch (err) {
    console.error('JWT Error:', err); // 👈
    return sendError(res, 'Invalid or expired token', 401);
  }
}


// export default async function authenticate(req, res, next) {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer')) {
//       return sendError(res, 'Authentication token missing', 401);
//     }
//     const token = authHeader.split(' ')[1];
//     const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

//     const user = await User.findByPk(decoded.id);
//     if (!user) return sendError(res, 'User not found', 404);

//     req.user = { id: user.id, role: user.role };
//     next();
//   } catch (err) {
//     return sendError(res, 'Invalid or expired token', 401);
//   }
// }
export {
    generateAccessToken,generateRefreshToken,authenticateToken,authenticate
}