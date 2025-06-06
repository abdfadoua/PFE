const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const UserModel = {
  findByEmail: async (email) => {
    return await prisma.user.findUnique({
      where: { email },
    });
  },

  createUser: async (email, password, name, phone) => { // Ajouter phone
    const hashedPassword = await bcrypt.hash(password, 10);
    return await prisma.user.create({
      data: { email, password: hashedPassword, name, phone }, // Ajouter phone
    });
  },
};

module.exports = UserModel;  