import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendError } from '../../Helper/response.helper.js';
import { User } from '../../db/dbconnection.js';
dotenv.config();

const generateAccessToken=async(user)=>{
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    return token;
}

const generateRefreshToken=async(user)=>{
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
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
      return res.status(401).json("Invalid token");
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
      if (error) {
        return res.status(403).json("Token Expired");
      }
      req.user = decoded; // ✅ SET req.user
      next();
    });
  } catch (error) {
    return res.status(500).json("Token processing failed");
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

    const user = await User.findByPk(decoded.id);
    if (!user) return sendError(res, 'User not found', 404);

    req.user = { id: user.id, role: user.role };
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