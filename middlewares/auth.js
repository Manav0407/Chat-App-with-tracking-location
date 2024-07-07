import { User } from "../models/user.js";
import jwt from "jsonwebtoken";
export const isAuthenticated = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(decode._id)
    const user = await User.findOne({ _id: decode._id });
    // console.log("sadad",user);
    req.user = user;
    // console.log("auth nu chhe",req.user);
    next();
  } catch (error) {
    // next();
  }
};

export const socketAuthenticator = async (error, socket, next) => {
  try {
    if (error) {
      return next(error);
    }

    const  token  = socket.request.cookies.token;

    // console.log(token);

    if(!token){
        return next(new Error("Authentication error"));
    }

    const decode = jwt.verify(token,process.env.JWT_SECRET);

    // console.log(decode);

    const user = await User.findById(decode._id);

    // console.log(user);

    socket.user = user;

    return next();
    

  } catch (error) {
    console.log(error);
    
  }
};
