import express from "express";
import {
  addMembers,
  deleteChat,
  getChatDetails,
  getMessage,
  leaveGroup,
  myChats,
  myGroups,
  newGroupChat,
  removeMembers,
  renameGroup,
  sendAttachment,
} from "../controllers/chat.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import { addMembersValidator, attachmentsValidator, chatValidator, leaveGroupValidator, removeMemberValidator, renameValidator, validateHandler } from "../lib/validator.js";

const router = express.Router();

router.post("/new",chatValidator(),validateHandler, isAuthenticated, newGroupChat);
router.get("/my/chats", isAuthenticated, myChats);
router.get("/my/groups", isAuthenticated, myGroups);
router.put("/add/members",addMembersValidator(),validateHandler, isAuthenticated, addMembers);
router.put("/remove/members",removeMemberValidator(),validateHandler, isAuthenticated, removeMembers);
router.delete("/leave/:id",leaveGroupValidator(),validateHandler, isAuthenticated, leaveGroup);
router.post("/message", isAuthenticated, attachmentsMulter, sendAttachment);
router.get("/message/:id", isAuthenticated,getMessage);


router
  .route("/:id")
  .get( isAuthenticated, getChatDetails)
  .put(isAuthenticated, renameGroup)
  .delete(isAuthenticated, deleteChat);

export default router;
