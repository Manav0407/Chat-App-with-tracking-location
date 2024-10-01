import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { Token } from "../models/token.js";
import { sendMail } from "../utils/sendMail.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { emitEvent, uploadFileFromCloudinary } from "../utils/features.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";

export const Signup = async (req, res, next) => {
  try {
    // console.log(req.params);
    const { username, email, password } = req.body;

    const file = req.file;

    // if (!file) {
    //   return res.status(400).json({
    //     message: "Please upload an image",
    //   });
    // }

    const result = await uploadFileFromCloudinary([file]);

    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    };

    // console.log(file);

    let user = await User.findOne({ email: email });

    if (user) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    user = await User.create({
      googleId: Date.now(),
      avatar,
      username: username,
      email: email,
      password: password,
    });

    //send varification mail

    const token = await Token.create({
      userId: user._id,
      token: crypto.randomBytes(16).toString("hex"),
    });

    const url = `https://chat-app-frontend-pxia.vercel.app/user/${user?._id}/verify/${token.token}`;

    sendMail(user?.email, "Email Varification", url);

    res.status(201).json({
      message: "Verify your email",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
    console.log(error);
  }
};

export const varifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });

    if (!token) {
      return res.status(404).json({
        message: "Invalid token",
      });
    }

    await User.updateOne({ _id: user._id }, { $set: { verified: true } });

    await Token.deleteOne();

    res.status(200).json({
      message: "Email varified",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const googleLogin = async (req, res) => {
  if (req.user) {
    res.status(200).json({ message: "user logged-In", user: req.user });
  } else {
    res.status(400).json({ message: "user not Authorizes" });
  }
};

export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email }).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(404).json({
        message: "Invalid password",
      });
    }

    if (!user.verified) {
      let token = await Token.findOne({ userId: user._id });

      if (!token) {
        token = await new Token({
          userId: user._id,
          token: crypto.randomBytes(16).toString("hex"),
        }).save();

        const url = `https://chat-app-frontend-pxia.vercel.app/user/${user._id}/verify/${token.token}`;
        sendMail(user.email, "Email Verification", url);
      }

      return res.status(400).json({
        success: false,
        message: "Email not verified",
      });
    }

    const token = jwt.sign(
      {
        _id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: 15 * 24 * 60 * 60 * 1000, // 15 days in seconds
      }
    );

    res
      .status(201)
      .cookie("token", token, {
        httpOnly: true,
        maxAge: 90 * 24 * 60 * 60 * 1000,
        sameSite: "none",
        secure: process.env.NODE_ENV === "Development" ? false : true,
      })
      .json({
        message: "Logged in Successfully",
      });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    // console.log(req.cookies.token);

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "Development" ? false : true,
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getMyProfile = (req, res) => {
  // console.log(req);
  res.status(200).json({
    message: "sucess",
    user: req.user,
  });
};

export const searchUser = async (req, res) => {
  try {
    const { username = "" } = req.query;

    // console.log("username",username);

    const myChats = await Chat.find({
      groupChat: false,
      members: req.user._id,
    });
    // console.log(myChats)
    // console.log(req.user._id);

    const allUsersFromMyChats = myChats.map((chat) => chat.members).flat();

    // console.log(allUsersFromMyChats)

    const allUsersExceptMyChats = await User.find({
      _id: {
        $nin: allUsersFromMyChats,
      },
      username: {
        $regex: username,
        $options: "i",
      },
    });

    return res.status(200).json({
      success: true,
      allUsersExceptMyChats,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const sendRequest = async (req, res) => {
  try {
    const { userId } = req.body;

    const request = await Request.findOne({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    });

    if (request) {
      return res.status(409).json({
        success: false,
        message: "Request already sent",
      });
    }

    await Request.create({
      sender: req.user._id,
      receiver: userId,
    });

    emitEvent(req, NEW_REQUEST, [userId]);

    return res.status(200).json({
      success: true,
      message: "Request sent",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const { requestId, accept } = req.body;

    const request = await Request.findById(requestId)
      .populate("sender", "username")
      .populate("receiver", "username");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "You are not allowed to accept this request",
      });
    }

    if (!accept) {
      await request.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Request rejected",
      });
    }

    const members = [request.sender, request.receiver];
    // console.log(members);
    const other = members.filter((member) => member._id !== req.user._id);
    const membersIds = [request.sender._id, request.receiver._id];

    await Promise.all([
      Chat.create({
        members: membersIds,
        name: `${other?.username}`,
      }),
      Request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
      success: true,
      message: "Request accepted",
      senderId: request.sender._id,
    });

    // console.log(pendingRequest);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const requests = await Request.find({ receiver: req.user._id }).populate(
      "sender",
      "username avatar"
    );

    if (!requests) {
      return res.status(404).json({
        success: false,
        message: "Requests not found",
      });
    }

    const allRequests = requests.map(({ _id, sender }) => ({
      _id,
      sender: {
        _id: sender._id,
        username: sender.username,
        avatar: sender.avatar.url,
      },
    }));

    return res.status(200).json({
      success: true,
      allRequests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyFriends = async (req, res) => {
  try {
    const chatId = req.query.chatId;

    const myChats = await Chat.find({
      groupChat: false,
      members: req.user._id,
    }).populate("members", "username avatar");

    // console.log(myChats[0].members);

    const friends = myChats?.map(({ members }) => {
      const otherUser = getOtherMember(members, req.user._id);

      // console.log(otherUser);

      return {
        _id: otherUser._id,
        username: otherUser.username,
        avatar: otherUser.avatar.url,
      };
    });

    if (chatId) {
      const chat = await Chat.findById(chatId);

      const availableFriends = friends.filter(
        (friend) => !chat.members.includes(friend._id)
      );

      return res.status(200).json({
        success: true,
        friends: availableFriends,
      });
    } else {
      return res.status(200).json({
        success: true,
        friends,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUserLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.location = { lat, lng };
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Location updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyFriendsLocation = async (req, res) => {
  try {
      
    const user = await User.findById(req.user._id);
    const myChats = await Chat.find({
      groupChat: false,
      members: req.user._id,
    }).populate("members", "username avatar location");

    const friendsWithLocation = myChats?.map(({ members }) => {
      const otherUser = getOtherMember(members, req.user._id);
      return {
        _id: otherUser._id,
        username: otherUser.username,
        avatar: otherUser.avatar.url,
        lat:user.location.lat,
        lng: user.location.lng,
      };
    });

    return res.status(200).json({
      success: true,
      friendsWithLocation,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
