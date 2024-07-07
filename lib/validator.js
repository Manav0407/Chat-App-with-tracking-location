import { body, check, param, validationResult } from "express-validator";

export const registerValidator = () => [
  body("username", "Please Enter username.").notEmpty(),
  body("email", "Please Enter email.").notEmpty(),
  body("password", "Please Enter password.").notEmpty(),
];

export const loginValidator = () => [
  body("email", "Please Enter email.").notEmpty(),
  body("password", "Please Enter password.").notEmpty(),
];

export const chatValidator = () => [
  body("name", "Please Enter name.").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter members.")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be 2-100."),
];

export const addMembersValidator = () => [
  body("chatId", "Chat is not available.").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter members.")
    .isArray({ min: 1, max: 100 })
    .withMessage("Add atleast 1 member."),
];

export const removeMemberValidator = () => [
  body("chatId", "Chat is not available.").notEmpty(),
  body("userId", "Member is not available.").notEmpty(),
];

export const leaveGroupValidator = () => [
  param("id", "Group is not available.").notEmpty(),
];

export const attachmentsValidator = () => [
  body("chatId", "Chat is not available.").notEmpty(),
  
];


export const renameValidator = () => [
  param("chatId", "Chat is not available.").notEmpty(),
  body("newName", "Please Enter name.").notEmpty(),
];

export const sendRequestValidator = () => [
  body("userId", "User is not available.").notEmpty(),
]

export const acceptRequestValidator = () => [
  body("requestId", "User is not available.").notEmpty(),
  body("accept").notEmpty().withMessage("please add accept").isBoolean().withMessage("Must be boolean."),
]

export const validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(", ");

  console.log(errorMessages);

  if (errors.isEmpty()) {
    return next();
  } else {
    return res.status(400).json({
      message: errorMessages,
    });
  }
};
