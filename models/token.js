import mongoose from "mongoose";
import { Schema } from "mongoose";
import { User } from "./user.js";

const tokenSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        required : true,
        ref : User,
        unique : true,
    },
    token : {
        type : String,
        required : true,
    },
    createdAt : {
        type : Date,
        default : Date.now(),
        expires : new Date(Date.now() + 3600000),
    }
})

export const Token = mongoose.model("Token",tokenSchema);