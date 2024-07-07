import {
    ALERT,
    NEW_ATTACHMENT,
    NEW_MESSAGE,
    NEW_MESSAGE_ALERT,
    REFETCH_CHATS,
  } from "../constants/event.js";
  import { getOtherMember } from "../lib/helper.js";
  import { Chat } from "../models/chat.js";
  import { User } from "../models/user.js";
  import { Message } from "../models/message.js";
  
  import {
    deleteFileFromCloudinary,
    emitEvent,
    uploadFileFromCloudinary,
  } from "../utils/features.js";
  
  export const newGroupChat = async (req, res) => {
    try {
      const { name, members } = req.body;
  
      if (members.length < 2) {
        return res
          .status(400)
          .json({ message: "Group must have atleast 3 members" });
      }
      const allMembers = [...members, req.user._id];
  
      await Chat.create({
        name: name,
        groupChat: true,
        creator: req.user._id,
        members: allMembers,
      });
      emitEvent(req, ALERT, allMembers, `Welcome to ${name} group.`);
      emitEvent(req, REFETCH_CHATS, allMembers);
  
      res.status(200).json({ message: "Group Chat Created" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  export const myChats = async (req, res) => {
    try {
      const chats = await Chat.find({ members: req.user._id }).populate(
        "members"
      );
  
      const transformedChat = chats.map(({ _id, name, groupChat, members }) => {
        const otherMember = getOtherMember(members, req.user._id);
        // console.log(otherMember);
        return {
          _id,
          groupChat,
          avatar: groupChat
            ? members.slice(0, 3).map(({ avatar }) => avatar.url)
            : [otherMember.avatar.url],
          name: groupChat ? name : otherMember.username,
          members: members.reduce((prev, cur) => {
            if (cur._id.toString() !== req.user._id.toString()) {
              prev.push(cur._id);
            }
            return prev;
          }, []),
        };
      });
  
      return res.status(200).json({
        success: true,
        chats: transformedChat,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
  
  export const myGroups = async (req, res) => {
    try {
      const chats = await Chat.find({
        members: req.user._id,
        groupChat: true,
      }).populate("members");
  
      // console.log("grps",chats);
  
      const groups = chats.map(({ _id, members, name, groupChat }) => ({
        _id,
        name,
        groupChat,
        // members,
        avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
      }));
  
      return res.status(200).json({
        success: true,
        groups,
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  
  export const addMembers = async (req, res) => {
    try {
      const { chatId, members } = req.body;
  
      if (!members || members.length < 1) {
        return res.status(400).json({
          message: "Please add atleast one member",
        });
      }
  
      const chat = await Chat.findById(chatId);
  
      if (!chat) {
        return res.status(404).json({
          message: "Chat not found",
        });
      }
  
      if (!chat.groupChat) {
        return res.status(400).json({
          message: "This is not a group chat",
        });
      }
  
      if (chat.creator.toString() !== req.user._id.toString()) {
        return res.status(400).json({
          message: "You are not allowed to add members",
        });
      }
  
      const allMembersPromises = members.map((i) => User.findById(i, "username"));
  
      const allMembers = await Promise.all(allMembersPromises);
  
      const uniqueMembers = allMembers
        .filter((i) => !chat.members.includes(i._id.toString()))
        .map((i) => i._id);
  
      chat.members.push(...uniqueMembers);
  
      if (chat.members.length > 100) {
        return res.status(400).json({
          message: "You can't add more than 100 members",
        });
      }
  
      await chat.save();
  
      const allUserNames = allMembers.map((i) => i.username).join(",");
  
      emitEvent(
        req,
        ALERT,
        chat.members,
        {
          message: `${allUserNames} has been added to ${chat.name} group`,
          chatId,
        }
      );
  
      emitEvent(req, REFETCH_CHATS, chat.members);
  
      return res.status(200).json({
        message: "Members added successfully",
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  
  export const removeMembers = async (req, res) => {
    try {
      const { chatId, userId } = req.body;
  
      const [chat, userThatWillBeRemoved] = await Promise.all([
        Chat.findById(chatId),
        User.findById(userId, "username"),
      ]);
  
      if (!chat) {
        return res.status(404).json({
          message: "Chat not found",
        });
      }
  
      if (!chat.groupChat) {
        return res.status(400).json({
          message: "This is not a group chat",
        });
      }
  
      if (chat.creator.toString() !== req.user._id.toString()) {
        return res.status(400).json({
          message: "You are not allowed to remove members",
        });
      }
  
      if (chat.members.length <= 3) {
        return res.status(400).json({
          message: "Group must have atleast 3 members",
        });
      }
  
      const allMembers = chat.members.map((member) => member.toString());
      // console.log(allMembers)
  
      chat.members = chat.members.filter(
        (member) => member.toString() !== userId.toString()
      );
  
      await chat.save();
  
      emitEvent(req, ALERT, chat.members, {
        message: `${userThatWillBeRemoved.username} has been removed from ${chat.name} group`,
        chatId,
      });
  
      emitEvent(req, REFETCH_CHATS, allMembers);
  
      return res.status(200).json({
        message: "Members removed successfully",
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  
  export const leaveGroup = async (req, res) => {
    try {
      const chatId = req.params.id;
  
      const chat = await Chat.findById(chatId);
  
      if (!chat) {
        return res.status(404).json({
          message: "Chat not found",
        });
      }
  
      if (!chat.groupChat) {
        return res.status(400).json({
          message: "This is not a group chat",
        });
      }
  
      if (!chat.members.includes(req.user._id)) {
        return res.status(400).json({
          message: "You are not a member of this group",
        });
      }
  
      const remainingMembers = chat.members.filter(
        (member) => member.toString() !== req.user._id.toString()
      );
  
      if (remainingMembers.length < 3) {
        return res.status(400).json({
          message: "Group must have atleast 3 members",
        });
      }
  
      if (chat.creator.toString() === req.user._id.toString()) {
        const random = Math.floor(Math.random() * remainingMembers.length);
  
        const newCreator = remainingMembers[random];
  
        chat.creator = newCreator;
      }
  
      chat.members = remainingMembers;
  
      await chat.save();
  
      return res.status(200).json({
        message: "Group left successfully",
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  
  //check validation
  export const sendAttachment = async (req, res) => {
    try {
      // console.log(req.user);
  
      const { chatId, type } = req.body;
  
      // console.log(type);
  
      const chat = await Chat.findById(chatId);
  
      if (!chat) {
        return res.status(404).json({
          message: "Chat not found",
        });
      }
  
      const files = req.files || [];
  
      // console.log(files);
  
      if (files.length < 1) {
        return res.status(400).json({
          message: "Please upload atleast one file",
        });
      }
      if (files.length > 5) {
        return res.status(400).json({
          message: "You can't upload more than 5 files",
        });
      }
  
      const attachments = await uploadFileFromCloudinary(files);
      const messageForRealTime = {
        content: "",
        attachments,
        sender: {
          _id: req.user._id,
          name: req.user.username,
          // avatar: req.user.avatar.url,
        },
        chat: chatId,
        attachment_type: type,
      };
  
      // console.log(attachments)
  
      const messageForDB = {
        content: "",
        attachments,
        sender: req.user._id,
        chat: chatId,
        attachment_type: type,
      };
  
      const message = await Message.create(messageForDB);
  
      emitEvent(req, NEW_MESSAGE, chat.members, {
        message: messageForRealTime,
        chatId,
      });
  
      emitEvent(req, NEW_MESSAGE_ALERT, chat.members, {
        chatId,
      });
  
      res.status(200).json({
        success: true,
        message,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
  
  export const getChatDetails = async (req, res) => {
    try {
      // console.log(req.query)
      if (req.query.populate === "true") {
        const chat = await Chat.findById(req.params.id)
          .populate("members", "username avatar")
          .lean();
  
        // console.log("chat",chat);
  
        //lean means it is only a javascript object now.
  
        if (!chat) {
          return res.status(404).json({
            message: "Chat not found",
          });
        }
  
        chat.members = chat.members.map(({ _id, username, avatar }) => ({
          _id,
          username,
          avatar: avatar.url,
        }));
  
        // await chat.save(); we don't want to save changes in database
  
        return res.status(200).json({
          success: true,
          chat,
        });
      } else {
        const chat = await Chat.findById(req.params.id);
  
        if (!chat) {
          return res.status(404).json({
            message: "Chat not found",
          });
        }
  
        return res.status(200).json({
          success: true,
          chat,
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  
  export const renameGroup = async (req, res) => {
    try {
      const chat = await Chat.findById(req.params.id);
  
      const { newName } = req.body;
  
      if (!chat) {
        return res.status(404).json({
          message: "Chat not found",
        });
      }
  
      if (!chat.groupChat) {
        return res.status(400).json({
          message: "This is not a group chat",
        });
      }
  
      if (chat.creator.toString() !== req.user._id.toString()) {
        return res.status(400).json({
          message: "You are not allowed to rename this group",
        });
      }
  
      chat.name = newName;
  
      await chat.save();
  
      emitEvent(req, ALERT, chat.members, {
        message: `${chat.name} has been renamed to ${newName}`,
        chatId: chat._id,
      });
  
      emitEvent(req, REFETCH_CHATS, chat.members);
  
      return res.status(200).json({
        success: true,
        message: "Group successfully renamed",
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  
  export const deleteChat = async (req, res) => {
    try {
      const chat = await Chat.findById(req.params.id);
  
      if (!chat) {
        return res.status(404).json({
          message: "Chat not found",
        });
      }
  
      const members = chat.members.map((member) => member.toString());
  
      if (chat.groupChat && chat.creator.toString() !== req.user._id.toString()) {
        return res.status(400).json({
          message: "You are not allowed to delete this group",
        });
      }
      if (!chat.groupChat && !chat.members.includes(req.user._id.toString())) {
        return res.status(400).json({
          message: "You are not a member of this chat",
        });
      }
  
      const type = chat.groupChat ? "Group" : "Chat";
  
      const messagesWithAttachments = await Message.find({
        chat: req.params.id,
        attachments: { $exists: true, $ne: [] },
      });
  
      const public_ids = [];
  
      messagesWithAttachments.forEach((message) => {
        message.attachments.forEach((attachment) => {
          public_ids.push(attachment.public_id);
        });
      });
  
      await Promise.all([
        deleteFileFromCloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({ chat: req.params.id }),
      ]);
  
      emitEvent(req, REFETCH_CHATS, members);
  
      return res.status(200).json({
        success: true,
        message: `${type} successfully deleted `,
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  
  export const getMessage = async (req, res) => {
    try {
      const chatId = req.params.id;
  
      const { page = 1 } = req.query;
  
      const resultPerPage = 20;
      const skip = (page - 1) * resultPerPage;
  
      const chat = await Chat.findById(chatId);
  
      if (!chat) {
        return res.status(404).json({
          message: "Chat not found",
        });
      }
  
      if (!chat.members.includes(req.user._id)) {
        return res.status(403).json({
          message: "You are not a member of this chat",
        }); // Forbidden access. User not a member of the chat.
      }
  
      const [messages, totalMessagesCount] = await Promise.all([
        Message.find({ chat: chatId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(resultPerPage)
          .populate("sender", "username")
          .lean(),
        Message.countDocuments({ chat: chatId }),
      ]);
  
      const totalPages = Math.ceil(totalMessagesCount / resultPerPage) || 0;
  
      return res.status(200).json({
        success: true,
        messages: messages.reverse(),
        totalPages,
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  