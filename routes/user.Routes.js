import express from "express";
import {
  Signup,
  acceptRequest,
  getMyFriends,
  getMyFriendsLocation,
  getMyNotifications,
  getMyProfile,
  googleLogin,
  logout,
  searchUser,
  sendRequest,
  signin,
  updateUserLocation,
  varifyEmail,
} from "../controllers/user.js";
import { Avatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  acceptRequestValidator,
  loginValidator,
  registerValidator,
  sendRequestValidator,
  validateHandler,
} from "../lib/validator.js";
const router = express.Router();

router.post("/signup", Avatar, Signup);
router.post("/signin", loginValidator(), validateHandler, signin);
router.get("/:id/verify/:token", varifyEmail);
router.get("/logout", logout);
router.get("/google/login/suceess",googleLogin);

router.get("/me",isAuthenticated, getMyProfile);
router.get("/search", isAuthenticated, searchUser);
router.put(
  "/send/request",
  isAuthenticated,
  sendRequestValidator(),
  validateHandler,
  sendRequest
);
router.put(
  "/accept/request",
  isAuthenticated,
  acceptRequestValidator(),
  validateHandler,
  acceptRequest
);
router.get("/notifications",isAuthenticated,getMyNotifications);

router.get("/friends", isAuthenticated, getMyFriends);

router.put("/location",isAuthenticated,updateUserLocation);

router.get("/all/location",isAuthenticated,getMyFriendsLocation);

export default router;
