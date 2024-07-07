import { faker } from '@faker-js/faker';
import { Chat } from '../models/chat';
import { User } from '../models/user';

const createSingleChats = async(numsChat)=>{
    try {
        const user  = await User.find().select('_id');

        const chatPromise = []

        for (let i = 0; i < numsChat; i++) {
            const chat = await Chat.create({
                name: faker.person.firstName(),
                members: [user[i]._id,user[i+1]._id],
                groupChat: false,
                creator: user[i]._id
            })
            chatPromise.push(chat)
        }
        await Promise.all(chatPromise)
        console.log('chats created');
        process.exit()
    } catch (error) {
        
    }
}