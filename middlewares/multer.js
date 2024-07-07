import multer from "multer";

export const multerUpload = multer({
    limits:{
        fileSize:1024*1024*100,
    }
})

const Avatar = multerUpload.single("avatar");

const attachmentsMulter = multerUpload.array("files",5);


export { Avatar,attachmentsMulter};