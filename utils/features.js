import {v2 as cloudinary} from "cloudinary"
import {v4 as uuid} from "uuid";
import { getBase64, getSockets } from "../lib/helper.js";



export const emitEvent = (req,event,users,data)=>{

    const io = req.app.get('io');
    const userSocket = getSockets(users);
    io.to(userSocket).emit(event,data);
    // console.log("Emmiting event",event);
}

export const uploadFileFromCloudinary = async(files=[])=>{

    const uploadPromise = files.map((file)=>{
        return new Promise((resolve,reject)=>{
            cloudinary.uploader.upload(getBase64(file),{
                resource_type: "auto",
                public_id: uuid(),
            }, (error,result) => {
                if(error){
                    reject(error);
                }
                resolve(result);
            });
        })
    }
);

try {
    
    const results = await Promise.all(uploadPromise);

    // console.log("res",results);

    const formatedResult = results.map((result)=>({
        public_id: result.public_id,
        url: result.url,
    }));


    return formatedResult;
} catch (error) {

    console.log(error); 
    throw new Error("Error uploading file to cloudinary: ",error);
    
}

};


// const getBase64 = (file) => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.readAsDataURL(file);
//       reader.onload = () => resolve(reader.result);
//       reader.onerror = (error) => reject(error);
//     });
//   };
  
//   export const uploadFileFromCloudinary = async (files = []) => {
//     const uploadPromise = files.map((file) => {
//       return new Promise(async (resolve, reject) => {
//         try {
//           const base64File = await getBase64(file);
//           cloudinary.uploader.upload(base64File, {
//             resource_type: "auto",
//             public_id: uuidv4(),
//           }, (error, result) => {
//             if (error) {
//               reject(error);
//             } else {
//               resolve(result);
//             }
//           });
//         } catch (error) {
//           reject(error);
//         }
//       });
//     });
  
//     try {
//       const results = await Promise.all(uploadPromise);
  
//       const formattedResult = results.map((result) => ({
//         public_id: result.public_id,
//         url: result.secure_url,
//       }));
  
//       return formattedResult;
//     } catch (error) {
//       throw new Error(`Error uploading file to cloudinary: ${error.message}`);
//     }
//   };

export const deleteFileFromCloudinary = ()=>{
    console.log("Deleting file from cloudinary");
}