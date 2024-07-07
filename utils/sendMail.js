import nodemailer from "nodemailer";

export const  sendMail = async(email,subject,text) =>{

    // console.log(process.env.HOST)
    try {
        const transporter = nodemailer.createTransport({
            host : "smtp.gmail.com",
            service : "gmail",
            port :587,
            secure :false,
            auth : {
                user : "dev.manav.47x@gmail.com",
                pass : "yjli wsbm vlpq fyuy",
            }
        });


        await transporter.sendMail({
            from : process.env.USER,
            to : email,
            subject : subject,
            text : text,
            // html : html,
        })
        console.log("Email sent successfully")
        
    } catch (error) {
        console.log("Email not sent")
        // console.log(error)
    }
}