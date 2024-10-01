import  mongoose, { Schema }  from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({

    googleId: {
        type: String,
        unique: true,
        sparse: true,
      },
      username: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
      },
      image:String,
      password: {
        type: String,
        select:false
      },
      verified:{
        type : Boolean,
        default : false,
      },
      avatar : {
        public_id:{
            type : String,
        },
        url:{
            type : String,
        }
    },
    googleLogin:{
      type : Boolean,
      default : false,
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    
    
},{
    timestamps : true,
})

userSchema.pre("save",async function(){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password,10);
    }
})

export const User = mongoose.model("User",userSchema);