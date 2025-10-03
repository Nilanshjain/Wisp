import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import Group from '../models/group.model.js';
import GroupMember from '../models/groupMember.model.js';
import ChatInvite from '../models/chatInvite.model.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wispcloud';

// Seed users data
const seedUsersData = [
    {
        email: 'alice@test.com',
        fullName: 'Alice Johnson',
        username: 'alice',
        password: 'password123',
        profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    },
    {
        email: 'bob@test.com',
        fullName: 'Bob Smith',
        username: 'bob',
        password: 'password123',
        profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    },
    {
        email: 'carol@test.com',
        fullName: 'Carol Williams',
        username: 'carol',
        password: 'password123',
        profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
    },
    {
        email: 'david@test.com',
        fullName: 'David Brown',
        username: 'david',
        password: 'password123',
        profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
    },
    {
        email: 'eve@test.com',
        fullName: 'Eve Davis',
        username: 'eve',
        password: 'password123',
        profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eve',
    },
];

async function seedDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Message.deleteMany({});
        await Group.deleteMany({});
        await GroupMember.deleteMany({});
        await ChatInvite.deleteMany({});
        console.log('✅ Cleared all existing data');

        // Create users
        console.log('👥 Creating seed users...');
        const createdUsers = [];

        for (const userData of seedUsersData) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            const user = await User.create({
                ...userData,
                password: hashedPassword,
            });

            createdUsers.push(user);
            console.log(`✅ Created user: ${user.username} (${user.email})`);
        }

        // Create chat invites (connections between users)
        console.log('\n💌 Creating chat invites and connections...');

        // Alice -> Bob (accepted)
        await ChatInvite.create({
            senderId: createdUsers[0]._id,
            receiverId: createdUsers[1]._id,
            status: 'accepted',
        });
        console.log('✅ Alice ↔ Bob connected');

        // Alice -> Carol (accepted)
        await ChatInvite.create({
            senderId: createdUsers[0]._id,
            receiverId: createdUsers[2]._id,
            status: 'accepted',
        });
        console.log('✅ Alice ↔ Carol connected');

        // Bob -> David (accepted)
        await ChatInvite.create({
            senderId: createdUsers[1]._id,
            receiverId: createdUsers[3]._id,
            status: 'accepted',
        });
        console.log('✅ Bob ↔ David connected');

        // Carol -> Eve (accepted)
        await ChatInvite.create({
            senderId: createdUsers[2]._id,
            receiverId: createdUsers[4]._id,
            status: 'accepted',
        });
        console.log('✅ Carol ↔ Eve connected');

        // David -> Alice (accepted)
        await ChatInvite.create({
            senderId: createdUsers[3]._id,
            receiverId: createdUsers[0]._id,
            status: 'accepted',
        });
        console.log('✅ David ↔ Alice connected');

        // Eve -> Bob (pending)
        await ChatInvite.create({
            senderId: createdUsers[4]._id,
            receiverId: createdUsers[1]._id,
            status: 'pending',
        });
        console.log('✅ Eve → Bob (pending invite)');

        // Create a test group
        console.log('\n👥 Creating test groups...');

        const group1 = await Group.create({
            name: 'Team Alpha',
            description: 'Main project team',
            createdBy: createdUsers[0]._id,
            type: 'private',
            maxMembers: 100,
            settings: {
                whoCanMessage: 'all',
                whoCanAddMembers: 'admins_only',
                whoCanEditGroup: 'admins_only',
            },
            stats: {
                totalMembers: 3,
                totalMessages: 0,
            },
        });

        // Add members to group
        await GroupMember.create({
            groupId: group1._id,
            userId: createdUsers[0]._id, // Alice (owner)
            role: 'owner',
            status: 'active',
            permissions: {
                canSendMessages: true,
                canAddMembers: true,
                canRemoveMembers: true,
                canEditGroup: true,
            },
        });

        await GroupMember.create({
            groupId: group1._id,
            userId: createdUsers[1]._id, // Bob (admin)
            role: 'admin',
            status: 'active',
            permissions: {
                canSendMessages: true,
                canAddMembers: true,
                canRemoveMembers: true,
                canEditGroup: true,
            },
        });

        await GroupMember.create({
            groupId: group1._id,
            userId: createdUsers[2]._id, // Carol (member)
            role: 'member',
            status: 'active',
            permissions: {
                canSendMessages: true,
                canAddMembers: false,
                canRemoveMembers: false,
                canEditGroup: false,
            },
        });

        console.log(`✅ Created group: ${group1.name} with 3 members`);

        // Create some sample messages
        console.log('\n💬 Creating sample messages...');

        // Message from Alice to Bob
        await Message.create({
            senderId: createdUsers[0]._id,
            receiverId: createdUsers[1]._id,
            text: 'Hey Bob! How are you doing?',
            isGroupMessage: false,
            status: 'delivered',
        });

        // Message from Bob to Alice
        await Message.create({
            senderId: createdUsers[1]._id,
            receiverId: createdUsers[0]._id,
            text: "I'm doing great, thanks! How about you?",
            isGroupMessage: false,
            status: 'read',
            readAt: new Date(),
        });

        // Group message from Alice
        await Message.create({
            senderId: createdUsers[0]._id,
            receiverId: group1._id,
            text: 'Welcome to Team Alpha everyone!',
            isGroupMessage: true,
        });

        // Group message from Bob
        await Message.create({
            senderId: createdUsers[1]._id,
            receiverId: group1._id,
            text: 'Thanks Alice! Excited to be here!',
            isGroupMessage: true,
        });

        console.log('✅ Created sample messages');

        console.log('\n🎉 Seed completed successfully!');
        console.log('\n📋 Test User Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        seedUsersData.forEach((user) => {
            console.log(`📧 ${user.email}`);
            console.log(`👤 Username: ${user.username}`);
            console.log(`🔑 Password: ${user.password}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        });

        console.log('\n✨ You can now login with any of these accounts!');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

// Run the seed function
seedDatabase();
