import mongoose from "mongoose";

const userSchemaGoogle = new mongoose.Schema({

    googleId : String,
    displayName : String,
    email : {
        type : String,
        required : true,
        unique : true,
    },
    image:String,

})

export const UserGoogle = mongoose.model("UserGoogle",userSchemaGoogle);

