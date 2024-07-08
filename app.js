import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./db.js";
import session from "express-session";
import passport from "passport";
import { Strategy as OAuth2Strategy } from "passport-google-oauth20";
import { User } from "./models/user.js";
import bodyParser from "body-parser";
import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
// import { createUser } from "./fakeData/fakeusers.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import { getOtherMember, getSockets } from "./lib/helper.js";
import {
  CHAT_JOINED,
  CHAT_LEFT,
  FRIEND_LOCATION,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USER,
  START_TYPING,
  STOP_TYPING,
  UPDATE_LOCATION,
} from "./constants/event.js";
import { Message } from "./models/message.js";
import { v2 as cloudinary } from "cloudinary";
import { socketAuthenticator } from "./middlewares/auth.js";

const userSocketIDs = new Map();
const onlineUsers = new Set();

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://chat-app-frontend-pxia.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (error) => await socketAuthenticator(error, socket, next)
  );
});

io.on("connection", (socket) => {
  // console.log("a user connected", socket.id);

  try {
    const user = socket.user;
    // console.log(user);
    userSocketIDs.set(user?._id.toString(), socket.id);

    //console.log(userSocketIDs);

    socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
      const messageForRealTime = {
        content: message,
        _id: uuid(),
        sender: {
          _id: user._id,
          name: user.username,
        },
        chat: chatId,
        createdAt: new Date().toISOString(),
      };

      const messageForDB = {
        content: message,
        sender: user._id,
        chat: chatId,
      };

      // console.log("Emitting",messageForRealTime);

      const userSocket = getSockets(members);

      io.to(userSocket).emit(NEW_MESSAGE, {
        chatId,
        message: messageForRealTime,
      });

      io.to(userSocket).emit(NEW_MESSAGE_ALERT, { chatId });

      try {
        await Message.create(messageForDB);
      } catch (error) {
        console.log(error);
      }
    });

    socket.on(START_TYPING, ({ members, chatId }) => {
      // console.log("TYPING",chatId);
      const other = members.filter(
        (id) => id.toString() !== user._id.toString()
      );
      const memberSockets = getSockets(other);
      io.to(memberSockets).emit(START_TYPING, { chatId });
    });

    socket.on(STOP_TYPING, ({ members, chatId }) => {
      // console.log("TYPING",chatId);
      const other = members.filter(
        (id) => id.toString() !== user._id.toString()
      );
      const memberSockets = getSockets(other);
      io.to(memberSockets).emit(STOP_TYPING, { chatId });
    });

    socket.on(UPDATE_LOCATION, async (data) => {
      const userche = await User.findById(user?._id);
      if (!userche) return;
      userche.location.lat = data.lat;
      userche.location.lng = data.lng;
      await userche.save();

      //finding friends
      const myChats = await Chat.find({
        groupChat: false,
        members: userche?._id,
      }).populate("members");
      const friends = myChats?.map(({ members }) => {
        const otherUser = getOtherMember(members, userche?._id);
        // console.log(otherUser);
        return {
          _id: otherUser?._id,
          username: otherUser?.username,
          avatar: otherUser?.avatar.url,
          location: otherUser?.location,
        };
      });

      socket.broadcast.emit(FRIEND_LOCATION, {
          userId : userche?._id,
          username: userche?.username,
          location: userche?.location,
          avatar : userche?.avatar.url,
        }
      );
    });

    socket.on(CHAT_JOINED, ({ userId, members }) => {
      // console.log("chat joined", userId);
      onlineUsers.add(userId?.toString());
      const memberSocket = getSockets(members);
      io.to(memberSocket).emit(ONLINE_USER, Array.from(onlineUsers));
    });

    socket.on(CHAT_LEFT, ({ userId, members }) => {
      onlineUsers.delete(userId?.toString());
      const memberSocket = getSockets(members);
      io.to(memberSocket).emit(ONLINE_USER, Array.from(onlineUsers));
    });

    socket.on("disconnect", () => {
      // console.log("user disconnected", socket.id);
      userSocketIDs.delete(user?._id.toString());
      onlineUsers.delete(user?._id.toString());
      socket.broadcast.emit(ONLINE_USER, Array.from(onlineUsers));
    });
  } catch (error) {
    console.log(error);
  }
});

if (process.env.NODE_ENV !== "Production")
  dotenv.config({ path: "E:/MERN/ChatApp/server/config/config.env" });

app.use(
  cors({
    origin: [
      "https://chat-app-frontend-pxia.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


// Connect to the database
connectDB();

//cloudinary

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// createUser(10);

// session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Changed to false
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new OAuth2Strategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:4000/auth/google/callback",
      scope: ["profile", "email"],
      state: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      // console.log("profile", profile);
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
            image: profile.photos[0].value,
            googleLogin: true,
          });

          await user.save();
        } else if (user && user.googleLogin) {
          return done(null, user);
        }
      } catch (error) {
        console.log(error);
        // return json(error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// initialize google auth
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:5173/",
    failureRedirect: "http://localhost:5173/signin",
  })
);

app.get("/", (req, res) => {
  res.status(200).send("working...");
});

app.get("/login/success", async (req, res) => {
  // console.log("reqq",req.user);

  if (req.user) {
    res.status(200).json({ message: "user logged-In", user: req.user });
  } else {
    res.status(400).json({ message: "user not Authorizes" });
  }
});

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
  });
  res.redirect("http://localhost:5173/signin");
});

// using routes

import userRouter from "./routes/user.Routes.js";
import chatRouter from "./routes/chat.Routes.js";
import { Chat } from "./models/chat.js";

app.use("/user", userRouter);
app.use("/chat", chatRouter);

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

export { userSocketIDs };
