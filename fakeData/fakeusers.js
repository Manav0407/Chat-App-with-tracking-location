import { User } from "../models/user.js";
import { faker } from '@faker-js/faker';

const createUser = async (numsUser) => {
  try {
    const userPromise = [];

    for (let i = 0; i < numsUser; i++) {

        const temp = User.create({
            googleId : faker.lorem.sentence(10),
            username : faker.person.fullName(),
            email : faker.internet.email(),
            password : "123456",
            varified : true,
            avatar :{
                url : faker.image.avatar(),
                public_id : faker.system.fileName()
            }

        });
        userPromise.push(temp);
        console.log("user created",numsUser);
      }
      await Promise.all(userPromise);
      process.exit(1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export {createUser};
