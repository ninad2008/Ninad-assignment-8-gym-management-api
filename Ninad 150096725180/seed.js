/**
 * Database Seeder Script
 * Inserts sample members and fitness classes so you can immediately view and inspect them in MongoDB Compass.
 * Run using: node seed.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const FitnessClass = require('./models/FitnessClass');

const sampleUsers = [
  {
    username: 'alex_fitness',
    email: 'alex@gymfit.com',
    password: 'password123',
    membershipTier: 'Platinum',
    membershipStatus: 'active',
    membershipExpiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days ahead
    emergencyContact: '+1-555-0101'
  },
  {
    username: 'sarah_runner',
    email: 'sarah@gymfit.com',
    password: 'password123',
    membershipTier: 'Gold',
    membershipStatus: 'active',
    membershipExpiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days ahead
    emergencyContact: '+1-555-0102'
  },
  {
    username: 'david_power',
    email: 'david@gymfit.com',
    password: 'password123',
    membershipTier: 'Silver',
    membershipStatus: 'active',
    membershipExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days ahead
    emergencyContact: '+1-555-0103'
  },
  {
    username: 'emma_expired',
    email: 'emma@gymfit.com',
    password: 'password123',
    membershipTier: 'Bronze',
    membershipStatus: 'expired',
    membershipExpiryDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Expired 15 days ago
    emergencyContact: '+1-555-0104'
  }
];

async function seedDatabase() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gym_db';
    console.log(`Connecting to MongoDB at ${mongoURI}...`);
    await mongoose.connect(mongoURI);

    console.log('Clearing existing collections...');
    await User.deleteMany({});
    await FitnessClass.deleteMany({});

    console.log('Inserting sample users/members...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }

    console.log(`Inserted ${createdUsers.length} members.`);

    console.log('Inserting sample fitness classes...');
    const sampleClasses = [
      {
        title: 'High-Intensity Interval Training (HIIT)',
        trainerName: 'Marcus Vance',
        scheduleDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days later
        durationMinutes: 45,
        maxCapacity: 10,
        enrolledMembers: [createdUsers[0]._id, createdUsers[1]._id]
      },
      {
        title: 'Morning Vinyasa Yoga Flow',
        trainerName: 'Elena Rostova',
        scheduleDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days later
        durationMinutes: 60,
        maxCapacity: 15,
        enrolledMembers: [createdUsers[1]._id]
      },
      {
        title: 'Powerlifting & Strength Conditioning',
        trainerName: 'Marcus Vance',
        scheduleDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days later
        durationMinutes: 75,
        maxCapacity: 5,
        enrolledMembers: [createdUsers[0]._id, createdUsers[2]._id]
      },
      {
        title: 'Zumba Dance Cardio Party',
        trainerName: 'Sofia Mendes',
        scheduleDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days later
        durationMinutes: 60,
        maxCapacity: 20,
        enrolledMembers: []
      }
    ];

    await FitnessClass.insertMany(sampleClasses);
    console.log(`Inserted ${sampleClasses.length} fitness classes.`);

    console.log('\n=============================================================');
    console.log('🎉 Seed Completed Successfully!');
    console.log('You can now open MongoDB Compass, connect to:');
    console.log(`  Connection URI: ${mongoURI}`);
    console.log('  Database: gym_db');
    console.log('  Collections: "users" and "fitnessclasses"');
    console.log('=============================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during database seed:', error);
    process.exit(1);
  }
}

seedDatabase();
